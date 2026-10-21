/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import type { ShiftWithDetails, UserProfile } from '../types/index.ts';
import { formatIndonesianFullDate, formatIndonesianDate, getPontianakDateString } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';
import { DataService } from '../services/dataService.ts';
import { generateSingleShiftIcs, downloadIcsFile } from '../lib/icsExport.ts';

interface Props {
  shifts: ShiftWithDetails[];
  profile: UserProfile;
  onAddShift: (date?: string) => void;
  onEditShift: (shiftId: string) => void;
  onRefresh: () => void;
}

export const MyShiftsPage: React.FC<Props> = ({
  shifts,
  profile,
  onAddShift,
  onEditShift,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts
      .filter((s) => {
        // Filter by month if selected
        if (selectedMonth && !s.shiftDate.startsWith(selectedMonth)) {
          return false;
        }
        // Filter by shift type
        if (filterType !== 'all') {
          if (filterType === 'morning') {
            if (!['KUNING', 'BIRU', 'HIJAU', 'PINK'].includes(s.shiftType.code)) return false;
          } else if (filterType === 'afternoon') {
            if (!['SIANG', 'UNGU', 'ABU_ABU'].includes(s.shiftType.code)) return false;
          } else if (filterType === 'night') {
            if (s.shiftType.code !== 'MALAM') return false;
          } else if (s.shiftType.code !== filterType) {
            return false;
          }
        }
        // Search query (location, notes, coworker names)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchLocation = s.location?.toLowerCase().includes(q) || false;
          const matchNotes = s.notes?.toLowerCase().includes(q) || false;
          const matchDate = s.shiftDate.includes(q);
          const matchCoworker = s.coworkers?.some((c) => c.name.toLowerCase().includes(q)) || false;
          if (!matchLocation && !matchNotes && !matchDate && !matchCoworker) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
  }, [shifts, selectedMonth, filterType, searchQuery]);

  // Calculate total hours for filtered shifts
  const totalHours = useMemo(() => {
    return filteredShifts.reduce((acc, s) => {
      if (s.status === 'cancelled') return acc;
      // Estimate hours from start and end time
      if (!s.startTime || !s.endTime) return acc + 8;
      try {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        let startMinutes = sh * 60 + sm;
        let endMinutes = eh * 60 + em;
        if (endMinutes <= startMinutes) {
          endMinutes += 24 * 60; // overnight
        }
        const diff = (endMinutes - startMinutes) / 60;
        return acc + (isNaN(diff) ? 8 : diff);
      } catch {
        return acc + 8;
      }
    }, 0);
  }, [filteredShifts]);

  const handleDelete = async (shiftId: string) => {
    try {
      await DataService.deleteShift(shiftId);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const handleExportAllIcs = () => {
    if (filteredShifts.length === 0) return;
    const icsContent = filteredShifts
      .map((s) => generateSingleShiftIcs(s))
      .join('\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daftar_Shift_Saya_${selectedMonth || 'Semua'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>Manajemen Jadwal Pribadi</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Shift Saya
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap jadwal dinas dan rekapitulasi shift Anda ({profile.displayName}).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAllIcs}
            disabled={filteredShifts.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Ekspor Kalender (.ics)</span>
          </button>
          <button
            type="button"
            onClick={() => onAddShift()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Shift Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
            📅
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Shift Terfilter</div>
            <div className="text-xl font-bold text-slate-900">{filteredShifts.length} Sesi</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ⏱️
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Estimasi Jam Kerja</div>
            <div className="text-xl font-bold text-slate-900">{totalHours.toFixed(1)} Jam</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-lg">
            🏥
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Unit Penempatan</div>
            <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={profile.workUnit}>
              {profile.workUnit || 'Patologi Klinik'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan ruangan, catatan, atau rekan..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Bulan:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
          >
            <option value="all">Semua Jenis Shift</option>
            <option value="morning">Shift Pagi</option>
            <option value="afternoon">Shift Siang</option>
            <option value="night">Shift Malam</option>
            <option value="off">Libur (Off)</option>
            <option value="leave">Cuti / Izin</option>
          </select>
        </div>
      </div>

      {/* Shifts List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredShifts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredShifts.map((shift) => (
              <div
                key={shift.id}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-14 text-center shrink-0 bg-slate-100 rounded-xl p-2 border border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-500">
                      {new Date(shift.shiftDate).toLocaleDateString('id-ID', { weekday: 'short' })}
                    </span>
                    <span className="block text-base font-extrabold text-slate-900">
                      {shift.shiftDate.split('-')[2]}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShiftColorBadge shiftType={shift.shiftType} />
                      <span className="text-xs font-bold text-slate-900">
                        {formatIndonesianFullDate(shift.shiftDate)}
                      </span>
                      {shift.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          Dibatalkan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {shift.startTime || '07:00'} - {shift.endTime || '14:30'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {shift.location || 'Laboratorium Patologi Klinik'}
                      </span>
                    </div>

                    {shift.coworkers && shift.coworkers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Rekan: {shift.coworkers.map((c) => c.name).join(', ')}</span>
                      </div>
                    )}

                    {shift.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-100/70 px-2.5 py-1 rounded-lg mt-1">
                        "{shift.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      const ics = generateSingleShiftIcs(shift);
                      downloadIcsFile(ics, `Shift_${shift.shiftDate}.ics`);
                    }}
                    title="Unduh ICS"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditShift(shift.id)}
                    title="Ubah Shift"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-indigo-50 text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(shift.id)}
                    title="Hapus Shift"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              📅
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada shift yang ditemukan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Coba ubah filter pencarian atau tambahkan jadwal shift baru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddShift()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Shift</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Shift Ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus jadwal shift dari daftar Anda.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
