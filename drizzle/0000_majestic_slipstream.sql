CREATE TYPE "public"."attachment_kind" AS ENUM('payslip', 'transfer_proof', 'other');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."send_log_event" AS ENUM('attempt', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"kind" "attachment_kind" DEFAULT 'payslip' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "recipient_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "send_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"event" "send_log_event" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_logs" ADD CONSTRAINT "send_logs_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_recipient_id_idx" ON "attachments" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "batches_created_at_idx" ON "batches" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recipients_batch_email_unique_idx" ON "recipients" USING btree ("batch_id","email");--> statement-breakpoint
CREATE INDEX "recipients_batch_id_idx" ON "recipients" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "recipients_status_idx" ON "recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recipients_created_at_idx" ON "recipients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "send_logs_recipient_id_idx" ON "send_logs" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "send_logs_event_created_at_idx" ON "send_logs" USING btree ("event","created_at");