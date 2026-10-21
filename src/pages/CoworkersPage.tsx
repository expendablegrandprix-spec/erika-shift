/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import type { Coworker, ShiftWithDetails } from '../types/index.ts';
import { formatIndonesianDate, getPontianakDateString } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';
import { DataService } from '../services/dataService.ts';

interface Props {
  coworkers: Coworker[];
  shifts: ShiftWithDetails[];
  onRefresh: () => void;
  onGoToShift: (shiftId: string) => void;
}

export const CoworkersPage: React.FC<Props> = ({
  coworkers,
  shifts,
  onRefresh,
  onGoToShift,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCoworkerId, setSelectedCoworkerId] = useState<string | null>(
    coworkers[0]?.id || null
  );

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoworker, setEditingCoworker] = useState<Coworker | null>(null);
  const [formName, setFormName] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const todayStr = getPontianakDateString();

  const handleOpenAdd = () => {
    setEditingCoworker(null);
    setFormName('');
    setFormNickname('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Coworker) => {
    setEditingCoworker(c);
    setFormName(c.name);
    setFormNickname(c.nickname || '');
    setFormNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCoworker) {
      await DataService.updateCoworker(editingCoworker.id, {
        name: formName.trim(),
        nickname: formNickname.trim(),
        notes: formNotes.trim(),
      });
    } else {
      const created = await DataService.createCoworker({
        name: formName.trim(),
        nickname: formNickname.trim(),
        notes: formNotes.trim(),
      });
      setSelectedCoworkerId(created.id);
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleToggleActive = async (c: Coworker) => {
    await DataService.updateCoworker(c.id, { isActive: !c.isActive });
    onRefresh();
  };

  const filtered = coworkers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.nickname && c.nickname.toLowerCase().includes(search.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedCoworker = coworkers.find((c) => c.id === selectedCoworkerId);

  // Upcoming shifts with selected coworker
  const shiftsWithCoworker = selectedCoworkerId
    ? shifts.filter(
        (s) =>
          s.status !== 'cancelled' &&
          s.coworkers.some((c) => c.id === selectedCoworkerId)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Daftar Kontak & Kolega ATLM
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Rekan Laboratorium Patologi Klinik
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Rekan</span>
        </button>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Coworker list */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari rekan berdasarkan nama atau spesialisasi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
            />
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                Tidak ada rekan ditemukan.
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === selectedCoworkerId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCoworkerId(c.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900/10'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {(c.nickname || c.name).charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-900 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {c.nickname ? `Panggilan: ${c.nickname}` : 'ATLM'}
                          {c.notes && ` · ${c.notes}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(c);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit kontak rekan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Coworker Details & Assigned Shifts */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          {selectedCoworker ? (
            <>
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FFDDDD] to-[#E3AFC9] text-slate-900 font-extrabold text-lg flex items-center justify-center shadow-xs">
                    {(selectedCoworker.nickname || selectedCoworker.name).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedCoworker.name}</h2>
                    <p className="text-xs text-slate-500">
                      {selectedCoworker.nickname ? `Panggilan akrab: "${selectedCoworker.nickname}"` : 'ATLM Patologi Klinik'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedCoworker)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Edit Data
                </button>
              </div>

              {selectedCoworker.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Catatan Khusus / Keahlian: </span>
                  {selectedCoworker.notes}
                </div>
              )}

              {/* Shifts with this coworker */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-600 block mb-2">
                  Jadwal Shift Bersama {selectedCoworker.nickname || selectedCoworker.name.split(' ')[0]} ({shiftsWithCoworker.length})
                </span>

                {shiftsWithCoworker.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Belum ada jadwal shift yang menugaskan rekan ini bersama Anda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {shiftsWithCoworker.map((s) => {
                      const isPast = s.shiftDate < todayStr;
                      return (
                        <div
                          key={s.id}
                          onClick={() => onGoToShift(s.id)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ShiftColorBadge shiftType={s.shiftType} size="sm" />
                              <span className="font-bold text-slate-900">
                                {formatIndonesianDate(s.shiftDate)}
                              </span>
                              {isPast && (
                                <span className="text-[10px] text-slate-400">· Telah lewat</span>
                              )}
                            </div>
                            <div className="text-slate-600 flex items-center gap-2">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{s.startTime || '07:00'} – {s.endTime || '14:00'} WIB</span>
                              <span>·</span>
                              <span className="truncate">{s.location || s.shiftType.description}</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {s.isConfirmed ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Terkonfirmasi
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Perlu Konfirmasi
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Pilih salah satu rekan di sebelah kiri untuk melihat rincian dan riwayat shift bersama.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD / EDIT COWORKER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingCoworker ? 'Edit Data Rekan' : 'Tambah Rekan Laboratorium Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, A.Md.AK"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Panggilan / Sapaan
                </label>
                <input
                  type="text"
                  value={formNickname}
                  onChange={(e) => setFormNickname(e.target.value)}
                  placeholder="Contoh: Budi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan / Bidang Pemeriksaan
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Spesialis Kimia Darah, Petugas BDRS, dll."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Simpan Rekan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
