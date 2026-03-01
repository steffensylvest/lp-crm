import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readDB() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── GET /api/data ────────────────────────────────────────────────────────────
// Returns the stored dataset. On first run (no data.json yet) returns empty.
app.get('/api/data', async (req, res) => {
  let data = await readDB();
  if (!data) {
    console.log('No data.json found — starting fresh.');
    data = { gps: [], pipeline: [] };
    await writeDB(data);
  }
  res.json(data);
});

// ─── PUT /api/data ────────────────────────────────────────────────────────────
// Replaces the full dataset (called by the frontend auto-save).
app.put('/api/data', async (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.gps) || !Array.isArray(data.pipeline)) {
    return res.status(400).json({ error: 'Invalid payload: expected { gps: [], pipeline: [] }' });
  }
  await writeDB(data);
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`LP CRM backend listening on http://localhost:${PORT}`);
  console.log(`  GET  /api/data  — load all data`);
  console.log(`  PUT  /api/data  — save all data`);
});
