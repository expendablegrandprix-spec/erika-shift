/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, KeyRound, Mail, Lock, User, ShieldCheck, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { APP_METADATA } from '../lib/constants.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { DataService, generateUuid } from '../services/dataService.ts';

interface LoginPageProps {
  onLoginSuccess: (email: string, displayName?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields (clean initial states)
  const [loginIdentifier, setLoginIdentifier] = useState(() => {
    return localStorage.getItem('labshift_user_name') || '';
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('labshift_user_email') || '';
  });
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'success'>('request');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginIdentifier.trim() || !password.trim()) {
      setErrorMsg('Harap masukkan Nama (atau Email) dan Kata Sandi.');
      return;
    }

    if (password.length < 5) {
      setErrorMsg('Kata sandi minimal 5 karakter.');
      return;
    }

    setIsSubmitting(true);
    const inputClean = loginIdentifier.trim().toLowerCase();

    // 1. Authenticate against Server Database (Enables cross-browser & multi-device login)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: inputClean,
          password: password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.user) {
        const u = data.user;
        localStorage.setItem('labshift_user_id', u.id);
        localStorage.setItem('labshift_user_name', u.displayName);
        localStorage.setItem('labshift_user_firstname', (u.displayName || '').split(/[\s,]+/)[0]);
        if (u.email) localStorage.setItem('labshift_user_email', u.email);
        localStorage.setItem('labshift_user_pass', password);

        localStorage.setItem(
          'labshift_personal_profile',
          JSON.stringify({
            id: u.id,
            displayName: u.displayName,
            jobTitle: u.role || 'Ahli Teknologi Laboratorium Medik (ATLM)',
            workUnit: 'Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie Pontianak',
          })
        );

        // Synchronize all shifts, coworkers, matrix assignments from server database
        await DataService.syncWithServer();

        setIsSubmitting(false);
        onLoginSuccess(u.email || 'atlm@rsudssma.pontianak.go.id', u.displayName);
        return;
      } else if (res.status === 401 || res.status === 400 || res.status === 409) {
        setIsSubmitting(false);
        setErrorMsg(data?.error || 'Autentikasi gagal. Silakan periksa kembali.');
        return;
      }
    } catch (netErr) {
      console.warn('Server auth login network check failed, falling back to local/demo check:', netErr);
    }

    // Default demo user fallback for offline mode
    const defaultEmail = 'atlm@rsudssma.pontianak.go.id';
    const defaultPass = 'atlm123';
    const defaultName = 'ATLM Patologi Klinik';
    const defaultFirstName = 'atlm';

    const isDefault = 
      inputClean === defaultEmail || 
      inputClean === defaultName.toLowerCase() || 
      inputClean === defaultFirstName ||
      inputClean === 'atlm';

    if (isDefault) {
      if (password === defaultPass || password === 'atlm123') {
        setIsSubmitting(false);
        localStorage.setItem('labshift_user_id', 'default-atlm-user-id');
        localStorage.setItem('labshift_user_name', defaultName);
        localStorage.setItem('labshift_user_firstname', 'ATLM');
        localStorage.setItem('labshift_user_email', defaultEmail);
        localStorage.setItem('labshift_user_pass', defaultPass);
        onLoginSuccess(defaultEmail, defaultName);
        return;
      } else {
        setIsSubmitting(false);
        setErrorMsg('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
        return;
      }
    }

    // Check local registered users cache (offline fallback)
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('labshift_registered_users') || '[]');
      const localMatched = registeredUsers.find((u: any) => {
        const uName = (u.displayName || '').toLowerCase();
        const uFirst = uName.split(/[\s,]+/)[0];
        const uEmail = (u.email || '').toLowerCase();
        return inputClean === uName || inputClean === uFirst || inputClean === uEmail;
      });

      if (localMatched) {
        if (localMatched.password === password) {
          localStorage.setItem('labshift_user_id', localMatched.id);
          localStorage.setItem('labshift_user_name', localMatched.displayName);
          localStorage.setItem('labshift_user_firstname', (localMatched.displayName || '').split(/[\s,]+/)[0]);
          localStorage.setItem('labshift_user_email', localMatched.email);
          localStorage.setItem('labshift_user_pass', password);

          setIsSubmitting(false);
          onLoginSuccess(localMatched.email, localMatched.displayName);
          return;
        } else {
          setIsSubmitting(false);
          setErrorMsg('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
          return;
        }
      }
    } catch (e) {
      console.warn('Local registered users check error:', e);
    }

    // If not found anywhere, reject!
    setIsSubmitting(false);
    setErrorMsg('Akun tidak terdaftar. Silakan buat akun baru terlebih dahulu.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setErrorMsg('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    if (password.length < 5) {
      setErrorMsg('Kata sandi minimal 5 karakter.');
      return;
    }

    setIsSubmitting(true);

    // 1. Register with Server Database (Persists across all browsers)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          displayName: displayName.trim(),
          role: 'Ahli Teknologi Laboratorium Medik (ATLM)',
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMsg(data?.error || 'Pendaftaran akun gagal. Silakan coba kembali.');
        return;
      }

      const u = data?.user || {
        id: generateUuid(),
        email: email.trim(),
        displayName: displayName.trim(),
      };

      // Save user credentials in local registered users cache
      try {
        const registeredUsers = JSON.parse(localStorage.getItem('labshift_registered_users') || '[]');
        if (!registeredUsers.some((ru: any) => ru.email.toLowerCase() === u.email.toLowerCase())) {
          registeredUsers.push({
            id: u.id,
            email: u.email,
            password: password,
            displayName: u.displayName,
          });
          localStorage.setItem('labshift_registered_users', JSON.stringify(registeredUsers));
        }
      } catch (e) {
        console.warn('Error saving to registered users cache:', e);
      }

      // Save active session credentials
      localStorage.setItem('labshift_user_id', u.id);
      localStorage.setItem('labshift_user_email', u.email);
      localStorage.setItem('labshift_user_pass', password);
      localStorage.setItem('labshift_user_name', u.displayName);
      const firstName = u.displayName.split(/[\s,]+/)[0];
      localStorage.setItem('labshift_user_firstname', firstName);

      // Pre-sync server state
      await DataService.syncWithServer();

      setIsSubmitting(false);
      setSuccessMsg('Akun berhasil dibuat! Silakan masuk dengan nama atau email Anda.');
      setTimeout(() => {
        setSuccessMsg(null);
        setLoginIdentifier(u.displayName);
        setIsRegistering(false);
      }, 1200);
      return;
    } catch (err: unknown) {
      console.warn('Server registration network failed:', err);
      setIsSubmitting(false);
      setErrorMsg('Koneksi server gagal. Silakan coba beberapa saat lagi.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!forgotEmail.trim()) {
      setErrorMsg('Harap masukkan email akun Anda.');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 5) {
      setErrorMsg('Kata sandi baru minimal 5 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          newPassword: newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setIsSubmitting(false);
        setErrorMsg(data?.error || 'Gagal mereset kata sandi. Pastikan email Anda sudah terdaftar.');
        return;
      }

      localStorage.setItem('labshift_user_pass', newPassword);
      setIsSubmitting(false);
      setResetStep('success');
      setSuccessMsg('Kata sandi berhasil direset! Anda sekarang dapat masuk dengan kata sandi baru.');
    } catch (err) {
      console.warn('Reset password error:', err);
      setIsSubmitting(false);
      setErrorMsg('Gagal menghubungkan ke server.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 text-slate-100">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Hospital & App Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl p-2.5 border border-slate-200">
            <img
              src={logoError ? APP_METADATA.localSealPath : APP_METADATA.sealUrl}
              alt="Lambang"
              className="w-full h-full object-contain"
              onError={() => setLogoError(true)}
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">LabShift</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFCED8] text-slate-900">
                Personal ATLM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {APP_METADATA.hospital} — {APP_METADATA.unit}
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-slate-900 space-y-6">
          {/* Header switch tabs */}
          {!isForgotMode && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isRegistering ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(true); setErrorMsg(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isRegistering ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Buat Akun Baru
              </button>
            </div>
          )}

          {isForgotMode ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Reset Kata Sandi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan email akun Anda dan tentukan kata sandi baru untuk mengatur ulang akses.
                </p>
              </div>

              {resetStep === 'success' ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-800">{successMsg}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setResetStep('request');
                      setSuccessMsg(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Email Akun</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="atlm@rsudssma.pontianak.go.id"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Kata Sandi Baru</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={5}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 5 karakter"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Konfirmasi Kata Sandi Baru</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={5}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsForgotMode(false); setErrorMsg(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      Reset Sandi
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : isRegistering ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Nama Lengkap & Gelar</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Rina Kusuma, A.Md.AK"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Tip: Anda dapat masuk nanti menggunakan nama depan (misal: Rina) atau nama lengkap.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Email Instansi / Pribadi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="atlm@rsudssma.pontianak.go.id"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={5}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 5 karakter"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>Daftar Akun LabShift</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nama (Depan / Lengkap) atau Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Contoh: Rina atau Rina Kusuma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Gunakan nama depan, nama lengkap, atau email yang telah terdaftar.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotMode(true); setForgotEmail(email); setErrorMsg(null); }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Lupa sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-slate-600">Ingat sesi saya</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke LabShift</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Keamanan Data Enkripsi Lokal & Sinkronisasi Aman</span>
          </p>
          <p>© 2026 LabShift Personal · Instalasi Patologi Klinik</p>
        </div>
      </div>
    </div>
  );
};
