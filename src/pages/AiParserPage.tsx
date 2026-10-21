/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { ParsedChatResult, ShiftWithDetails, Coworker, ShiftType } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES } from '../lib/constants.ts';
import { getPontianakDateString, formatIndonesianFullDate, formatIndonesianDate } from '../lib/dateUtils.ts';
import { parseScheduleMessageWithAI, parseScheduleMessageOffline } from '../lib/aiParserService.ts';
import { DataService } from '../services/dataService.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';

interface Props {
  shifts: ShiftWithDetails[];
  coworkers: Coworker[];
  onShiftImported: () => void;
  onQuickAddCoworker: (name: string) => Promise<Coworker>;
}

export const AiParserPage: React.FC<Props> = ({
  shifts,
  coworkers,
  onShiftImported,
  onQuickAddCoworker,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'screenshot'>('text');
  const [chatMessage, setChatMessage] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedProposal, setParsedProposal] = useState<ParsedChatResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Editable fields in review proposal
  const [reviewDate, setReviewDate] = useState('');
  const [reviewShiftTypeId, setReviewShiftTypeId] = useState('');
  const [reviewStartTime, setReviewStartTime] = useState('07:00');
  const [reviewEndTime, setReviewEndTime] = useState('14:00');
  const [reviewCoworkerName, setReviewCoworkerName] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewIsConfirmed, setReviewIsConfirmed] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Screenshot upload state
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const sampleMessages = [
    'Besok kamu tukar sama Budi. Kamu masuk Biru jam 07.00 sampai 14.00.',
    'Lusa tolong gantikan shift Kuning pukul 14.00 s/d 21.00 di lab urinalisis ya.',
    'Jumat kamu rolling ke shift Ungu (07.00 - 14.00) sama Siti.',
    'Malam besok kamu shift Hijau jam 21.00 sampai 07.00 TCM BTA.',
  ];

  const handleUseSample = (msg: string) => {
    setChatMessage(msg);
  };

  const handleParse = async () => {
    if (!chatMessage.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setSuccessMessage(null);

    try {
      const result = await parseScheduleMessageWithAI(chatMessage);
      setParsedProposal(result);

      // Populate review form
      setReviewDate(result.date || getPontianakDateString());
      const matchedType = PREDEFINED_SHIFT_TYPES.find(
        (st) => st.code === result.shiftCode
      ) || PREDEFINED_SHIFT_TYPES[0];
      setReviewShiftTypeId(matchedType.id);
      setReviewStartTime(result.startTime || '07:00');
      setReviewEndTime(result.endTime || '14:00');
      setReviewCoworkerName(result.coworkerName || '');
      setReviewReason(result.reason || `Pesan WhatsApp: "${chatMessage.slice(0, 50)}..."`);
    } catch (err: unknown) {
      console.warn('AI parsing failed, falling back:', err);
      const fallback = parseScheduleMessageOffline(chatMessage);
      setParsedProposal(fallback);
      setReviewDate(fallback.date || getPontianakDateString());
      const matchedType = PREDEFINED_SHIFT_TYPES.find(
        (st) => st.code === fallback.shiftCode
      ) || PREDEFINED_SHIFT_TYPES[0];
      setReviewShiftTypeId(matchedType.id);
      setReviewStartTime(fallback.startTime || '07:00');
      setReviewEndTime(fallback.endTime || '14:00');
      setReviewCoworkerName(fallback.coworkerName || '');
      setReviewReason(fallback.reason || 'Perubahan dari pesan chat');
    } finally {
      setIsParsing(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleParseScreenshot = async () => {
    if (!screenshotPreview) return;
    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch('/api/parse-shift-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: screenshotPreview,
          mimeType: screenshotFile?.type || 'image/jpeg',
          baseDate: getPontianakDateString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal memproses gambar screenshot.');
      }

      const data = await res.json();
      const result: ParsedChatResult = data.parsed;
      setParsedProposal(result);

      setReviewDate(result.date || getPontianakDateString());
      const matchedType = PREDEFINED_SHIFT_TYPES.find(
        (st) => st.code === result.shiftCode
      ) || PREDEFINED_SHIFT_TYPES[0];
      setReviewShiftTypeId(matchedType.id);
      setReviewStartTime(result.startTime || '07:00');
      setReviewEndTime(result.endTime || '14:00');
      setReviewCoworkerName(result.coworkerName || '');
      setReviewReason(result.reason || 'Perubahan dari tangkapan layar chat');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses tangkapan layar.';
      setParseError(msg + ' Silakan gunakan tab Teks Chat WhatsApp untuk memasukkan pesan secara manual.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm proposal and commit to database
  const handleConfirmAndSave = async () => {
    if (!reviewDate || !reviewShiftTypeId) return;
    setIsSaving(true);
    try {
      // Find or create coworker if mentioned
      const coworkerIds: string[] = [];
      if (reviewCoworkerName.trim()) {
        const existing = coworkers.find(
          (c) =>
            c.name.toLowerCase().includes(reviewCoworkerName.toLowerCase()) ||
            (c.nickname && c.nickname.toLowerCase() === reviewCoworkerName.toLowerCase())
        );
        if (existing) {
          coworkerIds.push(existing.id);
        } else {
          const newCoworker = await onQuickAddCoworker(reviewCoworkerName.trim());
          coworkerIds.push(newCoworker.id);
        }
      }

      // Check if there is an existing shift on this reviewDate to update or add as new
      const existingShiftOnDate = shifts.find(
        (s) => s.shiftDate === reviewDate && s.status !== 'cancelled'
      );

      const shiftType = PREDEFINED_SHIFT_TYPES.find((st) => st.id === reviewShiftTypeId)!;

      if (existingShiftOnDate && parsedProposal?.changeType === 'swap') {
        // Update existing shift
        await DataService.updateShift(
          existingShiftOnDate.id,
          {
            shiftTypeId: reviewShiftTypeId,
            startTime: reviewStartTime,
            endTime: reviewEndTime,
            location: `Lab Patologi Klinik — ${shiftType.description}`,
            notes: `Tukar shift: ${reviewReason}`,
            isConfirmed: reviewIsConfirmed,
          },
          coworkerIds,
          reviewReason,
          inputMode === 'screenshot' ? 'screenshot' : 'chat_text',
          chatMessage
        );
      } else {
        // Create new shift entry
        await DataService.createShift(
          {
            shiftDate: reviewDate,
            shiftTypeId: reviewShiftTypeId,
            startTime: reviewStartTime,
            endTime: reviewEndTime,
            location: `Lab Patologi Klinik — ${shiftType.description}`,
            notes: `Perubahan jadwal: ${reviewReason}`,
            status: 'scheduled',
            isConfirmed: reviewIsConfirmed,
          },
          coworkerIds
        );
      }

      setSuccessMessage('Perubahan jadwal berhasil dikonfirmasi dan dicatat ke dalam database!');
      setParsedProposal(null);
      setChatMessage('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      onShiftImported();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan proposal jadwal.';
      setParseError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedReviewShiftType =
    PREDEFINED_SHIFT_TYPES.find((st) => st.id === reviewShiftTypeId) || PREDEFINED_SHIFT_TYPES[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-purple-700 text-xs uppercase tracking-wider font-bold">
          <Sparkles className="w-4 h-4" />
          <span>Asisten AI Rolling & Tukar Shift</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
          Tempel Pesan Perubahan Jadwal
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tempel pesan chat WhatsApp atau unggah tangkapan layar. AI akan mengekstrak tanggal, warna shift, jam kerja, dan nama rekan secara otomatis sebelum meminta konfirmasi Anda.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {parseError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900">
          {parseError}
        </div>
      )}

      {/* Input Mode Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => {
            setInputMode('text');
            setParsedProposal(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            inputMode === 'text'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Teks Chat WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setInputMode('screenshot');
            setParsedProposal(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            inputMode === 'screenshot'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Tangkapan Layar (Screenshot)</span>
        </button>
      </div>

      {/* TEXT CHAT MODE */}
      {inputMode === 'text' && !parsedProposal && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tempel Pesan Chat Perubahan Shift:
            </label>
            <textarea
              rows={4}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder='Contoh: "Besok kamu tukar sama Budi. Kamu masuk Biru jam 07.00 sampai 14.00."'
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Quick sample chips */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Atau coba contoh pesan:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleMessages.map((msg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleUseSample(msg)}
                  className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors text-left cursor-pointer"
                >
                  "{msg.slice(0, 36)}..."
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleParse}
            disabled={isParsing || !chatMessage.trim()}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menganalisis Pesan dengan AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#FFF83F]" />
                <span>Analisis & Ekstrak Jadwal</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* SCREENSHOT MODE */}
      {inputMode === 'screenshot' && !parsedProposal && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Unggah Tangkapan Layar Chat Shift:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotChange}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Privasi terjamin: Tangkapan layar diproses secara aman dan tidak disimpan permanen di server.
            </p>
          </div>

          {screenshotPreview && (
            <div className="max-w-xs mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <img
                src={screenshotPreview}
                alt="Preview Screenshot"
                className="w-full h-auto max-h-64 object-contain bg-slate-50"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleParseScreenshot}
            disabled={isParsing || !screenshotPreview}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengekstrak Jadwal dari Gambar...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#FFF83F]" />
                <span>Ekstrak Jadwal dari Screenshot</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* REVIEW & CONFIRMATION PROPOSAL CARD */}
      {parsedProposal && (
        <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tinjauan Proposal Perubahan Jadwal
                </h3>
                <span className="text-[11px] text-purple-700 font-medium">
                  Tingkat Keyakinan AI: {parsedProposal.confidence.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setParsedProposal(null)}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Ubah Pesan
            </button>
          </div>

          {/* Ambiguities / Warnings if any */}
          {parsedProposal.ambiguities && parsedProposal.ambiguities.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Perlu Verifikasi Manual:</span>
              </div>
              {parsedProposal.ambiguities.map((a, idx) => (
                <p key={idx} className="text-[11px] text-amber-800">
                  • {a}
                </p>
              ))}
            </div>
          )}

          {/* Review fields (editable before explicit confirmation) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Shift *
                </label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {formatIndonesianFullDate(reviewDate)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Warna Shift Resmi *
                </label>
                <select
                  value={reviewShiftTypeId}
                  onChange={(e) => setReviewShiftTypeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  {PREDEFINED_SHIFT_TYPES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.description}
                    </option>
                  ))}
                </select>
                <div className="mt-1">
                  <ShiftColorBadge shiftType={selectedReviewShiftType} size="sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={reviewStartTime}
                  onChange={(e) => setReviewStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={reviewEndTime}
                  onChange={(e) => setReviewEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rekan yang Terlibat
                </label>
                <input
                  type="text"
                  value={reviewCoworkerName}
                  onChange={(e) => setReviewCoworkerName(e.target.value)}
                  placeholder="Nama rekan (misal: Budi)"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alasan / Sumber Perubahan
              </label>
              <input
                type="text"
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="font-semibold text-slate-800">
                Tandai jadwal langsung terkonfirmasi
              </span>
              <button
                type="button"
                onClick={() => setReviewIsConfirmed(!reviewIsConfirmed)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                  reviewIsConfirmed
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {reviewIsConfirmed ? 'Terkonfirmasi' : 'Perlu Konfirmasi'}
              </button>
            </div>
          </div>

          {/* Explicit Confirmation Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setParsedProposal(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Menyimpan...' : 'Konfirmasi & Terapkan Perubahan'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
