import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { normalizeEmail } from "../utils";

dotenv.config({ path: ".env.local" });
dotenv.config();

function getArg(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function createOrPromoteAdmin() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("ep-sample-pooler")) {
    console.error("❌ DATABASE_URL belum diset ke Postgres Neon yang valid.");
    process.exit(1);
  }

  const rawEmail = getArg("email") || process.env.ADMIN_EMAIL;
  const rawPassword = getArg("password") || process.env.ADMIN_PASSWORD;
  const rawHash = process.env.ADMIN_PASSWORD_HASH;
  const name = (getArg("name") || process.env.ADMIN_NAME || "Administrator").trim();

  if (!rawEmail) {
    console.error(
      "❌ Email admin wajib diisi.\n" +
        "   Contoh: npm run db:create-admin -- --email=admin@domain.com --password=KataSandiKuat\n" +
        "   Atau set ADMIN_EMAIL dan ADMIN_PASSWORD / ADMIN_PASSWORD_HASH di .env.local"
    );
    process.exit(1);
  }

  const email = normalizeEmail(rawEmail);
  let passwordHash: string | undefined;

  if (rawPassword) {
    if (rawPassword.length < 6) {
      console.error("❌ Kata sandi admin minimal 6 karakter.");
      process.exit(1);
    }
    passwordHash = await bcrypt.hash(rawPassword, 10);
  } else if (rawHash) {
    passwordHash = rawHash;
  } else {
    console.error(
      "❌ Kata sandi admin wajib diberikan lewat --password=... atau ADMIN_PASSWORD / ADMIN_PASSWORD_HASH."
    );
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      passwordHash,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: [schema.users.email],
      set: {
        name,
        passwordHash,
        role: "admin",
      },
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
    });

  console.log(`✅ Akun admin siap: ${adminUser.name} <${adminUser.email}> [role=${adminUser.role}]`);
}

createOrPromoteAdmin().catch((err) => {
  console.error("❌ Gagal membuat akun admin:", err);
  process.exit(1);
});
