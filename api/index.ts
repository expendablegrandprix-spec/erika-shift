/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vercel Serverless Function entry point for LabShift Personal API
 */

import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { parseScheduleMessageOffline } from '../src/lib/aiParserService.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'LabShift Personal Backend (Vercel Serverless)',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Chat Message Parser endpoint
app.post(['/api/parse-shift-message', '/parse-shift-message'], async (req, res) => {
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
app.post(['/api/parse-shift-screenshot', '/parse-shift-screenshot'], async (req, res) => {
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

export default app;
