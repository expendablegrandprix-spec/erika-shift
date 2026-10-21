/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Check,
  CheckCircle2,
  Search,
  Plus,
} from 'lucide-react';
import type { ShiftWithDetails, ShiftType, Coworker, ConflictIssue } from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES, PREDEFINED_TASKS_BY_CODE } from '../lib/constants.ts';
import { getPontianakDateString, formatIndonesianDate, formatIndonesianFullDate } from '../lib/dateUtils.ts';
import { checkPairConflict } from '../lib/conflictDetection.ts';
import { DataService } from '../services/dataService.ts';

interface Props {
  initialDate?: string;
  editShiftId?: string | null;
  existingShifts: ShiftWithDetails[];
  coworkers: Coworker[];
  onSaved: () => void;
  onCancel: () => void;
  onQuickAddCoworker: (name: string) => Promise<Coworker>;
}

export const ShiftFormPage: React.FC<Props> = ({
  initialDate,
  editShiftId,
  existingShifts,
  coworkers,
  onSaved,
  onCancel,
  onQuickAddCoworker,
}) => {
  const isEditing = Boolean(editShiftId);
  const editingShift = isEditing ? existingShifts.find((s) => s.id === editShiftId) : null;

  // Form states
  const [shiftDate, setShiftDate] = useState<string>(
    editingShift?.shiftDate || initialDate || getPontianakDateString()
  );
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState<string>(
    editingShift?.shiftTypeId || PREDEFINED_SHIFT_TYPES[0].id
  );
  const [startTime, setStartTime] = useState<string>(editingShift?.startTime || '07:00');
  const [endTime, setEndTime] = useState<string>(editingShift?.endTime || '14:00');
  const [location, setLocation] = useState<string>(
    editingShift?.location || 'Lab Patologi Klinik RSUD SSMA'
  );
  const [selectedCoworkerIds, setSelectedCoworkerIds] = useState<string[]>(
    editingShift?.coworkers.map((c) => c.id) || []
  );
  const [notes, setNotes] = useState<string>(editingShift?.notes || '');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(
    editingShift ? editingShift.isConfirmed : true
  );

  // Change reason (for edit)
  const [changeReason, setChangeReason] = useState<string>('');

  // UI helpers
  const [coworkerSearch, setCoworkerSearch] = useState('');
  const [newCoworkerName, setNewCoworkerName] = useState('');
  const [showAddCoworker, setShowAddCoworker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Selected shift type metadata
  const selectedType =
    PREDEFINED_SHIFT_TYPES.find((st) => st.id === selectedShiftTypeId) || PREDEFINED_SHIFT_TYPES[0];
  const associatedTasks = PREDEFINED_TASKS_BY_CODE[selectedType.code] || [];

  const isMorningShift = selectedType.code !== 'SIANG' && selectedType.code !== 'MALAM';
  const currentCategory = selectedType.code === 'SIANG' ? 'siang' : selectedType.code === 'MALAM' ? 'malam' : 'pagi';

  const handleCategorySelect = (category: 'pagi' | 'siang' | 'malam') => {
    if (category === 'pagi') {
      setStartTime('07:00');
      setEndTime('14:30');
      if (!isMorningShift) {
        // default to first morning color (Kuning)
        const kuningType = PREDEFINED_SHIFT_TYPES.find((st) => st.code === 'KUNING');
        if (kuningType) setSelectedShiftTypeId(kuningType.id);
        setLocation('Lab Patologi Klinik RSUD SSMA');
      }
    } else if (category === 'siang') {
      setStartTime('14:00');
      setEndTime('21:30');
      const siangType = PREDEFINED_SHIFT_TYPES.find((st) => st.code === 'SIANG');
      if (siangType) {
        setSelectedShiftTypeId(siangType.id);
        setLocation('Lab Patologi Klinik — Shift Siang');
      }
    } else if (category === 'malam') {
      setStartTime('21:00');
      setEndTime('07:00');
      const malamType = PREDEFINED_SHIFT_TYPES.find((st) => st.code === 'MALAM');
      if (malamType) {
        setSelectedShiftTypeId(malamType.id);
        setLocation('Lab Patologi Klinik — Shift Malam');
      }
    }
  };

  // Update location default when shift type changes in create mode
  const handleShiftTypeSelect = (type: ShiftType) => {
    setSelectedShiftTypeId(type.id);
    if (!isEditing || !location) {
      setLocation(`Lab Patologi Klinik — ${type.description}`);
    }
  };

  // Real-time conflict preview
  const draftShift = {
    id: editShiftId || 'draft-shift',
    userId: 'current-user',
    shiftDate,
    shiftTypeId: selectedShiftTypeId,
    startTime,
    endTime,
    status: 'scheduled' as const,
    isConfirmed,
  };

  const detectedDraftConflicts: ConflictIssue[] = [];
  existingShifts.forEach((s) => {
    if (s.id === editShiftId) return; // don't compare with self
    const issue = checkPairConflict(draftShift, s);
    if (issue) detectedDraftConflicts.push(issue);
  });

  const handleToggleCoworker = (id: string) => {
    setSelectedCoworkerIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const handleCreateCoworkerQuick = async () => {
    if (!newCoworkerName.trim()) return;
    try {
      const created = await onQuickAddCoworker(newCoworkerName.trim());
      setSelectedCoworkerIds((prev) => [...prev, created.id]);
      setNewCoworkerName('');
      setShowAddCoworker(false);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!shiftDate) {
      setErrorMsg('Tanggal shift harus dipilih.');
      return;
    }
    if (!selectedShiftTypeId) {
      setErrorMsg('Pilih salah satu dari 6 warna shift resmi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editShiftId) {
        await DataService.updateShift(
          editShiftId,
          {
            shiftDate,
            shiftTypeId: selectedShiftTypeId,
            startTime,
            endTime,
            location,
            notes,
            isConfirmed,
          },
          selectedCoworkerIds,
          changeReason || 'Pembaruan jadwal shift melalui formulir'
        );
      } else {
        await DataService.createShift(
          {
            shiftDate,
            shiftTypeId: selectedShiftTypeId,
            startTime,
            endTime,
            location,
            notes,
            status: 'scheduled',
            isConfirmed,
          },
          selectedCoworkerIds
        );
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jadwal.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancelShift = async () => {
    if (!editShiftId) return;
    setIsSubmitting(true);
    try {
      await DataService.cancelShift(
        editShiftId,
        changeReason || 'Pembatalan shift atas permintaan pengguna'
      );
      setShowCancelModal(false);
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan shift.';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  const filteredCoworkers = coworkers.filter(
    (c) =>
      c.isActive &&
      (c.name.toLowerCase().includes(coworkerSearch.toLowerCase()) ||
        (c.nickname && c.nickname.toLowerCase().includes(coworkerSearch.toLowerCase())))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <h1 className="text-lg font-bold text-slate-900">
          {isEditing ? 'Ubah Jadwal Shift' : 'Tambah Jadwal Shift Baru'}
        </h1>

        {isEditing && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Batalkan Shift</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
          {errorMsg}
        </div>
      )}

      {/* Real-time Conflict Alert Preview */}
      {detectedDraftConflicts.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Peringatan Potensi Konflik Terdeteksi:</span>
          </div>
          {detectedDraftConflicts.map((c, i) => (
            <p key={i} className="text-amber-800">
              • {c.message}: {c.details}
            </p>
          ))}
          <p className="text-[11px] text-amber-700 pt-1">
            Anda tetap dapat menyimpan jika jadwal bertumpuk ini memang disengaja (misal shift ganda atau lembur).
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: SHIFT DATE & COLOR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Shift (WIB / Asia/Pontianak) *
            </label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              required
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              {formatIndonesianFullDate(shiftDate)}
            </p>
          </div>

          {/* Shift Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kategori Shift *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleCategorySelect('pagi')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                  currentCategory === 'pagi'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>Shift Pagi</div>
                <div className="text-[10px] font-normal opacity-80 mt-0.5">07.00 - 14.30</div>
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('siang')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                  currentCategory === 'siang'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>Shift Siang</div>
                <div className="text-[10px] font-normal opacity-80 mt-0.5">14.00 - 21.30</div>
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('malam')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                  currentCategory === 'malam'
                    ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>Shift Malam</div>
                <div className="text-[10px] font-normal opacity-80 mt-0.5">21.00 - 07.00</div>
              </button>
            </div>
          </div>

          {/* Color Rule (Applies to Morning Shift Only) */}
          {currentCategory === 'pagi' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih 1 dari 6 Warna Shift Pagi (Aturan Warna Berlaku) *
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PREDEFINED_SHIFT_TYPES.filter((st) => st.code !== 'SIANG' && st.code !== 'MALAM').map((st) => {
                  const isSelected = selectedShiftTypeId === st.id;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleShiftTypeSelect(st)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900/10 bg-slate-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: st.colorHex }}
                        />
                        {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                      </div>

                      <div className="mt-2">
                        <div className="text-xs font-bold text-slate-950 uppercase">{st.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {st.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
              <span className="font-bold">Informasi:</span> Aturan warna shift resmi hanya berlaku untuk <strong className="font-bold">Shift Pagi</strong>. Untuk <strong className="font-bold">Shift {currentCategory === 'siang' ? 'Siang' : 'Malam'}</strong>, aturan warna shift tidak digunakan. Jam kerja dapat diatur secara bebas di bawah ini.
            </div>
          )}

          {/* Task preview for selected shift type */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-700 block mb-1">
              Tugas & Prosedur Terkait Shift {selectedType.name}:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {associatedTasks.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: HOURS & LOCATION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Mulai (24 Jam)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Selesai (24 Jam)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jika jam selesai lebih kecil (cth. 21.00 - 07.00), shift dihitung melewati tengah malam.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ruang / Bagian Laboratorium
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Lab Patologi Klinik - Ruang Kimia Darah"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* SECTION 3: COWORKERS ASSIGNED */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Rekan Shift Bersama ({selectedCoworkerIds.length} Dipilih)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Tandai rekan ATLM yang bertugas pada shift yang sama.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCoworker(!showAddCoworker)}
              className="text-xs font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekan Baru</span>
            </button>
          </div>

          {/* Quick add coworker form */}
          {showAddCoworker && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-2">
              <input
                type="text"
                value={newCoworkerName}
                onChange={(e) => setNewCoworkerName(e.target.value)}
                placeholder="Nama rekan baru (cth. Budi Santoso, A.Md.AK)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleCreateCoworkerQuick}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Simpan Rekan
              </button>
            </div>
          )}

          {/* Search coworkers */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={coworkerSearch}
              onChange={(e) => setCoworkerSearch(e.target.value)}
              placeholder="Cari nama rekan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {filteredCoworkers.map((c) => {
              const isChecked = selectedCoworkerIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleToggleCoworker(c.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {(c.nickname || c.name).charAt(0)}
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-xs font-semibold truncate">{c.name}</div>
                    {c.nickname && (
                      <div className={`text-[10px] ${isChecked ? 'text-slate-300' : 'text-slate-400'}`}>
                        Panggilan: {c.nickname}
                      </div>
                    )}
                  </div>
                  {isChecked && <Check className="w-4 h-4 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: NOTES & CONFIRMATION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Pribadi untuk Shift Ini
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Reagen glukosa menipis, konfirmasi ke koordinator jam 10..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Edit change reason */}
          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alasan Perubahan Jadwal (Tercatat di Riwayat Perubahan)
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Contoh: Tukar shift dengan Siti karena izin dinas luar"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}

          {/* Confirmation switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Status Kepastian Jadwal
              </span>
              <p className="text-xs text-slate-500">
                Tandai terkonfirmasi jika jadwal sudah final dan disetujui rekan/atasan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsConfirmed(!isConfirmed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isConfirmed
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {isConfirmed ? 'Terkonfirmasi' : 'Perlu Konfirmasi'}
            </button>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Jadwal Shift'}</span>
          </button>
        </div>
      </form>

      {/* CANCEL SHIFT CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Batalkan Jadwal Shift?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin membatalkan shift pada tanggal <strong>{formatIndonesianDate(shiftDate)}</strong>?
              Riwayat pembatalan akan dicatat ke dalam log perubahan jadwal dan tidak dihapus secara diam-diam.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alasan Pembatalan:
              </label>
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Contoh: Sakit, pergantian jadwal mendadak..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelShift}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Batalkan Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
