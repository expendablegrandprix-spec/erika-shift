/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  Edit,
  Download,
  Grid,
} from 'lucide-react';
import type { ShiftWithDetails, ShiftType, ConflictIssue } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES } from '../lib/constants.ts';
import {
  formatIndonesianDate,
  formatIndonesianFullDate,
  getPontianakDateString,
  getIndonesianDayName,
} from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';
import { generateIcsCalendar, downloadIcsFile } from '../lib/icsExport.ts';
import { ShiftMatrixModal } from '../components/ShiftMatrixModal.tsx';

interface Props {
  shifts: ShiftWithDetails[];
  conflicts: ConflictIssue[];
  initialSelectedDate?: string;
  onAddShift: (date: string) => void;
  onEditShift: (shiftId: string) => void;
  onRefresh?: () => void;
}

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const CalendarPage: React.FC<Props> = ({
  shifts,
  conflicts,
  initialSelectedDate,
  onAddShift,
  onEditShift,
  onRefresh,
}) => {
  const todayStr = getPontianakDateString();
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || todayStr);
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);

  // Current view month & year
  const initialYear = parseInt(selectedDate.split('-')[0], 10);
  const initialMonth = parseInt(selectedDate.split('-')[1], 10) - 1;
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Filter by shift color code
  const [colorFilter, setColorFilter] = useState<string>('ALL');

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleTodayShortcut = () => {
    const today = getPontianakDateString();
    setSelectedDate(today);
    const [y, m] = today.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  };

  // Calendar math: Week starts on Monday (1: Monday, ... 7: Sunday)
  const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1, 12));
  // getUTCDay: 0 is Sunday. In Monday-start: Monday is 0, Sunday is 6.
  const startDayOffset = (firstDayOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12)).getUTCDate();

  // Generate calendar grid cells
  const calendarCells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth, 0, 12)).getUTCDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: day, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const m = viewMonth + 1;
    const dateStr = `${viewYear}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: day, isCurrentMonth: true });
  }

  // Next month leading days to complete full grid (multiple of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let day = 1; day <= (remainingCells <= 7 ? remainingCells : remainingCells - 7); day++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ dateStr, dayNumber: day, isCurrentMonth: false });
  }

  // Filtered shifts map by date
  const filteredShifts = colorFilter === 'ALL'
    ? shifts
    : shifts.filter((s) => s.shiftType.code === colorFilter);

  const shiftsByDate = new Map<string, ShiftWithDetails[]>();
  filteredShifts.forEach((s) => {
    if (s.status === 'cancelled') return;
    const list = shiftsByDate.get(s.shiftDate) || [];
    list.push(s);
    shiftsByDate.set(s.shiftDate, list);
  });

  // Selected date shifts
  const selectedDateShifts = shifts.filter(
    (s) => s.shiftDate === selectedDate && s.status !== 'cancelled'
  );
  const selectedDateConflicts = conflicts.filter((c) => c.date === selectedDate);

  const handleExportIcs = () => {
    const ics = generateIcsCalendar(shifts);
    downloadIcsFile(ics, `jadwal_shift_atlm_${viewYear}_${String(viewMonth + 1).padStart(2, '0')}.ics`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Penanggalan Shift Laboratorium
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{INDONESIAN_MONTH_NAMES[viewMonth]} {viewYear}</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportIcs}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Ekspor file .ics untuk Google Calendar, Apple Calendar, atau Outlook"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Ekspor .ics</span>
          </button>
          <button
            type="button"
            onClick={handleTodayShortcut}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsMatrixOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Buka input matriks shift sebulan penuh"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Matriks Jadwal</span>
          </button>
          <button
            type="button"
            onClick={() => onAddShift(selectedDate)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Shift</span>
          </button>
        </div>
      </div>

      {/* 6 Shift Colors Legend & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter 6 Warna Shift Resmi:</span>
          </span>
          {colorFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setColorFilter('ALL')}
              className="text-indigo-600 hover:underline cursor-pointer font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setColorFilter('ALL')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              colorFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Shift
          </button>

          {PREDEFINED_SHIFT_TYPES.map((st) => {
            const isSelected = colorFilter === st.code;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setColorFilter(isSelected ? 'ALL' : st.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: st.colorHex }}
                />
                <span>{st.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CALENDAR & DAY DETAIL 2-COLUMN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Calendar Grid (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          {/* Weekday headers: Monday to Sunday */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-slate-500">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span className="text-rose-500">Min</span>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell, idx) => {
              const dayShifts = shiftsByDate.get(cell.dateStr) || [];
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;
              const hasConflict = conflicts.some((c) => c.date === cell.dateStr);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[72px] sm:min-h-[88px] p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                      : isToday
                      ? 'border-indigo-300 bg-indigo-50/30'
                      : cell.isCurrentMonth
                      ? 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      : 'border-slate-100 bg-slate-50/40 opacity-40 hover:opacity-80'
                  }`}
                >
                  {/* Top day number & indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isToday
                          ? 'bg-slate-900 text-white font-bold'
                          : isSelected
                          ? 'bg-slate-200 text-slate-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasConflict && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Terdapat potensi konflik" />
                    )}
                  </div>

                  {/* Shift pills/badges on cell */}
                  <div className="space-y-1 w-full mt-1">
                    {dayShifts.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1"
                        style={{
                          backgroundColor: s.shiftType.colorHex + '30',
                          color: s.shiftType.code === 'KUNING' || s.shiftType.code === 'ABU_ABU' ? '#0F172A' : '#1E293B',
                          borderLeft: `3px solid ${s.shiftType.colorHex}`,
                        }}
                      >
                        <span className="truncate">{s.shiftType.name}</span>
                        {s.startTime && (
                          <span className="text-[9px] font-mono opacity-80 shrink-0">
                            {s.startTime.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    ))}
                    {dayShifts.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-medium px-1">
                        +{dayShifts.length - 2} lagi
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Panel (4 cols on desktop) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Rincian Tanggal Terpilih
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {formatIndonesianFullDate(selectedDate)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onAddShift(selectedDate)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Tambah shift pada tanggal ini"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Conflict alert for selected date if any */}
            {selectedDateConflicts.length > 0 && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Konflik Terdeteksi pada Tanggal Ini</span>
                </div>
                {selectedDateConflicts.map((c, i) => (
                  <p key={i} className="text-[11px] text-rose-800">
                    {c.message} — {c.details}
                  </p>
                ))}
              </div>
            )}

            {/* Shifts list on this date */}
            <div className="mt-4 space-y-3">
              {selectedDateShifts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Tidak ada jadwal shift</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Anda bebas tugas atau belum mencatat shift pada tanggal ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddShift(selectedDate)}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Jadwalkan Shift</span>
                  </button>
                </div>
              ) : (
                selectedDateShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <ShiftColorBadge shiftType={shift.shiftType} size="sm" />
                      <button
                        type="button"
                        onClick={() => onEditShift(shift.id)}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit shift ini"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">
                          {shift.startTime && shift.endTime
                            ? `${shift.startTime} – ${shift.endTime} WIB`
                            : 'Waktu belum diatur'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{shift.location || shift.shiftType.description}</span>
                      </div>

                      {shift.coworkers.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {shift.coworkers.map((c) => c.nickname || c.name.split(' ')[0]).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {shift.notes && (
                      <p className="text-[11px] text-slate-500 italic border-t border-slate-200 pt-1.5">
                        "{shift.notes}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onAddShift(selectedDate)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Shift pada {formatIndonesianDate(selectedDate)}</span>
            </button>
          </div>
        </div>
      </div>

      <ShiftMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
        existingShifts={shifts}
        onDataChanged={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
