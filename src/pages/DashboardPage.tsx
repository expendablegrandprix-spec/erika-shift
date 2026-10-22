/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit,
  ArrowRight,
  Sparkles,
  MessageSquareShare,
  ShieldCheck,
  Download,
  Grid,
} from 'lucide-react';
import type { ShiftWithDetails, ConflictIssue, UserProfile } from '../types/index.ts';
import { formatIndonesianFullDate, formatIndonesianDate, getPontianakDateString } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';
import { TaskChecklist } from '../components/TaskChecklist.tsx';
import { ConflictAlert } from '../components/ConflictAlert.tsx';
import { generateSingleShiftIcs, downloadIcsFile } from '../lib/icsExport.ts';

interface Props {
  shifts: ShiftWithDetails[];
  conflicts: ConflictIssue[];
  profile: UserProfile;
  onAddShift: (date?: string) => void;
  onEditShift: (shiftId: string) => void;
  onGoToCalendar: (date?: string) => void;
  onGoToAiParser: () => void;
  onGoToMatrix?: () => void;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  shifts,
  conflicts,
  profile,
  onAddShift,
  onEditShift,
  onGoToCalendar,
  onGoToAiParser,
  onGoToMatrix,
  onRefresh,
}) => {
  const today = getPontianakDateString();

  // Greeting based on current hour
  const currentHour = new Date().getHours();
  let timeGreeting = 'Selamat Pagi';
  if (currentHour >= 11 && currentHour < 15) {
    timeGreeting = 'Selamat Siang';
  } else if (currentHour >= 15 && currentHour < 18) {
    timeGreeting = 'Selamat Sore';
  } else if (currentHour >= 18 || currentHour < 4) {
    timeGreeting = 'Selamat Malam';
  }

  const motivationalQuotes = [
    'Tetap teliti, jaga mutu pemeriksaan laboratorium, dan utamakan keselamatan kerja hari ini! 🔬💪✨',
    'Ketelitian Anda adalah kunci akurasi diagnosis pasien. Semangat bertugas! 🧪🎯',
    'Setiap sampel yang diperiksa adalah harapan pasien. Lakukan yang terbaik hari ini! 🌟',
    'Kualitas hasil laboratorium yang handal bermula dari profesionalisme Anda. Selamat bekerja! 🩺💼',
  ];
  const quoteIndex = (today.split('-').reduce((acc, v) => acc + Number(v), 0)) % motivationalQuotes.length;
  const motivatingMessage = motivationalQuotes[quoteIndex];

  // Find shifts for today
  const todayShifts = shifts.filter((s) => s.shiftDate === today && s.status !== 'cancelled');

  // Find next upcoming shift (date > today)
  const upcomingShifts = shifts
    .filter((s) => s.shiftDate > today && s.status !== 'cancelled')
    .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
  const nextShift = upcomingShifts[0];

  // Filter conflicts occurring today
  const todayConflicts = conflicts.filter((c) => c.date === today);

  return (
    <div className="space-y-6">
      {/* User Welcome Banner with Profile Photo & Motivational Greeting */}
      <div className="rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center gap-5 border border-pink-200" style={{ backgroundColor: '#FFCED8' }}>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-32 h-32 bg-white/30 rounded-full blur-xl pointer-events-none" />

        <div className="relative shrink-0">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/60 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/80 text-slate-900 font-bold text-2xl flex items-center justify-center border-2 border-white/60 shadow-md">
              {profile.displayName ? profile.displayName.slice(0, 2).toUpperCase() : 'AT'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white text-[10px]" title="Aktif">
            ✓
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5 z-10 text-slate-900">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/10 text-xs font-semibold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-pink-700" />
            <span>{profile.jobTitle || 'Ahli Teknologi Laboratorium Medik'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {timeGreeting}, {profile.displayName}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium max-w-xl">
            "{motivatingMessage}"
          </p>
          <div className="text-[11px] text-slate-700 font-medium pt-0.5">
            📍 {profile.workUnit || 'Instalasi Laboratorium Patologi Klinik'}
          </div>
        </div>
      </div>
      {/* Date and Clinical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Jadwal Laboratorium Patologi Klinik
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatIndonesianFullDate(today)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToAiParser}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#FFDDDD] via-[#E3AFC9]/50 to-[#FFF83F]/40 border border-slate-300 text-slate-900 hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
            <span>Tempel Chat WhatsApp</span>
          </button>
          {onGoToMatrix && (
            <button
              type="button"
              onClick={onGoToMatrix}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Buka Matriks Jadwal Sebulan Penuh"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matriks Jadwal</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onAddShift(today)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Shift</span>
          </button>
        </div>
      </div>

      {/* Prominent Conflict Alerts for Today */}
      {todayConflicts.length > 0 && (
        <ConflictAlert conflicts={todayConflicts} onSelectShift={onEditShift} />
      )}

      {/* TODAY'S SHIFT SECTION */}
      {todayShifts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FFDDDD]/60 mx-auto flex items-center justify-center text-slate-700 mb-3">
            <Calendar className="w-7 h-7 text-[#E3AFC9]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Belum ada jadwal shift untuk hari ini
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Tidak ada shift aktif tercatat pada {formatIndonesianDate(today)}. Anda dapat menambahkan shift baru atau mengimpor pesan rolling jadwal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={() => onAddShift(today)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Shift Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={() => onGoToCalendar(today)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Buka Kalender
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {todayShifts.length > 1 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Perhatian: Terdapat <strong>{todayShifts.length} shift</strong> tercatat pada hari ini. Periksa rincian jam kerja untuk mencegah bentrok tugas.
              </span>
            </div>
          )}

          {todayShifts.map((shift, idx) => (
            <div
              key={shift.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
            >
              {/* Colored Shift Header Banner */}
              <div
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-black/5"
                style={{ backgroundColor: shift.shiftType.colorHex + '20' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full border border-white/60 shadow-xs"
                    style={{ backgroundColor: shift.shiftType.colorHex }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">
                        Shift Aktif {todayShifts.length > 1 ? `#${idx + 1}` : 'Hari Ini'}
                      </span>
                      <ShiftColorBadge shiftType={shift.shiftType} size="sm" />
                    </div>
                    <div className="text-base font-bold text-slate-950 mt-0.5">
                      Laboratorium {shift.shiftType.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {shift.isConfirmed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Terkonfirmasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100/80 text-amber-900 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Perlu Konfirmasi
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const ics = generateSingleShiftIcs(shift);
                      downloadIcsFile(ics, `shift_${shift.shiftType.name.toLowerCase()}_${shift.shiftDate}.ics`);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Ekspor shift ini ke file .ics untuk Google Calendar"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span className="hidden sm:inline">Kalender (.ics)</span>
                    <span className="sm:hidden">.ics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditShift(shift.id)}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Shift Details Body */}
              <div className="p-5 space-y-5">
                {/* Time, Location, Description Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 font-medium">Jam Kerja:</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {shift.startTime && shift.endTime
                          ? `${shift.startTime} – ${shift.endTime} WIB`
                          : 'Belum ditentukan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 font-medium">Ruang / Bagian Lab:</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {shift.location || shift.shiftType.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 font-medium">Rekan Shift Ini ({shift.coworkers.length}):</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {shift.coworkers.length > 0
                          ? shift.coworkers.map((c) => c.nickname || c.name.split(' ')[0]).join(', ')
                          : 'Belum ada rekan ditugaskan'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes if any */}
                {shift.notes && (
                  <div className="p-3 bg-[#FFDDDD]/30 border border-[#E3AFC9]/40 rounded-xl text-xs text-slate-800">
                    <span className="font-semibold text-slate-900">Catatan Shift: </span>
                    {shift.notes}
                  </div>
                )}

                {/* Assigned Coworkers Card List */}
                {shift.coworkers.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2 block">
                      Rekan Bertugas Bersama
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {shift.coworkers.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {(c.nickname || c.name).charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                            {c.notes && (
                              <div className="text-[11px] text-slate-500 truncate">{c.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Shift Task Checklist */}
                <div className="pt-2 border-t border-slate-100">
                  <TaskChecklist shift={shift} onUpdate={onRefresh} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEXT UPCOMING SHIFT PREVIEW */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Shift Berikutnya
            </span>
            {nextShift && (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: nextShift.shiftType.colorHex }}
              />
            )}
          </div>
          {nextShift ? (
            <div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>{nextShift.shiftType.name}</span>
                <span className="text-xs font-normal text-slate-300">
                  ({formatIndonesianFullDate(nextShift.shiftDate)})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Jam {nextShift.startTime || '07:00'} – {nextShift.endTime || '14:00'} WIB · {nextShift.location || nextShift.shiftType.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Belum ada jadwal shift mendatang yang tercatat.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onGoToCalendar(nextShift?.shiftDate || today)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>Lihat Seluruh Jadwal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onGoToAiParser}
          className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-50 text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
            <MessageSquareShare className="w-4 h-4 text-purple-700" />
            <span>Tempel Chat WhatsApp</span>
          </div>
          <p className="text-xs text-purple-800/80 mt-1">
            Ekstrak rolling dan tukar shift otomatis dengan AI asisten
          </p>
        </button>

        <button
          type="button"
          onClick={() => onAddShift()}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Plus className="w-4 h-4 text-slate-700" />
            <span>Tambah Shift Manual</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Entri jadwal baru lengkap dengan jam kerja & rekan lab
          </p>
        </button>

        <button
          type="button"
          onClick={() => onGoToCalendar()}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>Kalender Bulanan</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau sebaran 6 warna shift & periksa potensi konflik
          </p>
        </button>
      </div>
    </div>
  );
};
