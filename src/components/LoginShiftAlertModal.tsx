/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Clock, Users, ShieldCheck, CheckCircle2, Sparkles, X, MapPin } from 'lucide-react';
import type { ShiftWithDetails, Coworker } from '../types/index.ts';
import { formatIndonesianFullDate, getPontianakDateString } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from './ShiftColorBadge.tsx';

interface LoginShiftAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftWithDetails[];
  coworkers: Coworker[];
  displayName: string;
}

export const LoginShiftAlertModal: React.FC<LoginShiftAlertModalProps> = ({
  isOpen,
  onClose,
  shifts,
  coworkers,
  displayName,
}) => {
  if (!isOpen) return null;

  const today = getPontianakDateString();
  const todayShifts = shifts.filter((s) => s.shiftDate === today && s.status !== 'cancelled');

  // Find coworkers sharing the same shift or date
  const todayCoworkerNames = new Set<string>();
  todayShifts.forEach((s) => {
    if (s.coworkers && Array.isArray(s.coworkers)) {
      s.coworkers.forEach((c) => todayCoworkerNames.add(c.name));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-scaleUp">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-xs font-medium text-pink-200 w-fit mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#FFCED8]" />
            <span>Pemberitahuan Shift Hari Ini</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#FFCED8]">
            Selamat Bertugas, {displayName}! 👋
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {formatIndonesianFullDate(today)}
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5">
          {todayShifts.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Status Shift Anda Hari Ini
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Aktif Bertugas
                  </span>
                </div>

                {todayShifts.map((shift) => (
                  <div key={shift.id} className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShiftColorBadge shiftType={shift.shiftType} />
                        <span className="text-xs font-bold text-slate-800">
                          {shift.location || 'Laboratorium Patologi Klinik'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{shift.startTime || '07:00'} - {shift.endTime || '14:30'}</span>
                      </div>
                    </div>

                    {shift.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        Catatan: {shift.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Coworkers on duty */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Rkan 1 Shift / Rekan Tugas Hari Ini</span>
                </h4>
                {todayCoworkerNames.size > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(todayCoworkerNames).map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                    Tidak ada rekan tercatat pada shift hari ini, atau Anda bertugas mandiri.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Tidak Ada Jadwal Shift Hari Ini</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Anda tidak memiliki jadwal shift yang terjadwal untuk hari ini. Nikmati waktu istirahat atau tambahkan shift jika diperlukan.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mulai Beraktivitas di LabShift</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
