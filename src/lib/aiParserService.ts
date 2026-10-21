/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ParsedChatResult, ShiftCode } from '../types/index.ts';
import { getPontianakDateString, addDays } from './dateUtils.ts';

const SHIFT_COLOR_KEYWORDS: Record<string, ShiftCode> = {
  kuning: 'KUNING',
  yellow: 'KUNING',
  biru: 'BIRU',
  blue: 'BIRU',
  ungu: 'UNGU',
  purple: 'UNGU',
  violet: 'UNGU',
  abu: 'ABU_ABU',
  'abu-abu': 'ABU_ABU',
  'abu abu': 'ABU_ABU',
  gray: 'ABU_ABU',
  grey: 'ABU_ABU',
  hijau: 'HIJAU',
  green: 'HIJAU',
  pink: 'PINK',
  merahmuda: 'PINK',
  'merah muda': 'PINK',
};

const DAY_NAMES_MAP: Record<string, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  "jum'at": 5,
  sabtu: 6,
};

/**
 * Intelligent deterministic parser for Indonesian schedule chat messages.
 * Operates offline or as a fallback when external AI services are not configured.
 */
export function parseScheduleMessageOffline(message: string, baseDateStr: string = getPontianakDateString()): ParsedChatResult {
  const text = message.toLowerCase().trim();
  const ambiguities: string[] = [];

  // 1. Detect Shift Color
  let detectedShiftCode: ShiftCode | undefined;
  let detectedShiftName: string | undefined;

  for (const [kw, code] of Object.entries(SHIFT_COLOR_KEYWORDS)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(text)) {
      detectedShiftCode = code;
      detectedShiftName = code === 'ABU_ABU' ? 'Abu-Abu' : code.charAt(0) + code.slice(1).toLowerCase();
      break;
    }
  }

  if (!detectedShiftCode) {
    ambiguities.push('Warna shift tidak terdeteksi secara eksplisit dalam pesan.');
  }

  // 2. Detect Date (using Asia/Pontianak baseDateStr)
  let detectedDate: string | undefined;
  let dateLabel: string | undefined;

  if (/\bbesok\b/i.test(text)) {
    detectedDate = addDays(baseDateStr, 1);
    dateLabel = 'Besok';
  } else if (/\blusa\b/i.test(text)) {
    detectedDate = addDays(baseDateStr, 2);
    dateLabel = 'Lusa';
  } else if (/\bhari ini\b/i.test(text)) {
    detectedDate = baseDateStr;
    dateLabel = 'Hari Ini';
  } else if (/\bkemarin\b/i.test(text)) {
    detectedDate = addDays(baseDateStr, -1);
    dateLabel = 'Kemarin';
  } else {
    // Check day name e.g. "hari jumat", "jumat"
    let dayFound = false;
    for (const [dayName, targetDayIndex] of Object.entries(DAY_NAMES_MAP)) {
      const dayRegex = new RegExp(`\\b(hari\\s+)?${dayName}\\b`, 'i');
      if (dayRegex.test(text)) {
        // Calculate next upcoming date for this weekday
        const [y, m, d] = baseDateStr.split('-').map(Number);
        const currDate = new Date(Date.UTC(y, m - 1, d, 12));
        const currentDayIndex = currDate.getUTCDay();
        let diff = targetDayIndex - currentDayIndex;
        if (diff <= 0) diff += 7; // Next occurrence
        detectedDate = addDays(baseDateStr, diff);
        dateLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        dayFound = true;
        break;
      }
    }

    if (!dayFound) {
      // Check explicit date format e.g. 2026-10-21 or 21/10/2026 or 21-10
      const isoMatch = text.match(/\b(20\d\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
      const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d\d)\b/);

      if (isoMatch) {
        detectedDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        dateLabel = detectedDate;
      } else if (dmyMatch) {
        detectedDate = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        dateLabel = detectedDate;
      } else {
        ambiguities.push('Tanggal shift tidak ditemukan, default diatur ke Besok untuk ditinjau.');
        detectedDate = addDays(baseDateStr, 1);
        dateLabel = 'Besok (Dugaan)';
      }
    }
  }

  // 3. Detect Times: e.g. "jam 07.00 sampai 14.00", "07:00 - 14:00", "07.00-14.00", "pukul 14.00 s/d 21.00"
  let startTime: string | undefined;
  let endTime: string | undefined;

  const timeRegex = /(?:jam|pukul)?\s*([012]?\d)[.:]([0-5]\d)\s*(?:sampai|s\/d|-|sd|hingga|to)\s*(?:jam|pukul)?\s*([012]?\d)[.:]([0-5]\d)/i;
  const timeMatch = text.match(timeRegex);

  if (timeMatch) {
    startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
  } else {
    // Single time match e.g. "jam 07.00"
    const singleTimeRegex = /(?:jam|pukul)\s*([012]?\d)[.:]([0-5]\d)/i;
    const singleMatch = text.match(singleTimeRegex);
    if (singleMatch) {
      startTime = `${singleMatch[1].padStart(2, '0')}:${singleMatch[2]}`;
      ambiguities.push(`Hanya jam mulai (${startTime}) yang terdeteksi, jam selesai belum ada.`);
    } else {
      ambiguities.push('Jam kerja tidak ditemukan dalam pesan; silakan isi manual.');
    }
  }

  // 4. Detect Coworker Name: e.g. "tukar sama Budi", "dengan Ani", "gantikan Rina", "sama pak hendra"
  let coworkerName: string | undefined;
  const coworkerRegex = /(?:sama|dgn|dengan|ganti|gantikan|tukar|tukeran|ke)\s+([a-zA-Z\s]{2,20})(?:[.,]|\s|$)/i;
  const coworkerMatch = text.match(coworkerRegex);
  if (coworkerMatch) {
    const rawName = coworkerMatch[1].trim();
    // Exclude common stop words
    const stopWords = ['kamu', 'saya', 'dia', 'mereka', 'shift', 'biru', 'kuning', 'ungu', 'hijau', 'pink', 'abu', 'jam', 'besok', 'lusa'];
    if (!stopWords.includes(rawName.toLowerCase())) {
      coworkerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
  }

  // 5. Change type
  let changeType: ParsedChatResult['changeType'] = 'new_schedule';
  if (/tukar|tukeran|barter/i.test(text)) {
    changeType = 'swap';
  } else if (/ganti|gantikan|pengganti|menggantikan/i.test(text)) {
    changeType = 'replacement';
  } else if (/batal|cancel|libur/i.test(text)) {
    changeType = 'cancellation';
  }

  // 6. Reason
  let reason = 'Perubahan jadwal melalui pesan chat';
  if (/sakit|izin|keperluan|halangan|cuti/i.test(text)) {
    reason = 'Tukar shift / keperluan pribadi dari rekan';
  }

  const confidence: 'high' | 'medium' | 'low' =
    detectedShiftCode && detectedDate && startTime && endTime
      ? 'high'
      : detectedShiftCode || detectedDate
      ? 'medium'
      : 'low';

  return {
    date: detectedDate,
    dateLabel,
    shiftCode: detectedShiftCode,
    shiftName: detectedShiftName,
    startTime,
    endTime,
    coworkerName,
    changeType,
    reason,
    confidence,
    ambiguities,
    notes: `Pesan sumber: "${message}"`,
  };
}

/**
 * Parses schedule message using server-side Gemini if available, falling back to deterministic parser.
 */
export async function parseScheduleMessageWithAI(message: string): Promise<ParsedChatResult> {
  try {
    const response = await fetch('/api/parse-shift-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, baseDate: getPontianakDateString() }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.parsed) {
        return data.parsed as ParsedChatResult;
      }
    }
  } catch {
    // Silently fall back to offline deterministic parser
  }

  return parseScheduleMessageOffline(message);
}
