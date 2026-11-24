import http from "node:http";
import url from "node:url";
import { OAuth2Client } from "google-auth-library";
import { loadEnvConfig } from "@next/env";

// Load environment variables from .env / .env.local
loadEnvConfig(process.cwd());

const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\n❌ Error: GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET wajib diisi di .env.local terlebih dahulu!"
  );
  console.error("Contoh cara mengisi di .env.local:");
  console.error("GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com");
  console.error("GOOGLE_CLIENT_SECRET=GOCSPX-xxx\n");
  process.exit(1);
}

const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log("\n========================================================");
console.log("       GMAIL OAUTH2 TOKEN GENERATOR (PAYSIP MAILER)      ");
console.log("========================================================");
console.log("\n1. Buka tautan berikut di browser Anda:");
console.log(`\n👉 \x1b[36m${authUrl}\x1b[0m\n`);
console.log("2. Masuk dengan akun Gmail pengirim dan berikan izin.");
console.log("3. Setelah diarahkan kembali, token akan otomatis dicetak di sini.\n");
console.log(`Menunggu otorisasi di ${REDIRECT_URI}...\n`);

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url || "", true);

    if (parsedUrl.pathname === "/oauth2callback") {
      const code = parsedUrl.query.code as string;
      const error = parsedUrl.query.error as string;

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Otorisasi Dibatalkan / Gagal</h1><p>${error}</p>`);
        console.error(`\n❌ Pengguna membatalkan otorisasi: ${error}`);
        server.close();
        process.exit(1);
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Kode otorisasi tidak ditemukan.");
        return;
      }

      // Tukar authorization code dengan tokens
      const { tokens } = await oauth2Client.getToken(code);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #16a34a;">✅ Otorisasi Gmail Berhasil!</h2>
          <p>Refresh token telah diterima. Anda dapat menutup tab ini dan kembali ke terminal.</p>
        </div>
      `);

      console.log("\n========================================================");
      console.log("         ✅ REFRESH TOKEN BERHASIL DIPEROLEH!           ");
      console.log("========================================================");
      console.log(`\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\n👉 Salin baris di atas dan simpan ke file .env.local Anda!");
      console.log("========================================================\n");

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  } catch (err: unknown) {
    const error = err as Error;
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Gagal Menukar Token</h1><p>${error.message}</p>`);
    console.error("\n❌ Error saat menukar token:", error);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
