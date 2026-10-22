/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  UserPlus,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus,
  HelpCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import type { ShiftWithDetails, ShiftType, Coworker, UserProfile, CoworkerMatrixAssignment } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES } from '../lib/constants.ts';
import { getIndonesianDayName, getPontianakDateString } from '../lib/dateUtils.ts';
import { DataService } from '../services/dataService.ts';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  existingShifts: ShiftWithDetails[];
  coworkers: Coworker[];
  userProfile?: UserProfile;
  onDataChanged: () => void;
  isFullPage?: boolean;
}

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ShiftMatrixModal: React.FC<Props> = ({
  isOpen = true,
  onClose,
  existingShifts,
  coworkers,
  userProfile,
  onDataChanged,
  isFullPage = false,
}) => {
  const now = new Date();
  const todayStr = getPontianakDateString();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0-11
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Active shift stamp brush (null = normal click to choose, string = instant paint on click)
  const [activeBrush, setActiveBrush] = useState<string | null>(null);

  // Quick coworker addition form modal
  const [isAddCoworkerOpen, setIsAddCoworkerOpen] = useState(false);
  const [newCoworkerName, setNewCoworkerName] = useState('');
  const [newCoworkerRole, setNewCoworkerRole] = useState('');
  const [newCoworkerNickname, setNewCoworkerNickname] = useState('');

  // Cell popover selector state
  const [cellPopover, setCellPopover] = useState<{
    targetType: 'user' | 'coworker';
    coworkerId?: string;
    dateStr: string;
    dayNum: number;
    currentShiftTypeId?: string | null;
  } | null>(null);

  // Load coworker matrix assignments from local storage
  const [coworkerAssignments, setCoworkerAssignments] = useState<CoworkerMatrixAssignment[]>(() => {
    return DataService.getCoworkerMatrixAssignments();
  });

  // Re-sync assignments whenever shifts or external changes occur
  useEffect(() => {
    setCoworkerAssignments(DataService.getCoworkerMatrixAssignments());
  }, [existingShifts]);

  if (!isFullPage && !isOpen) return null;

  // Days in selected month
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12)).getUTCDate();

  // User shifts mapped by date YYYY-MM-DD
  const userShiftsMap = useMemo(() => {
    const map = new Map<string, ShiftWithDetails>();
    existingShifts.forEach((s) => {
      if (s.status !== 'cancelled') {
        map.set(s.shiftDate, s);
      }
    });
    return map;
  }, [existingShifts]);

  // Coworker assignments mapped by `${coworkerId}_${date}`
  const coworkerAssignmentsMap = useMemo(() => {
    const map = new Map<string, string>();
    coworkerAssignments.forEach((a) => {
      map.set(`${a.coworkerId}_${a.date}`, a.shiftTypeId);
    });
    return map;
  }, [coworkerAssignments]);

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

  // Assign shift to User for a specific date
  const handleAssignUserShift = async (dateStr: string, shiftTypeId: string | null) => {
    setIsSaving(true);
    setSaveStatus('Menyimpan perubahan...');
    try {
      const existing = userShiftsMap.get(dateStr);

      if (!shiftTypeId || shiftTypeId === 'LIBUR') {
        if (existing) {
          await DataService.deleteShift(existing.id);
        }
      } else {
        const st = PREDEFINED_SHIFT_TYPES.find((t) => t.id === shiftTypeId || t.code === shiftTypeId);
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

        // Get coworkers assigned to same shift on this date
        const assignedCoworkerIds = coworkers
          .filter((c) => coworkerAssignmentsMap.get(`${c.id}_${dateStr}`) === st.id)
          .map((c) => c.id);

        if (existing) {
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
            assignedCoworkerIds.length > 0 ? assignedCoworkerIds : existing.coworkers.map((c) => c.id),
            'Pembaruan melalui Matriks Jadwal'
          );
        } else {
          await DataService.createShift(
            {
              shiftDate: dateStr,
              shiftTypeId: st.id,
              startTime,
              endTime,
              location,
              status: 'scheduled',
              isConfirmed: true,
            },
            assignedCoworkerIds
          );
        }
      }

      onDataChanged();
      setSaveStatus('✓ Jadwal Anda berhasil diperbarui');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      console.error('Error assigning user shift:', e);
      setSaveStatus('Gagal menyimpan jadwal');
    } finally {
      setIsSaving(false);
      setCellPopover(null);
    }
  };

  // Assign shift to Coworker for a specific date
  const handleAssignCoworkerShift = async (coworkerId: string, dateStr: string, shiftTypeId: string | null) => {
    setIsSaving(true);
    setSaveStatus('Menyimpan perubahan rekan...');
    try {
      const finalTypeId = shiftTypeId === 'LIBUR' ? null : shiftTypeId;
      DataService.setCoworkerMatrixAssignment(coworkerId, dateStr, finalTypeId);
      setCoworkerAssignments(DataService.getCoworkerMatrixAssignments());

      // If user also has a shift on this date, update coworker assignment
      const userShift = userShiftsMap.get(dateStr);
      if (userShift && finalTypeId) {
        const isSameShift = userShift.shiftTypeId === finalTypeId;
        const currentCoworkerIds = userShift.coworkers.map((c) => c.id);
        if (isSameShift && !currentCoworkerIds.includes(coworkerId)) {
          await DataService.updateShift(
            userShift.id,
            {},
            [...currentCoworkerIds, coworkerId],
            'Sinkronisasi rekan matriks'
          );
        } else if (!isSameShift && currentCoworkerIds.includes(coworkerId)) {
          await DataService.updateShift(
            userShift.id,
            {},
            currentCoworkerIds.filter((id) => id !== coworkerId),
            'Sinkronisasi rekan matriks'
          );
        }
      }

      onDataChanged();
      setSaveStatus('✓ Jadwal rekan berhasil disimpan');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      console.error('Error assigning coworker shift:', e);
      setSaveStatus('Gagal menyimpan jadwal rekan');
    } finally {
      setIsSaving(false);
      setCellPopover(null);
    }
  };

  // Cell click handler
  const handleCellClick = (
    targetType: 'user' | 'coworker',
    dateStr: string,
    dayNum: number,
    coworkerId?: string,
    currentShiftTypeId?: string | null
  ) => {
    // If active brush is active, directly stamp the shift
    if (activeBrush) {
      if (targetType === 'user') {
        handleAssignUserShift(dateStr, activeBrush === 'LIBUR' ? null : activeBrush);
      } else if (coworkerId) {
        handleAssignCoworkerShift(coworkerId, dateStr, activeBrush === 'LIBUR' ? null : activeBrush);
      }
      return;
    }

    // Otherwise open cell popover
    setCellPopover({
      targetType,
      dateStr,
      dayNum,
      coworkerId,
      currentShiftTypeId,
    });
  };

  // Quick fill weekdays (Senin-Jumat) with Morning shift (Kuning) for User
  const handleAutoFillWeekdays = async () => {
    setIsSaving(true);
    setSaveStatus('Mengisi otomatis shift hari kerja...');
    try {
      const kuningType = PREDEFINED_SHIFT_TYPES.find((t) => t.code === 'KUNING') || PREDEFINED_SHIFT_TYPES[0];
      for (let day = 1; day <= daysInMonth; day++) {
        const mStr = String(viewMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateStr = `${viewYear}-${mStr}-${dStr}`;
        const dateObj = new Date(Date.UTC(viewYear, viewMonth, day, 12));
        const dayOfWeek = dateObj.getUTCDay(); // 1 = Monday, 5 = Friday

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const existing = userShiftsMap.get(dateStr);
          if (!existing) {
            await DataService.createShift(
              {
                shiftDate: dateStr,
                shiftTypeId: kuningType.id,
                startTime: '07:00',
                endTime: '14:30',
                location: 'Lab Patologi Klinik — Shift Pagi (Kuning)',
                status: 'scheduled',
                isConfirmed: true,
              },
              []
            );
          }
        }
      }
      onDataChanged();
      setSaveStatus('✓ Berhasil mengisi shift Senin–Jumat (Pagi)!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('Gagal mengisi otomatis');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all shifts for current month
  const handleClearMonthShifts = async () => {
    if (!window.confirm(`Yakin ingin mengosongkan seluruh shift Anda untuk bulan ${INDONESIAN_MONTH_NAMES[viewMonth]} ${viewYear}?`)) {
      return;
    }
    setIsSaving(true);
    try {
      const mPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      for (const [dateStr, shift] of userShiftsMap.entries()) {
        if (dateStr.startsWith(mPrefix)) {
          await DataService.deleteShift(shift.id);
        }
      }
      onDataChanged();
      setSaveStatus('✓ Jadwal bulan ini telah dikosongkan.');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new coworker directly from matrix
  const handleAddNewCoworker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoworkerName.trim()) return;

    try {
      await DataService.createCoworker({
        name: newCoworkerName.trim(),
        nickname: newCoworkerNickname.trim() || undefined,
        notes: newCoworkerRole.trim() || undefined,
      });
      setNewCoworkerName('');
      setNewCoworkerNickname('');
      setNewCoworkerRole('');
      setIsAddCoworkerOpen(false);
      onDataChanged();
      setSaveStatus('✓ Rekan baru berhasil ditambahkan');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      console.error('Failed to create coworker from matrix:', err);
    }
  };

  // Shift code renderer helper
  const renderShiftCellBadge = (shiftTypeId?: string | null) => {
    if (!shiftTypeId) {
      return (
        <span className="text-[10px] text-slate-300 font-normal select-none">
          –
        </span>
      );
    }

    const st = PREDEFINED_SHIFT_TYPES.find((t) => t.id === shiftTypeId || t.code === shiftTypeId);
    if (!st) {
      return (
        <span className="text-[10px] font-bold text-slate-400">
          ?
        </span>
      );
    }

    // Short symbol: K, B, U, A, H, P, S, M
    let shortCode = st.code.charAt(0);
    if (st.code === 'ABU_ABU') shortCode = 'A';
    if (st.code === 'SIANG') shortCode = 'S';
    if (st.code === 'MALAM') shortCode = 'M';
    if (st.code === 'KUNING') shortCode = 'K';
    if (st.code === 'BIRU') shortCode = 'B';
    if (st.code === 'UNGU') shortCode = 'U';
    if (st.code === 'HIJAU') shortCode = 'H';
    if (st.code === 'PINK') shortCode = 'P';

    return (
      <span
        className="w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center shadow-2xs border transition-transform hover:scale-110"
        style={{
          backgroundColor: st.colorHex + '35',
          color: st.colorHex === '#FFFFFF' ? '#475569' : st.colorHex,
          borderColor: st.colorHex,
        }}
        title={`${st.name} (${st.description})`}
      >
        {shortCode}
      </span>
    );
  };

  // Calculate monthly stats for a person
  const calculatePersonMonthlyStats = (isUser: boolean, coworkerId?: string) => {
    let pagiCount = 0;
    let siangCount = 0;
    let malamCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      let shiftTypeId: string | undefined | null;
      if (isUser) {
        shiftTypeId = userShiftsMap.get(dateStr)?.shiftTypeId;
      } else if (coworkerId) {
        shiftTypeId = coworkerAssignmentsMap.get(`${coworkerId}_${dateStr}`);
      }

      if (shiftTypeId) {
        const st = PREDEFINED_SHIFT_TYPES.find((t) => t.id === shiftTypeId || t.code === shiftTypeId);
        if (st) {
          if (st.code === 'SIANG') siangCount++;
          else if (st.code === 'MALAM') malamCount++;
          else pagiCount++;
        }
      }
    }

    return { pagiCount, siangCount, malamCount, total: pagiCount + siangCount + malamCount };
  };

  const containerContent = (
    <div className={`flex flex-col bg-white ${isFullPage ? 'rounded-2xl border border-slate-200 shadow-xs' : 'rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] border border-slate-200'} overflow-hidden`}>
      
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Matriks Jadwal Shift Laboratorium</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Interaktif & Otomatis Tersimpan
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Input jadwal bulanan Anda dan rekan-rekan ATLM secara cepat dalam tabel matriks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddCoworkerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Rekan</span>
          </button>

          {!isFullPage && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation & Shift Stamp Tool Palette */}
      <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-900 min-w-[150px] text-center">
            {INDONESIAN_MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Shift Stamp Brush Palette */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Kuas Shift Cepat:</span>
          </span>

          {PREDEFINED_SHIFT_TYPES.map((st) => {
            const isBrushActive = activeBrush === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveBrush(isBrushActive ? null : st.id)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isBrushActive
                    ? 'ring-2 ring-slate-900 shadow-xs scale-105 font-black'
                    : 'opacity-85 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  backgroundColor: st.colorHex + '25',
                  color: st.colorHex === '#FFFFFF' ? '#334155' : st.colorHex,
                  borderColor: st.colorHex,
                }}
                title={`Aktifkan kuas ${st.name} (${st.description}). Klik sel mana saja untuk menempel shift.`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.colorHex }} />
                <span>{st.code}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveBrush(activeBrush === 'LIBUR' ? null : 'LIBUR')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              activeBrush === 'LIBUR'
                ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-600 font-bold'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Kuas Kosongkan / Libur"
          >
            Libur / Hapus
          </button>

          {activeBrush && (
            <button
              type="button"
              onClick={() => setActiveBrush(null)}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer font-medium"
            >
              Lepas Kuas
            </button>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoFillWeekdays}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Isi hari Senin s.d. Jumat dengan Shift Pagi (Kuning)"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Isi Otomatis Senin-Jumat</span>
          </button>

          <button
            type="button"
            onClick={handleClearMonthShifts}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Kosongkan jadwal bulan ini"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Kosongkan Bulan</span>
          </button>
        </div>
      </div>

      {/* Save feedback indicator */}
      {saveStatus && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-1.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Roster Matrix Table View */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-100 min-w-[160px] font-bold border-r border-slate-200 shadow-xs">
                  Petugas ATLM
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(Date.UTC(viewYear, viewMonth, day, 12));
                  const mStr = String(viewMonth + 1).padStart(2, '0');
                  const dStr = String(day).padStart(2, '0');
                  const dateStr = `${viewYear}-${mStr}-${dStr}`;
                  const dayName = getIndonesianDayName(dateStr).slice(0, 3);
                  const isWeekend = dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6;
                  const isToday = dateStr === todayStr;

                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center min-w-[34px] border-r border-slate-200 ${
                        isToday
                          ? 'bg-amber-100 text-amber-900 font-black'
                          : isWeekend
                          ? 'bg-rose-50 text-rose-700 font-bold'
                          : 'text-slate-700 font-semibold'
                      }`}
                      title={`${day} ${INDONESIAN_MONTH_NAMES[viewMonth]} (${getIndonesianDayName(dateStr)})`}
                    >
                      <div className="text-[10px] uppercase opacity-75">{dayName}</div>
                      <div className="text-xs font-bold leading-none mt-0.5">{day}</div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 min-w-[120px] text-center font-bold text-slate-700">
                  Total Shift
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* ROW 1: USER (ANDA) */}
              <tr className="bg-amber-50/40 hover:bg-amber-50 transition-colors font-medium">
                <td className="py-2.5 px-3 sticky left-0 z-10 bg-amber-50/90 border-r border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'A'}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                        <span>{userProfile?.displayName || 'Anda (ATLM)'}</span>
                        <span className="text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded font-bold">
                          SAYA
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Petugas Utama
                      </div>
                    </div>
                  </div>
                </td>

                {/* Day cells for User */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const mStr = String(viewMonth + 1).padStart(2, '0');
                  const dStr = String(day).padStart(2, '0');
                  const dateStr = `${viewYear}-${mStr}-${dStr}`;
                  const currentShift = userShiftsMap.get(dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <td
                      key={dateStr}
                      onClick={() => handleCellClick('user', dateStr, day, undefined, currentShift?.shiftTypeId)}
                      className={`p-1 text-center border-r border-slate-100 cursor-pointer transition-colors hover:bg-teal-50 ${
                        isToday ? 'bg-amber-100/50' : ''
                      }`}
                      title={`Klik untuk mengatur shift Anda pada ${dateStr}`}
                    >
                      <div className="flex items-center justify-center">
                        {renderShiftCellBadge(currentShift?.shiftTypeId)}
                      </div>
                    </td>
                  );
                })}

                {/* Monthly stats for User */}
                <td className="py-2 px-2 text-center text-slate-700 border-l border-slate-200">
                  {(() => {
                    const stats = calculatePersonMonthlyStats(true);
                    return (
                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                        <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200" title="Shift Pagi">
                          P:{stats.pagiCount}
                        </span>
                        <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200" title="Shift Siang">
                          S:{stats.siangCount}
                        </span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title="Shift Malam">
                          M:{stats.malamCount}
                        </span>
                        <span className="font-black text-slate-900 ml-0.5" title="Total Seluruh Shift">
                          ({stats.total})
                        </span>
                      </div>
                    );
                  })()}
                </td>
              </tr>

              {/* ROWS 2+: COWORKERS */}
              {coworkers.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 2}
                    className="py-8 text-center text-xs text-slate-400 bg-slate-50/50"
                  >
                    Belum ada rekan ATLM ditambahkan. Klik tombol <strong>"+ Tambah Rekan"</strong> di atas untuk menambahkan kolega laboratorium Anda.
                  </td>
                </tr>
              ) : (
                coworkers.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {(c.nickname || c.name).charAt(0)}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {c.nickname ? `Panggilan: ${c.nickname}` : (c.notes || 'Rekan ATLM')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day cells for Coworker */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const mStr = String(viewMonth + 1).padStart(2, '0');
                        const dStr = String(day).padStart(2, '0');
                        const dateStr = `${viewYear}-${mStr}-${dStr}`;
                        const shiftTypeId = coworkerAssignmentsMap.get(`${c.id}_${dateStr}`);
                        const isToday = dateStr === todayStr;

                        return (
                          <td
                            key={dateStr}
                            onClick={() => handleCellClick('coworker', dateStr, day, c.id, shiftTypeId)}
                            className={`p-1 text-center border-r border-slate-100 cursor-pointer transition-colors hover:bg-teal-50 ${
                              isToday ? 'bg-amber-50/40' : ''
                            }`}
                            title={`Klik untuk mengatur shift ${c.name} pada ${dateStr}`}
                          >
                            <div className="flex items-center justify-center">
                              {renderShiftCellBadge(shiftTypeId)}
                            </div>
                          </td>
                        );
                      })}

                      {/* Monthly stats for Coworker */}
                      <td className="py-2 px-2 text-center text-slate-700 border-l border-slate-200">
                        {(() => {
                          const stats = calculatePersonMonthlyStats(false, c.id);
                          return (
                            <div className="flex items-center justify-center gap-1.5 text-[10px]">
                              <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200" title="Shift Pagi">
                                P:{stats.pagiCount}
                              </span>
                              <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200" title="Shift Siang">
                                S:{stats.siangCount}
                              </span>
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title="Shift Malam">
                                M:{stats.malamCount}
                              </span>
                              <span className="font-black text-slate-900 ml-0.5" title="Total Seluruh Shift">
                                ({stats.total})
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend / Key below matrix */}
        <div className="mt-4 p-3.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700">Keterangan Shift:</span>
            {PREDEFINED_SHIFT_TYPES.map((st) => (
              <div key={st.id} className="flex items-center gap-1">
                <span
                  className="w-3.5 h-3.5 rounded border text-[9px] font-black flex items-center justify-center"
                  style={{
                    backgroundColor: st.colorHex + '30',
                    color: st.colorHex === '#FFFFFF' ? '#334155' : st.colorHex,
                    borderColor: st.colorHex,
                  }}
                >
                  {st.code.charAt(0)}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {st.name} ({st.code})
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Tips: Pilih "Kuas Shift Cepat" di atas untuk menempel shift hanya dengan sekali klik ke banyak sel.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Setiap perubahan shift dan rekan tersimpan secara otomatis dan aman ke penyimpanan aplikasi.</span>
        </p>

        {!isFullPage && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            Selesai
          </button>
        )}
      </div>

      {/* CELL QUICK PICKER POPOVER */}
      {cellPopover && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pilih Shift: Tanggal {cellPopover.dayNum} {INDONESIAN_MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <p className="text-xs text-slate-500">
                  Untuk: {cellPopover.targetType === 'user' ? 'Anda (ATLM)' : (coworkers.find((c) => c.id === cellPopover.coworkerId)?.name || 'Rekan')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCellPopover(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_SHIFT_TYPES.map((st) => {
                const isSelected = cellPopover.currentShiftTypeId === st.id || cellPopover.currentShiftTypeId === st.code;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      if (cellPopover.targetType === 'user') {
                        handleAssignUserShift(cellPopover.dateStr, st.id);
                      } else if (cellPopover.coworkerId) {
                        handleAssignCoworkerShift(cellPopover.coworkerId, cellPopover.dateStr, st.id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'ring-2 ring-slate-900 font-bold shadow-xs'
                        : 'hover:scale-102 hover:border-slate-300'
                    }`}
                    style={{
                      backgroundColor: st.colorHex + '25',
                      borderColor: st.colorHex,
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold" style={{ color: st.colorHex === '#FFFFFF' ? '#1e293b' : st.colorHex }}>
                        {st.name}
                      </div>
                      <div className="text-[10px] text-slate-600 line-clamp-1">
                        {st.description}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (cellPopover.targetType === 'user') {
                    handleAssignUserShift(cellPopover.dateStr, null);
                  } else if (cellPopover.coworkerId) {
                    handleAssignCoworkerShift(cellPopover.coworkerId, cellPopover.dateStr, null);
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Libur / Kosongkan</span>
              </button>

              <button
                type="button"
                onClick={() => setCellPopover(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COWORKER MODAL FROM MATRIX */}
      {isAddCoworkerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Tambah Rekan Laboratorium Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCoworkerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCoworker} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  value={newCoworkerName}
                  onChange={(e) => setNewCoworkerName(e.target.value)}
                  placeholder="Contoh: Rina Melati, A.Md.AK"
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Panggilan / Sapaan
                </label>
                <input
                  type="text"
                  value={newCoworkerNickname}
                  onChange={(e) => setNewCoworkerNickname(e.target.value)}
                  placeholder="Contoh: Rina"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bidang Pemeriksaan / Catatan
                </label>
                <input
                  type="text"
                  value={newCoworkerRole}
                  onChange={(e) => setNewCoworkerRole(e.target.value)}
                  placeholder="Contoh: Petugas Hematologi & BDRS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCoworkerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Simpan & Tambahkan ke Matriks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  if (isFullPage) {
    return containerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      {containerContent}
    </div>
  );
};
