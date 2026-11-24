import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "./schema";
import { normalizeEmail } from "../utils";

dotenv.config({ path: ".env.local" });
dotenv.config();

export const dummySeedData = {
  user: {
    name: "Pengguna Contoh",
    email: "user.demo@example.com",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser",
  },
  contacts: [
    { name: "Budi Santoso", email: "budi.santoso@example.com" },
    { name: "Siti Rahma", email: "siti.rahma@example.com" },
    { name: "Dewi Lestari", email: "dewi.lestari@example.com" },
    { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com" },
    { name: "Rian Pratama", email: "rian.pratama@example.com" },
  ],
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

  console.log("🌱 Menjalankan skrip seed data (Multi-User v2)...");

  if (!url || url.includes("ep-sample-pooler")) {
    console.log(
      "ℹ️  DATABASE_URL masih berupa placeholder. Menjalankan verifikasi struktur data seed palsu..."
    );
    console.log(`   - Pengguna contoh: ${dummySeedData.user.name} <${dummySeedData.user.email}>`);
    console.log(`   - ${dummySeedData.contacts.length} kontak contoh (@example.com):`);
    for (const c of dummySeedData.contacts) {
      console.log(`     • ${c.name} <${c.email}>`);
    }
    console.log(`   - Batch contoh: "${dummySeedData.batch.name}"`);
    console.log(`   - ${dummySeedData.recipients.length} penerima contoh:`);
    for (const r of dummySeedData.recipients) {
      console.log(`     • ${r.name} <${r.email}> [${r.status}]`);
    }
    console.log(
      "✅ Data seed v2 valid! Saat DATABASE_URL Neon live diset, data akan otomatis dimasukkan ke Postgres."
    );
    return;
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  // 1. Upsert User
  console.log(`👤 Menyimpan pengguna contoh: ${dummySeedData.user.email}`);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: dummySeedData.user.name,
      email: normalizeEmail(dummySeedData.user.email),
      image: dummySeedData.user.image,
    })
    .onConflictDoUpdate({
      target: [schema.users.email],
      set: {
        name: dummySeedData.user.name,
        image: dummySeedData.user.image,
      },
    })
    .returning();

  // 2. Insert Contacts
  console.log(`📇 Menyimpan ${dummySeedData.contacts.length} kontak contoh...`);
  const contactMap = new Map<string, string>();
  for (const c of dummySeedData.contacts) {
    const [contact] = await db
      .insert(schema.contacts)
      .values({
        userId: user.id,
        name: c.name,
        email: normalizeEmail(c.email),
      })
      .onConflictDoUpdate({
        target: [schema.contacts.userId, schema.contacts.email],
        set: { name: c.name },
      })
      .returning();
    contactMap.set(contact.email, contact.id);
  }

  // 3. Insert Batch
  console.log(`📦 Menyimpan batch: "${dummySeedData.batch.name}"`);
  const [newBatch] = await db
    .insert(schema.batches)
    .values({
      userId: user.id,
      name: dummySeedData.batch.name,
    })
    .returning();

  // 4. Insert Recipients & Attachments & Send Logs
  for (const item of dummySeedData.recipients) {
    const normalizedEmail = normalizeEmail(item.email);
    const matchedContactId = contactMap.get(normalizedEmail) || null;

    const [recipient] = await db
      .insert(schema.recipients)
      .values({
        batchId: newBatch.id,
        contactId: matchedContactId,
        name: item.name,
        email: normalizedEmail,
        status: item.status,
        errorMessage: item.errorMessage,
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
        userId: user.id,
        recipientId: recipient.id,
        event: item.log.event,
        detail: item.log.detail,
      });
    }
  }

  console.log("✅ Seed database selesai dengan sukses!");
}

runSeed().catch((err) => {
  console.error("❌ Gagal menjalankan seed:", err);
  process.exit(1);
});
