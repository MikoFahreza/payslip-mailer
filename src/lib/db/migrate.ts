import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function runMigration() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    console.log(
      "⚠️  DATABASE_URL belum dikonfigurasi ke Neon Postgres yang aktif. Migrasi dilewati."
    );
    return;
  }

  console.log("🚀 Menjalankan migrasi database...");
  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrasi database berhasil diterapkan!");
}

runMigration().catch((err) => {
  console.error("❌ Gagal menjalankan migrasi:", err);
  process.exit(1);
});
