/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Users,
  Clock,
  Bell,
  MessageSquare,
  ArrowRight,
  X,
} from 'lucide-react';
import { PREDEFINED_SHIFT_TYPES, APP_METADATA } from '../lib/constants.ts';
import { ShiftColorBadge } from './ShiftColorBadge.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  onUpdateDisplayName: (name: string) => void;
}

export const OnboardingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  displayName,
  onUpdateDisplayName,
}) => {
  const [step, setStep] = useState(1);
  const [tempName, setTempName] = useState(displayName);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && tempName.trim()) {
      onUpdateDisplayName(tempName.trim());
    }
    if (step < 7) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        {/* Step indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <img
              src={APP_METADATA.localSealPath}
              alt="Pontianak Seal"
              className="w-6 h-6 object-contain"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Panduan Awal LabShift Personal · Langkah {step} dari 7
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Konfirmasi Nama ATLM */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Selamat Datang di LabShift Personal
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aplikasi pendukung produktivitas pribadi untuk Ahli Teknologi Laboratorium Medik (ATLM) di <strong>{APP_METADATA.hospital}</strong>. Konfirmasikan nama tampilan Anda:
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Lengkap & Gelar Anda
              </label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Enam Warna Shift Resmi */}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              6 Warna Shift Resmi Laboratorium
            </h2>
            <p className="text-xs text-slate-600">
              Setiap warna mewakili penugasan ruang dan jenis pemeriksaan klinis:
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {PREDEFINED_SHIFT_TYPES.map((st) => (
                <div
                  key={st.id}
                  className="p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <ShiftColorBadge shiftType={st} size="sm" />
                  <span className="text-slate-600 text-[11px] truncate">{st.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Rekan Shift */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Pencatatan Rekan Dinas
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda dapat mencatat daftar rekan kerja di menu <strong>Rekan</strong> untuk memudahkan mengingat siapa yang bertugas bersama di setiap shift laboratorium, tanpa mengharuskan rekan memiliki akun terpisah.
            </p>
          </div>
        )}

        {/* STEP 4: Jam Kerja Akurat */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Entri Jam Shift Sesuai Jadwal Nyata
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Masukkan jam mulai dan jam selesai sesuai dinas nyata (misal 07:00-14:00 atau dinas malam 21:00-07:00). Sistem otomatis mendeteksi shift yang melewati tengah malam serta mendeteksi bentrok jadwal waktu secara cerdas.
            </p>
          </div>
        )}

        {/* STEP 5: Keterbatasan Pengingat */}
        {step === 5 && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Transparansi Sistem Pengingat
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pengingat browser berjalan saat tab web aktif. Karena aplikasi ini merupakan web app pribadi, pengingat saat browser ditutup penuh memerlukan push notification provider.
            </p>
          </div>
        )}

        {/* STEP 6: Tempel Chat WhatsApp */}
        {step === 6 && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Pencatat Perubahan dari Chat
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menerima pesan WhatsApp seperti: <em>"Besok kamu tukar sama Budi. Kamu masuk Biru jam 07.00 sampai 14.00."</em>?
              Cukup buka menu <strong>Tempel Chat AI</strong> untuk mengekstrak dan meninjau proposal sebelum diterapkan ke jadwal Anda.
            </p>
          </div>
        )}

        {/* STEP 7: Selesai */}
        {step === 7 && (
          <div className="space-y-3 text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Siap Digunakan!
            </h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              LabShift Personal siap menemani rutinitas dinas Anda di Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie Pontianak.
            </p>
          </div>
        )}

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Lewati Panduan
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{step === 7 ? 'Mulai Bekerja' : 'Lanjut'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
