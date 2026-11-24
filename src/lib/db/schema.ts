import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const recipientStatusEnum = pgEnum("recipient_status", [
  "pending",
  "sending",
  "sent",
  "failed",
  "unknown",
]);

export const attachmentKindEnum = pgEnum("attachment_kind", [
  "payslip",
  "transfer_proof",
  "other",
]);

export const sendLogEventEnum = pgEnum("send_log_event", ["attempt", "sent", "failed"]);

export const gmailConnectionStatusEnum = pgEnum("gmail_connection_status", [
  "connected",
  "revoked",
]);

// 1. Users Table (Google OAuth Multi-User)
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(table.email),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

// 2. Gmail Connections Table (Per-User Incremental Authorization)
export const gmailConnections = pgTable(
  "gmail_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gmailEmail: varchar("gmail_email", { length: 255 }).notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    scope: varchar("scope", { length: 255 }).notNull(),
    status: gmailConnectionStatusEnum("status").default("connected").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("gmail_connections_user_id_unique_idx").on(table.userId),
    index("gmail_connections_user_id_idx").on(table.userId),
  ]
);

// 3. Contacts Table (User Address Book)
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("contacts_user_email_unique_idx").on(table.userId, table.email),
    index("contacts_user_id_idx").on(table.userId),
    index("contacts_user_archived_idx").on(table.userId, table.archivedAt),
  ]
);

// 4. Batches Table
export const batches = pgTable(
  "batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("batches_user_id_idx").on(table.userId),
    index("batches_created_at_idx").on(table.createdAt),
    index("batches_user_created_at_idx").on(table.userId, table.createdAt),
  ]
);

// 5. Recipients Table
export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    status: recipientStatusEnum("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("recipients_batch_email_unique_idx").on(table.batchId, table.email),
    index("recipients_batch_id_idx").on(table.batchId),
    index("recipients_contact_id_idx").on(table.contactId),
    index("recipients_status_idx").on(table.status),
    index("recipients_created_at_idx").on(table.createdAt),
  ]
);

// 6. Attachments Table
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => recipients.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    kind: attachmentKindEnum("kind").default("payslip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("attachments_recipient_id_idx").on(table.recipientId)]
);

// 7. Send Logs Table
export const sendLogs = pgTable(
  "send_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => recipients.id, { onDelete: "cascade" }),
    event: sendLogEventEnum("event").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("send_logs_user_id_idx").on(table.userId),
    index("send_logs_recipient_id_idx").on(table.recipientId),
    index("send_logs_user_created_at_idx").on(table.userId, table.createdAt),
    index("send_logs_user_event_created_at_idx").on(table.userId, table.event, table.createdAt),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  batches: many(batches),
  contacts: many(contacts),
  gmailConnection: one(gmailConnections, {
    fields: [users.id],
    references: [gmailConnections.userId],
  }),
  sendLogs: many(sendLogs),
}));

export const gmailConnectionsRelations = relations(gmailConnections, ({ one }) => ({
  user: one(users, {
    fields: [gmailConnections.userId],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  recipients: many(recipients),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  user: one(users, {
    fields: [batches.userId],
    references: [users.id],
  }),
  recipients: many(recipients),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  batch: one(batches, {
    fields: [recipients.batchId],
    references: [batches.id],
  }),
  contact: one(contacts, {
    fields: [recipients.contactId],
    references: [contacts.id],
  }),
  attachments: many(attachments),
  sendLogs: many(sendLogs),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  recipient: one(recipients, {
    fields: [attachments.recipientId],
    references: [recipients.id],
  }),
}));

export const sendLogsRelations = relations(sendLogs, ({ one }) => ({
  user: one(users, {
    fields: [sendLogs.userId],
    references: [users.id],
  }),
  recipient: one(recipients, {
    fields: [sendLogs.recipientId],
    references: [recipients.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type GmailConnection = typeof gmailConnections.$inferSelect;
export type NewGmailConnection = typeof gmailConnections.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;

export type Recipient = typeof recipients.$inferSelect;
export type NewRecipient = typeof recipients.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type SendLog = typeof sendLogs.$inferSelect;
export type NewSendLog = typeof sendLogs.$inferInsert;

export type RecipientStatus = (typeof recipientStatusEnum.enumValues)[number];
export type AttachmentKind = (typeof attachmentKindEnum.enumValues)[number];
export type SendLogEvent = (typeof sendLogEventEnum.enumValues)[number];
export type GmailConnectionStatus = (typeof gmailConnectionStatusEnum.enumValues)[number];
