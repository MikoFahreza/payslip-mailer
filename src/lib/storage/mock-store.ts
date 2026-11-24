import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MOCK_STORAGE_DIR = path.join(os.tmpdir(), "payslip-mailer-blobs");

function ensureStorageDir() {
  if (!fs.existsSync(MOCK_STORAGE_DIR)) {
    try {
      fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }
}

export function saveMockFile(
  id: string,
  buffer: Buffer,
  contentType: string,
  filename: string
): void {
  ensureStorageDir();
  const filePath = path.join(MOCK_STORAGE_DIR, id);
  const metaPath = path.join(MOCK_STORAGE_DIR, `${id}.meta.json`);

  fs.writeFileSync(filePath, buffer);
  fs.writeFileSync(metaPath, JSON.stringify({ contentType, filename }));
}

export function getMockFile(
  id: string
): { buffer: Buffer; contentType: string; filename: string } | null {
  ensureStorageDir();
  const filePath = path.join(MOCK_STORAGE_DIR, id);
  const metaPath = path.join(MOCK_STORAGE_DIR, `${id}.meta.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    let contentType = "application/octet-stream";
    let filename = "attachment";

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        contentType = meta.contentType || contentType;
        filename = meta.filename || filename;
      } catch {
        // Fallback to defaults
      }
    }

    return { buffer, contentType, filename };
  } catch {
    return null;
  }
}

export function deleteMockFile(id: string): void {
  ensureStorageDir();
  const filePath = path.join(MOCK_STORAGE_DIR, id);
  const metaPath = path.join(MOCK_STORAGE_DIR, `${id}.meta.json`);

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  } catch {
    // Ignore deletion errors
  }
}
