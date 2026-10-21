/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  History,
  AlertTriangle,
  TrendingUp,
  Award,
} from 'lucide-react';
import type { ShiftWithDetails, ShiftChangeLog, ConflictIssue } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES } from '../lib/constants.ts';
import { getPontianakDateString, addDays, getIntervalRange } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';

interface Props {
  shifts: ShiftWithDetails[];
  changeLogs: ShiftChangeLog[];
  conflicts: ConflictIssue[];
}

export const StatisticsPage: React.FC<Props> = ({
  shifts,
  changeLogs,
  conflicts,
}) => {
  const todayStr = getPontianakDateString();
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  // Active shifts (exclude cancelled)
  const activeShifts = shifts.filter((s) => s.status !== 'cancelled');

  // Month shifts
  const thisMonthShifts = activeShifts.filter((s) => s.shiftDate.startsWith(currentMonthPrefix));

  // Upcoming shifts
  const upcomingShifts = activeShifts.filter((s) => s.shiftDate >= todayStr);

  // Distribution by 6 shift colors
  const colorCounts: Record<string, number> = {};
  PREDEFINED_SHIFT_TYPES.forEach((st) => {
    colorCounts[st.code] = 0;
  });

  activeShifts.forEach((s) => {
    if (colorCounts[s.shiftType.code] !== undefined) {
      colorCounts[s.shiftType.code]++;
    }
  });

  const totalActive = activeShifts.length;

  // Last 30 days working hours calculation per category (Pagi, Siang, Malam)
  const thirtyDaysAgo = addDays(todayStr, -29);
  const recentShifts = activeShifts.filter((s) => s.shiftDate >= thirtyDaysAgo && s.shiftDate <= todayStr);

  let pagiHours = 0;
  let pagiCount = 0;
  let siangHours = 0;
  let siangCount = 0;
  let malamHours = 0;
  let malamCount = 0;

  recentShifts.forEach((s) => {
    const start = s.startTime || (s.shiftType.code === 'MALAM' ? '21:00' : s.shiftType.code === 'SIANG' ? '14:00' : '07:00');
    const end = s.endTime || (s.shiftType.code === 'MALAM' ? '07:00' : s.shiftType.code === 'SIANG' ? '21:30' : '14:30');
    const range = getIntervalRange(start, end);
    const hours = range ? (range.end - range.start) / 60 : 7.5;

    if (s.shiftType.code === 'SIANG') {
      siangHours += hours;
      siangCount++;
    } else if (s.shiftType.code === 'MALAM') {
      malamHours += hours;
      malamCount++;
    } else {
      pagiHours += hours;
      pagiCount++;
    }
  });

  const maxHours = Math.max(pagiHours, siangHours, malamHours, 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
          Analisis Jam & Beban Kerja
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Statistik Shift Laboratorium
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Data real-time berdasarkan catatan shift aktif (shift yang dibatalkan tidak dihitung).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Bulan Ini</span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {thisMonthShifts.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Shift terjadwal bulan ini</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Shift Mendatang</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {upcomingShifts.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Mulai hari ini ke depan</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Perubahan Jadwal</span>
            <History className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {changeLogs.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Tukar / revisi shift dicatat</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-500">Isu Konflik</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {conflicts.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Perlu perhatian / tumpang tindih</p>
        </div>
      </div>

      {/* Distribution by 6 Shift Colors */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Distribusi 6 Warna Shift
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sebaran penugasan ruang & jenis pemeriksaan di laboratorium patologi klinik.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            Total {totalActive} Shift
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {PREDEFINED_SHIFT_TYPES.map((st) => {
            const count = colorCounts[st.code] || 0;
            const percentage = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;

            return (
              <div key={st.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: st.colorHex }}
                    />
                    <span className="font-bold text-slate-800 uppercase">{st.name}</span>
                    <span className="text-slate-400 text-[11px] hidden sm:inline">
                      ({st.description})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-slate-900">{count} shift</span>
                    <span className="text-slate-500 text-[11px] w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: st.colorHex,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Chart: Total Working Hours per Shift Category (Last 30 Days) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Grafik Total Jam Kerja per Kategori Shift
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akumulasi jam kerja (Pagi, Siang, Malam) dalam 30 hari terakhir.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {recentShifts.length} Shift (30 Hari)
          </span>
        </div>

        {/* Bar Chart Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* Shift Pagi */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Shift Pagi</span>
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                {pagiCount} shift
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {pagiHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">jam</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (pagiHours / maxHours) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Mencakup 6 warna resmi (Kuning, Biru, Ungu, Abu-Abu, Hijau, Pink)
            </p>
          </div>

          {/* Shift Siang */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Shift Siang</span>
              <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                {siangCount} shift
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {siangHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">jam</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (siangHours / maxHours) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Pelayanan rutin siang tanpa aturan warna shift pagi
            </p>
          </div>

          {/* Shift Malam */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Shift Malam</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                {malamCount} shift
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {malamHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">jam</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (malamHours / maxHours) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Pelayanan darurat / malam lintas hari (overnight)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
