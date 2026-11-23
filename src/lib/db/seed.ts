import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

export const dummySeedData = {
  batch: {
    name: "Periode 1-7 Desember 2026",
  },
  recipients: [
    {
      name: "Budi Santoso",
      email: "budi.santoso@example.com",
      status: "sent" as const,
      sentAt: new Date("2026-12-07T10:00:00Z"),
      attachment: {
        filename: "slip_gaji_budi_santoso.pdf",
        blobUrl: "https://example.blob.vercel-storage.com/slips/slip_gaji_budi.pdf",
        blobPathname: "slips/slip_gaji_budi.pdf",
        contentType: "application/pdf",
        sizeBytes: 154200,
        kind: "payslip" as const,
      },
      log: {
        event: "sent" as const,
        detail: "Email slip gaji berhasil dikirim ke budi.santoso@example.com",
      },
    },
    {
      name: "Siti Rahma",
      email: "siti.rahma@example.com",
      status: "pending" as const,
      sentAt: null,
      attachment: {
        filename: "slip_gaji_siti_rahma.pdf",
        blobUrl: "https://example.blob.vercel-storage.com/slips/slip_gaji_siti.pdf",
        blobPathname: "slips/slip_gaji_siti.pdf",
        contentType: "application/pdf",
        sizeBytes: 142100,
        kind: "payslip" as const,
      },
      log: null,
    },
    {
      name: "Dewi Lestari",
      email: "dewi.lestari@example.com",
      status: "failed" as const,
      errorMessage: "Mailbox quota exceeded (552 5.2.2)",
      sentAt: null,
      attachment: {
        filename: "slip_gaji_dewi_lestari.pdf",
        blobUrl: "https://example.blob.vercel-storage.com/slips/slip_gaji_dewi.pdf",
        blobPathname: "slips/slip_gaji_dewi.pdf",
        contentType: "application/pdf",
        sizeBytes: 168900,
        kind: "payslip" as const,
      },
      log: {
        event: "failed" as const,
        detail: "Gagal mengirim: Mailbox quota exceeded (552 5.2.2)",
      },
    },
  ],
};

async function runSeed() {
  const url = process.env.DATABASE_URL;

  console.log("🌱 Menjalankan skrip seed data...");

  if (!url || url.includes("ep-sample-pooler")) {
    console.log(
      "ℹ️  DATABASE_URL masih berupa placeholder. Menjalankan verifikasi struktur data seed palsu..."
    );
    console.log(`   - Batch data: "${dummySeedData.batch.name}"`);
    console.log(`   - ${dummySeedData.recipients.length} penerima contoh (@example.com):`);
    for (const r of dummySeedData.recipients) {
      console.log(`     • ${r.name} <${r.email}> [${r.status}]`);
    }
    console.log(
      "✅ Data seed valid! Saat DATABASE_URL Neon live diset, data akan otomatis dimasukkan ke Postgres."
    );
    return;
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log(`Inserting batch: "${dummySeedData.batch.name}"`);
  const [newBatch] = await db
    .insert(schema.batches)
    .values({
      name: dummySeedData.batch.name,
    })
    .returning();

  for (const item of dummySeedData.recipients) {
    const [recipient] = await db
      .insert(schema.recipients)
      .values({
        batchId: newBatch.id,
        name: item.name,
        email: item.email,
        status: item.status,
        errorMessage: item.errorMessage || null,
        sentAt: item.sentAt,
      })
      .returning();

    if (item.attachment) {
      await db.insert(schema.attachments).values({
        recipientId: recipient.id,
        filename: item.attachment.filename,
        blobUrl: item.attachment.blobUrl,
        blobPathname: item.attachment.blobPathname,
        contentType: item.attachment.contentType,
        sizeBytes: item.attachment.sizeBytes,
        kind: item.attachment.kind,
      });
    }

    if (item.log) {
      await db.insert(schema.sendLogs).values({
        recipientId: recipient.id,
        event: item.log.event,
        detail: item.log.detail,
      });
    }
  }

  console.log("✅ Seed database Neon berhasil diselesaikan!");
}

// Only execute if invoked directly via CLI (e.g. tsx src/lib/db/seed.ts)
if (
  process.argv[1] &&
  (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))
) {
  runSeed().catch((err) => {
    console.error("❌ Gagal menjalankan seed:", err);
    process.exit(1);
  });
}
