/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface Props {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Aplikasi telah terpasang sebagai PWA di perangkat Anda</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={async () => {
            setInstalling(true);
            try {
              await install();
            } finally {
              setInstalling(false);
            }
          }}
          disabled={installing}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-xs transition-colors cursor-pointer ${className}`}
          title="Pasang aplikasi LabShift ke beranda perangkat"
        >
          <Download className="w-3.5 h-3.5 text-[#FFF83F]" />
          <span className="hidden sm:inline">Pasang PWA</span>
          <span className="sm:hidden">Pasang</span>
        </button>
      );
    }

    return (
      <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-700" />
            <h4 className="text-sm font-bold text-slate-900">
              Pasang LabShift ke Layar Utama (PWA)
            </h4>
          </div>
          <p className="text-xs text-slate-600">
            Akses langsung tanpa bilah peramban, buka lebih cepat, dan dapat diakses saat koneksi internet lambat di laboratorium.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setInstalling(true);
            try {
              await install();
            } finally {
              setInstalling(false);
            }
          }}
          disabled={installing}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4 text-[#FFF83F]" />
          <span>{installing ? 'Memasang...' : 'Pasang Aplikasi Sekarang'}</span>
        </button>
      </div>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        {variant === 'compact' ? (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer ${className}`}
            title="Panduan pasang di iPhone / iPad"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Pasang di iOS</span>
          </button>
        ) : (
          <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Pasang di iPhone / iPad (iOS Safari)
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                Tambahkan LabShift ke Layar Utama (Home Screen) untuk pengalaman aplikasi mandiri.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-[#FFF83F]" />
              <span>Petunjuk Pasang iOS</span>
            </button>
          </div>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-slate-800" />
                  <h3 className="text-base font-bold text-slate-900">
                    Pasang di iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Buka di Safari & Ketuk Bagikan</p>
                    <p className="text-slate-500 mt-0.5">
                      Ketuk tombol <strong>Share / Bagikan</strong> (<Share className="w-3.5 h-3.5 inline mx-0.5" />) di bilah navigasi Safari bawah.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Pilih "Tambah ke Layar Utama"</p>
                    <p className="text-slate-500 mt-0.5">
                      Gulir menu ke bawah lalu ketuk <strong>Tambah ke Layar Utama</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Selesai</p>
                    <p className="text-slate-500 mt-0.5">
                      Ikon LabShift Personal dengan lambang Pontianak akan muncul di layar beranda.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for browsers that don't trigger beforeinstallprompt (e.g. desktop firefox or already installed)
  if (variant === 'full') {
    return (
      <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-700" />
            <h4 className="text-sm font-bold text-slate-900">
              Aplikasi Siap Pasang (PWA)
            </h4>
          </div>
          <p className="text-xs text-slate-600">
            Gunakan fitur <em>"Install App"</em> atau <em>"Tambahkan ke Layar Utama"</em> dari menu titik tiga peramban Chrome, Edge, atau browser ponsel Anda.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold shrink-0">
          Tersedia di Menu Browser
        </div>
      </div>
    );
  }

  return null;
};
