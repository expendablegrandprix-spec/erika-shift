/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Database,
  Download,
  Upload,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Smartphone,
  LogOut,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { UserProfile, ReminderSetting } from '../types/index.ts';
import { isSupabaseConfigured } from '../lib/supabase.ts';
import { DataService } from '../services/dataService.ts';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';

interface Props {
  profile: UserProfile;
  reminders: ReminderSetting;
  onRefresh: () => void;
  onOpenOnboarding: () => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  profile,
  reminders,
  onRefresh,
  onOpenOnboarding,
  onLogout,
}) => {
  // Profile form
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [workUnit, setWorkUnit] = useState(profile.workUnit);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState(false);

  // Reminder form
  const [reminderEnabled, setReminderEnabled] = useState(reminders.enabled);
  const [dayBeforeEnabled, setDayBeforeEnabled] = useState(reminders.dayBeforeEnabled);
  const [dayBeforeTime, setDayBeforeTime] = useState(reminders.dayBeforeTime || '20:00');
  const [minutesBeforeShift, setMinutesBeforeShift] = useState(reminders.minutesBeforeShift || 60);
  const [browserNotifications, setBrowserNotifications] = useState(
    reminders.browserNotificationsEnabled
  );
  const [remindersSaved, setRemindersSaved] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Backup & Restore
  const [restoreJson, setRestoreJson] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  // Compress image to ensure lightweight storage and instant cross-browser loading
  const compressImage = (file: File, maxWidth = 480, maxHeight = 480, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('Ukuran file foto maksimal 8MB.');
        return;
      }
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 480, 480, 0.85);
        setPhotoUrl(compressed);
      } catch (err) {
        console.error('Compress image failed:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await DataService.updateProfile({
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim(),
        workUnit: workUnit.trim(),
        photoUrl,
      });
      setProfileSaved(true);
      setCloudSyncSuccess(isSupabaseConfigured);
      setTimeout(() => {
        setProfileSaved(false);
        setCloudSyncSuccess(false);
      }, 4000);
      onRefresh();
    } catch (err) {
      console.error('Save profile failed:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.updateReminderSettings({
      enabled: reminderEnabled,
      dayBeforeEnabled,
      dayBeforeTime,
      minutesBeforeShift: Number(minutesBeforeShift),
      browserNotificationsEnabled: browserNotifications,
    });
    setRemindersSaved(true);
    setTimeout(() => setRemindersSaved(false), 2500);
    onRefresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword || newPassword.length < 5) {
      setPasswordMsg({ success: false, text: 'Kata sandi baru minimal 5 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ success: false, text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    const currentEmail = localStorage.getItem('labshift_user_email') || '';
    if (currentEmail) {
      try {
        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail, newPassword }),
        });
      } catch (err) {
        console.warn('Reset password error:', err);
      }
    }

    localStorage.setItem('labshift_user_pass', newPassword);
    setPasswordMsg({ success: true, text: 'Kata sandi berhasil direset dan diperbarui!' });
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMsg(null), 3500);
  };

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Peramban Anda tidak mendukung web notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotifications(true);
      new Notification('LabShift Personal', {
        body: 'Notifikasi pengingat shift berhasil diaktifkan!',
      });
    } else {
      setBrowserNotifications(false);
    }
  };

  // Export handlers
  const handleExportCsv = async (type: 'shifts' | 'changes' | 'coworkers') => {
    const csvContent = await DataService.exportToCsv(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `labshift_${type}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = async () => {
    const jsonStr = await DataService.exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `labshift_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportIcs = async () => {
    const ics = await DataService.exportToIcs();
    const { downloadIcsFile } = await import('../lib/icsExport.ts');
    downloadIcsFile(ics, `jadwal_shift_atlm_${new Date().toISOString().slice(0, 10)}.ics`);
  };

  const handleRestore = async () => {
    if (!restoreJson.trim()) return;
    if (confirm('Pulihkan data dari teks JSON ini? Data lokal yang ada akan diperbarui.')) {
      const res = await DataService.restoreBackupJson(restoreJson);
      setRestoreStatus(res.message);
      if (res.success) {
        setRestoreJson('');
        onRefresh();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Konfigurasi, Akun & Cadangan Data
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Aplikasi
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan (Onboarding)</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>

      {/* 1. PROFIL ATLM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-slate-600" />
          <span>Profil Pengguna ATLM</span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {/* Photo Upload Section */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
              Foto Profil (Avatar)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-lg">
                    {displayName ? displayName.slice(0, 2).toUpperCase() : 'AT'}
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Format JPG, PNG atau WebP. Maksimal 2MB. Akan ditampilkan di dashboard utama.
                </p>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                  >
                    Hapus Foto Profil
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Lengkap & Gelar ATLM *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jabatan / Profesi *
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Unit Kerja / Instalasi RS *
            </label>
            <input
              type="text"
              required
              value={workUnit}
              onChange={(e) => setWorkUnit(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              {profileSaved && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {cloudSyncSuccess
                      ? 'Foto & profil tersimpan di Supabase Cloud (tersinkronisasi di semua browser)!'
                      : 'Profil berhasil disimpan ke peramban!'}
                  </span>
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSavingProfile || isCompressing}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <span>Simpan Profil & Foto</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. KEAMANAN & RESET KATA SANDI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-2 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-slate-600" />
          <span>Keamanan Akun & Pengubahan Kata Sandi</span>
        </div>

        <p className="text-xs text-slate-600">
          Ubah kata sandi akun Anda secara berkala untuk menjaga keamanan data jadwal shift pribadi.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                passwordMsg.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {passwordMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={5}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 5 karakter"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={5}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi sandi baru"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs transition-colors"
            >
              Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </div>

      {/* 3. PENGINGAT (REMINDERS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-2 border-b border-slate-100">
          <Bell className="w-4 h-4 text-slate-600" />
          <span>Pengaturan Pengingat Shift</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            <strong>Catatan Keterbatasan Teknis:</strong> Pengingat peramban (browser) beroperasi selama tab web LabShift aktif atau dibuka.
          </p>
        </div>

        <form onSubmit={handleSaveReminders} className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block">Pengingat H-1 (Sehari Sebelum Shift)</span>
              <p className="text-slate-500">Notifikasi persiapan alat dan tugas lab esok hari.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={dayBeforeTime}
                onChange={(e) => setDayBeforeTime(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 text-slate-900 text-xs"
              />
              <input
                type="checkbox"
                checked={dayBeforeEnabled}
                onChange={(e) => setDayBeforeEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block">Pengingat Menjelang Mulai Shift</span>
              <p className="text-slate-500">Waktu jeda sebelum shift aktif dimulai.</p>
            </div>
            <select
              value={minutesBeforeShift}
              onChange={(e) => setMinutesBeforeShift(Number(e.target.value))}
              className="px-3 py-1 rounded-lg border border-slate-300 text-slate-900 text-xs bg-white"
            >
              <option value={30}>30 menit sebelumnya</option>
              <option value={60}>60 menit sebelumnya</option>
              <option value={90}>90 menit sebelumnya</option>
              <option value={120}>2 jam sebelumnya</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block">Izin Notifikasi Peramban (Browser)</span>
              <p className="text-slate-500">Tampilkan banner notifikasi pop-up sistem.</p>
            </div>
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                browserNotifications
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {browserNotifications ? 'Diizinkan (Aktif)' : 'Minta Izin Notifikasi'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            {remindersSaved && (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Preferensi pengingat disimpan!
              </span>
            )}
            <button
              type="submit"
              className="ml-auto px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
            >
              Simpan Pengingat
            </button>
          </div>
        </form>
      </div>

      {/* 4. DATABASE & SUPABASE INTEGRATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Database className="w-4 h-4 text-slate-600" />
            <span>Penyimpanan Data & Sinkronisasi Realtime</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Live Sync Aktif</span>
            </span>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                isSupabaseConfigured
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isSupabaseConfigured ? 'Supabase Terhubung' : 'Penyimpanan Offline'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-3">
          <p>
            Aplikasi LabShift Personal terhubung dan tersinkronisasi secara <strong>Real-time</strong> ke database Supabase PostgreSQL. Setiap perubahan jadwal dinas, penambahan rekan, atau catatan akan langsung diperbarui secara instan.
          </p>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Bersihkan semua sisa data dummy/demo dari perangkat Anda?')) {
                  DataService.clearAllDummyData();
                  onRefresh();
                  alert('Seluruh data dummy berhasil dibersihkan.');
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              🧹 Bersihkan Sisa Data Dummy
            </button>
          </div>
        </div>
      </div>

      {/* 5. PROGRESSIVE WEB APP (PWA) & INSTALASI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Smartphone className="w-4 h-4 text-slate-600" />
            <span>Progressive Web App (PWA) & Akses Offline</span>
          </div>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E3AFC9]/30 text-slate-800 border border-[#E3AFC9]/50">
            PWA Aktif
          </span>
        </div>

        <div className="text-xs text-slate-600 space-y-3">
          <p>
            LabShift Personal dikonfigurasi sebagai <strong>Progressive Web App (PWA)</strong> dengan dukungan penuh offline.
          </p>
          <PWAInstallButton variant="full" />
        </div>
      </div>

      {/* 6. EKSPOR & CADANGAN DATA (CSV & JSON) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base pb-2 border-b border-slate-100">
          <Download className="w-4 h-4 text-slate-600" />
          <span>Ekspor & Cadangan Data Pribadi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={() => handleExportCsv('shifts')}
            className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors cursor-pointer"
          >
            <span className="font-bold text-slate-900 block">Ekspor Shift (CSV)</span>
            <span className="text-slate-500 text-[11px] mt-0.5 block">
              Daftar seluruh jadwal shift
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleExportCsv('changes')}
            className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors cursor-pointer"
          >
            <span className="font-bold text-slate-900 block">Ekspor Riwayat (CSV)</span>
            <span className="text-slate-500 text-[11px] mt-0.5 block">
              Audit log pergantian & rolling shift
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleExportCsv('coworkers')}
            className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors cursor-pointer"
          >
            <span className="font-bold text-slate-900 block">Ekspor Rekan (CSV)</span>
            <span className="text-slate-500 text-[11px] mt-0.5 block">
              Daftar kontak rekan analis lab
            </span>
          </button>
        </div>

        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportIcs}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Kalender (.ics)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Cadangan Lengkap (JSON)</span>
          </button>
        </div>

        {/* Restore section */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Pulihkan dari Cadangan JSON
          </span>
          <textarea
            rows={2}
            value={restoreJson}
            onChange={(e) => setRestoreJson(e.target.value)}
            placeholder="Tempel teks JSON cadangan di sini..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          {restoreStatus && (
            <p className="text-xs text-indigo-700 font-semibold">{restoreStatus}</p>
          )}
          <button
            type="button"
            onClick={handleRestore}
            disabled={!restoreJson.trim()}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Pulihkan Data
          </button>
        </div>
      </div>

      {/* 6.5. HAPUS SELURUH DATA PERMANEN */}
      <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Hapus Seluruh Data Aplikasi & Database</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Menghapus secara permanen seluruh jadwal shift, daftar rekan, matrik, dan catatan baik dari aplikasi maupun database server.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (
              confirm(
                'PERHATIAN: Apakah Anda yakin ingin MENGHAPUS SELURUH DATA secara PERMANEN? Semua jadwal shift, daftar rekan, matrik, dan catatan akan terhapus dari aplikasi dan server database!'
              )
            ) {
              await DataService.clearAllData();
              onRefresh();
              alert('Seluruh data berhasil dihapus secara permanen dari aplikasi dan server database.');
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hapus Semua Data</span>
        </button>
      </div>

      {/* 7. KELUAR AKUN (LOGOUT CARD) */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sesi Masuk Saat Ini</span>
          </h4>
          <p className="text-xs text-rose-700/80 mt-0.5">
            Keluar dari aplikasi jika Anda menggunakan perangkat bersama (shared device) demi keamanan data ATLM.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </div>
  );
};
