CREATE TYPE "public"."gmail_connection_status" AS ENUM('connected', 'revoked');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gmail_email" varchar(255) NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"scope" varchar(255) NOT NULL,
	"status" "gmail_connection_status" DEFAULT 'connected' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
TRUNCATE "send_logs", "attachments", "recipients", "batches" CASCADE;
--> statement-breakpoint
DROP INDEX "send_logs_event_created_at_idx";--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "send_logs" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_user_email_unique_idx" ON "contacts" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_user_archived_idx" ON "contacts" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gmail_connections_user_id_unique_idx" ON "gmail_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gmail_connections_user_id_idx" ON "gmail_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batches_user_id_idx" ON "batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "batches_user_created_at_idx" ON "batches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "recipients_contact_id_idx" ON "recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "send_logs_user_id_idx" ON "send_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "send_logs_user_created_at_idx" ON "send_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "send_logs_user_event_created_at_idx" ON "send_logs" USING btree ("user_id","event","created_at");