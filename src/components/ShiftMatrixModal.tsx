/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Trash2,
  Save,
  Grid,
} from 'lucide-react';
import type { ShiftWithDetails, ShiftType } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES } from '../lib/constants.ts';
import { ShiftColorBadge } from './ShiftColorBadge.tsx';
import { getIndonesianDayName } from '../lib/dateUtils.ts';
import { DataService } from '../services/dataService.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingShifts: ShiftWithDetails[];
  onDataChanged: () => void;
}

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ShiftMatrixModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingShifts,
  onDataChanged,
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0-11
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Days in month calculation
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12)).getUTCDate();

  // Map existing shifts by date string YYYY-MM-DD
  const shiftsMap = new Map<string, ShiftWithDetails>();
  existingShifts.forEach((s) => {
    if (s.status !== 'cancelled') {
      shiftsMap.set(s.shiftDate, s);
    }
  });

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

  // Quick assign shift to a specific date
  const handleAssignShift = async (dateStr: string, shiftTypeId: string | null) => {
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const existing = shiftsMap.get(dateStr);

      if (!shiftTypeId) {
        // Delete or cancel shift if already exists
        if (existing) {
          await DataService.deleteShift(existing.id);
        }
      } else {
        const st = PREDEFINED_SHIFT_TYPES.find((t) => t.id === shiftTypeId);
        if (!st) return;

        let startTime = '07:00';
        let endTime = '14:30';
        let location = `Lab Patologi Klinik — ${st.description}`;

        if (st.code === 'SIANG') {
          startTime = '14:00';
          endTime = '21:30';
        } else if (st.code === 'MALAM') {
          startTime = '21:00';
          endTime = '07:00';
        }

        if (existing) {
          // Update existing
          await DataService.updateShift(
            existing.id,
            {
              shiftDate: dateStr,
              shiftTypeId: st.id,
              startTime,
              endTime,
              location,
              isConfirmed: true,
            },
            existing.coworkers.map((c) => c.id),
            'Pembaruan via Matriks Cepat'
          );
        } else {
          // Create new
          await DataService.createShift({
            shiftDate: dateStr,
            shiftTypeId: st.id,
            startTime,
            endTime,
            location,
            status: 'scheduled',
            isConfirmed: true,
          }, []);
        }
      }

      onDataChanged();
      setSuccessMessage(`Berhasil memperbarui jadwal tanggal ${dateStr}`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (e) {
      console.error('Failed to update shift in matrix:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick fill weekdays (Monday-Friday) with Pagi (Kuning)
  const handleFillWeekdaysMorning = async () => {
    setIsSaving(true);
    try {
      const kuningType = PREDEFINED_SHIFT_TYPES.find((t) => t.code === 'KUNING') || PREDEFINED_SHIFT_TYPES[0];
      for (let day = 1; day <= daysInMonth; day++) {
        const mStr = String(viewMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateStr = `${viewYear}-${mStr}-${dStr}`;
        const dateObj = new Date(Date.UTC(viewYear, viewMonth, day, 12));
        const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 6 is Saturday

        // If Monday (1) through Friday (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const existing = shiftsMap.get(dateStr);
          if (!existing) {
            await DataService.createShift({
              shiftDate: dateStr,
              shiftTypeId: kuningType.id,
              startTime: '07:00',
              endTime: '14:30',
              location: 'Lab Patologi Klinik — Shift Pagi (Kuning)',
              status: 'scheduled',
              isConfirmed: true,
            }, []);
          }
        }
      }
      onDataChanged();
      setSuccessMessage('Berhasil mengisi hari kerja (Senin-Jumat) dengan Shift Pagi!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Input Matriks Jadwal Shift
              </h2>
              <p className="text-xs text-slate-500">
                Atur jadwal sebulan penuh dengan cepat dalam tampilan matriks interaktif
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Month Switcher */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">
              {INDONESIAN_MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillWeekdaysMorning}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Isi Otomatis Senin–Jumat (Pagi)</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-28">Tanggal</th>
                  <th className="py-3 px-4 w-32">Hari</th>
                  <th className="py-3 px-4">Shift Aktif</th>
                  <th className="py-3 px-4 text-right">Pilih Shift Cepat (Klik)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const mStr = String(viewMonth + 1).padStart(2, '0');
                  const dStr = String(day).padStart(2, '0');
                  const dateStr = `${viewYear}-${mStr}-${dStr}`;
                  const dateObj = new Date(Date.UTC(viewYear, viewMonth, day, 12));
                  const dayName = getIndonesianDayName(dateObj);
                  const isWeekend = dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6;
                  const currentShift = shiftsMap.get(dateStr);

                  return (
                    <tr
                      key={dateStr}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isWeekend ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {dStr} {INDONESIAN_MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
                      </td>
                      <td className={`py-2.5 px-4 font-medium ${isWeekend ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}>
                        {dayName}
                      </td>
                      <td className="py-2.5 px-4">
                        {currentShift ? (
                          <div className="flex items-center gap-2">
                            <ShiftColorBadge shiftTypeCode={currentShift.shiftType.code} size="sm" />
                            <span className="text-xs text-slate-600">
                              {currentShift.startTime} - {currentShift.endTime}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Belum ada shift</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {PREDEFINED_SHIFT_TYPES.map((st) => {
                            const isSelected = currentShift?.shiftTypeId === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleAssignShift(dateStr, st.id)}
                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'ring-2 ring-slate-900 shadow-xs scale-105'
                                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{
                                  backgroundColor: st.colorHex + '25',
                                  color: st.colorHex,
                                  borderColor: st.colorHex,
                                  borderWidth: '1px',
                                }}
                                title={`Pilih ${st.name} (${st.description})`}
                              >
                                {st.code}
                              </button>
                            );
                          })}
                          
                          {/* Clear / Delete button */}
                          {currentShift && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleAssignShift(dateStr, null)}
                              className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors ml-1 cursor-pointer"
                              title="Hapus / Kosongkan Shift"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Perubahan disimpan otomatis saat Anda mengklik tombol shift.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
