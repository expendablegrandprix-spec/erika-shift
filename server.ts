/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { parseScheduleMessageOffline } from './src/lib/aiParserService.ts';

import { createClient } from '@supabase/supabase-js';
import { getDatabase, saveDatabase, ServerUser } from './serverDb.ts';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serverSupabase = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '15mb' }));

// -------------------------------------------------------------
// AUTHENTICATION & MULTI-BROWSER CONNECTIVITY ENDPOINTS
// -------------------------------------------------------------

// List all registered accounts (public user metadata for lookup)
app.get('/api/auth/users', (_req, res) => {
  const db = getDatabase();
  const safeUsers = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role || 'ATLM',
    createdAt: u.createdAt,
  }));
  res.json({ users: safeUsers });
});

// Register a new ATLM user account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Harap lengkapi semua kolom pendaftaran.' });
      return;
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    // Check if user already exists
    const existing = db.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.displayName.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      res.status(409).json({ error: 'Email atau Nama Pengguna ini sudah terdaftar.' });
      return;
    }

    const newUser: ServerUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      email: cleanEmail,
      password: String(password),
      displayName: cleanName,
      role: role || 'Ahli Teknologi Laboratorium Medik (ATLM)',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    if (serverSupabase) {
      try {
        await serverSupabase.from('profiles').upsert({
          id: newUser.id,
          display_name: newUser.displayName,
          email: newUser.email,
          password: newUser.password,
          job_title: newUser.role,
          updated_at: new Date().toISOString(),
        });
      } catch (sErr) {
        console.warn('Server Supabase register upsert skipped:', sErr);
      }
    }

    res.json({
      success: true,
      message: 'Akun berhasil didaftarkan.',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

// Login authentication
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Harap masukkan Nama / Email dan Kata Sandi.' });
      return;
    }

    const db = getDatabase();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = String(password);

    // Look for matching user in server database
    const matched = db.users.find((u) => {
      const uEmail = u.email.toLowerCase();
      const uName = u.displayName.toLowerCase();
      const uFirst = uName.split(/[\s,]+/)[0];
      return cleanId === uEmail || cleanId === uName || cleanId === uFirst;
    });

    if (!matched) {
      res.status(401).json({
        error: 'Akun tidak terdaftar. Silakan buat akun baru terlebih dahulu.',
      });
      return;
    }

    if (matched.password && matched.password !== cleanPass) {
      res.status(401).json({
        error: 'Kata sandi yang Anda masukkan salah. Silakan periksa kembali.',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: matched.id,
        email: matched.email,
        displayName: matched.displayName,
        role: matched.role || 'ATLM',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

// Password reset endpoint
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Harap masukkan email dan kata sandi baru.' });
      return;
    }
    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(404).json({ error: 'Akun dengan email ini tidak ditemukan.' });
      return;
    }
    user.password = String(newPassword);
    saveDatabase(db);
    res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

// -------------------------------------------------------------
// REAL-TIME CLOUD SYNC ENDPOINTS (ACROSS ALL BROWSERS)
// -------------------------------------------------------------

// Pull full database state for cross-browser synchronization
app.get('/api/sync', (_req, res) => {
  try {
    const db = getDatabase();
    res.json({
      profile: db.profile,
      shifts: db.shifts,
      shift_coworkers: db.shift_coworkers,
      coworkers: db.coworkers,
      coworker_matrix_assignments: db.coworker_matrix_assignments,
      change_logs: db.change_logs,
      notes: db.notes,
      reminders: db.reminders,
      updatedAt: db.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data sinkronisasi.' });
  }
});

// Push client updates to server database
app.post('/api/sync', (req, res) => {
  try {
    const { shifts, shift_coworkers, coworkers, coworker_matrix_assignments, notes, profile } = req.body;
    const db = getDatabase();

    if (Array.isArray(shifts)) db.shifts = shifts;
    if (Array.isArray(shift_coworkers)) db.shift_coworkers = shift_coworkers;
    if (Array.isArray(coworkers)) db.coworkers = coworkers;
    if (Array.isArray(coworker_matrix_assignments)) db.coworker_matrix_assignments = coworker_matrix_assignments;
    if (Array.isArray(notes)) db.notes = notes;
    if (profile && typeof profile === 'object') db.profile = { ...db.profile, ...profile };

    saveDatabase(db);
    res.json({ success: true, updatedAt: db.updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan sinkronisasi data.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'LabShift Personal Backend',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Chat Message Parser endpoint
app.post('/api/parse-shift-message', async (req, res) => {
  try {
    const { message, baseDate } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Pesan teks tidak boleh kosong.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fall back to deterministic rule-based parser
      const fallbackResult = parseScheduleMessageOffline(message, baseDate);
      res.json({ parsed: fallbackResult, source: 'offline-rules' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
Anda adalah asisten cerdas untuk analis laboratorium (ATLM) di RSUD Sultan Syarif Mohamad Alkadrie Pontianak.
Tugas Anda adalah mengekstrak informasi perubahan jadwal shift laboratorium dari pesan chat WhatsApp berikut.

Tanggal referensi hari ini (WIB / Asia/Pontianak): "${baseDate || new Date().toISOString().slice(0, 10)}"

6 Warna Shift Resmi di laboratorium:
1. KUNING: Urinalisis, Feses, Sekret, Mikroskopik, Malaria, Diff, BTA
2. BIRU: Kimia Klinik, Serologi, Kromatografi, Elektrolit, AGD, HbA1c, Imuno Serologi, Hormon
3. UNGU: Hematologi / PH, Widal, Goldar, Tubex, Sediaan darah
4. ABU_ABU: Operator LIS, Validasi & Pelaporan Nilai Kritis
5. HIJAU: TCM, Mikrobiologi Molekuler, BTA, PCR, Antigen
6. PINK: Merangkap petugas BDRS

Pesan chat dari rekan:
"""${message}"""

Ekstrak dengan teliti informasi tanggal (YYYY-MM-DD), warna shift (KUNING, BIRU, UNGU, ABU_ABU, HIJAU, PINK), jam mulai (HH:mm), jam selesai (HH:mm), nama rekan yang terlibat, jenis perubahan (swap/replacement/new_schedule/cancellation), alasan, dan daftar ambiguitas (jika ada hal yang belum pasti).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: 'Tanggal shift dalam format YYYY-MM-DD' },
            dateLabel: { type: Type.STRING, description: 'Label tanggal misalnya Besok, Lusa, Jumat' },
            shiftCode: { type: Type.STRING, enum: ['KUNING', 'BIRU', 'UNGU', 'ABU_ABU', 'HIJAU', 'PINK'] },
            shiftName: { type: Type.STRING },
            startTime: { type: Type.STRING, description: 'HH:mm' },
            endTime: { type: Type.STRING, description: 'HH:mm' },
            coworkerName: { type: Type.STRING },
            changeType: { type: Type.STRING, enum: ['swap', 'replacement', 'new_schedule', 'cancellation'] },
            reason: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
            ambiguities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['changeType', 'confidence', 'ambiguities'],
        },
      },
    });

    const textOutput = response.text?.trim() || '{}';
    const parsed = JSON.parse(textOutput);
    res.json({ parsed, source: 'gemini-2.5-flash' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in /api/parse-shift-message:', errorMsg);
    // Fall back to offline parser
    const fallback = parseScheduleMessageOffline(req.body?.message || '', req.body?.baseDate);
    res.json({ parsed: fallback, source: 'fallback-rules', warning: errorMsg });
  }
});

// AI Screenshot Parser endpoint
app.post('/api/parse-shift-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType, baseDate } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Data gambar screenshot tidak ditemukan.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: 'Fitur ekstraksi tangkapan layar membutuhkan GEMINI_API_KEY di server.' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
Analisis tangkapan layar (screenshot) pesan chat jadwal laboratorium berikut.
Ekstrak jadwal kerja untuk ATLM:
- Tanggal (YYYY-MM-DD), gunakan tanggal acuan hari ini: ${baseDate || new Date().toISOString().slice(0, 10)}
- Warna shift (KUNING, BIRU, UNGU, ABU_ABU, HIJAU, PINK)
- Jam mulai (HH:mm) dan jam selesai (HH:mm)
- Nama rekan jika ada
- Jenis perubahan (swap, replacement, new_schedule, cancellation)
- Alasan jika ada
- Catatan atau ketidakjelasan yang perlu diverifikasi manual oleh ATLM
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            dateLabel: { type: Type.STRING },
            shiftCode: { type: Type.STRING, enum: ['KUNING', 'BIRU', 'UNGU', 'ABU_ABU', 'HIJAU', 'PINK'] },
            shiftName: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            coworkerName: { type: Type.STRING },
            changeType: { type: Type.STRING, enum: ['swap', 'replacement', 'new_schedule', 'cancellation'] },
            reason: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
            ambiguities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['changeType', 'confidence', 'ambiguities'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json({ parsed, source: 'gemini-screenshot' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Gagal memproses screenshot: ${errorMsg}` });
  }
});

// Dev vs Prod Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`LabShift server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
