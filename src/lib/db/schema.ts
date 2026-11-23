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

export const attachmentKindEnum = pgEnum("attachment_kind", ["payslip", "transfer_proof", "other"]);

export const sendLogEventEnum = pgEnum("send_log_event", ["attempt", "sent", "failed"]);

// 1. Batches Table
export const batches = pgTable(
  "batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("batches_created_at_idx").on(table.createdAt)]
);

// 2. Recipients Table
export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
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
    index("recipients_status_idx").on(table.status),
    index("recipients_created_at_idx").on(table.createdAt),
  ]
);

// 3. Attachments Table
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

// 4. Send Logs Table
export const sendLogs = pgTable(
  "send_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => recipients.id, { onDelete: "cascade" }),
    event: sendLogEventEnum("event").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("send_logs_recipient_id_idx").on(table.recipientId),
    index("send_logs_event_created_at_idx").on(table.event, table.createdAt),
  ]
);

// Relations
export const batchesRelations = relations(batches, ({ many }) => ({
  recipients: many(recipients),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  batch: one(batches, {
    fields: [recipients.batchId],
    references: [batches.id],
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
  recipient: one(recipients, {
    fields: [sendLogs.recipientId],
    references: [recipients.id],
  }),
}));

// Types
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
