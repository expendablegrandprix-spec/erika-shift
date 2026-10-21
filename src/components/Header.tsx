/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Database, CloudCheck, WifiOff } from 'lucide-react';
import { APP_METADATA } from '../lib/constants.ts';
import { isSupabaseConfigured } from '../lib/supabase.ts';
import { getPontianakTimeString, getPontianakDateString, formatIndonesianDate } from '../lib/dateUtils.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface Props {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<Props> = ({ onOpenSearch, onOpenSettings }) => {
  const [pontianakTime, setPontianakTime] = useState(getPontianakTimeString());
  const [pontianakDate, setPontianakDate] = useState(getPontianakDateString());
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPontianakTime(getPontianakTimeString());
      setPontianakDate(getPontianakDateString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top hospital banner strip with custom reference colors */}
      <div className="bg-gradient-to-r from-[#FFDDDD] via-[#E3AFC9]/40 to-[#FFF83F]/30 px-4 py-1 border-b border-slate-200/60 text-[11px] text-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-none">
          <span className="font-semibold text-slate-900 truncate">{APP_METADATA.hospital}</span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-slate-600 truncate hidden sm:inline">{APP_METADATA.unit}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-700">
          <span>{formatIndonesianDate(pontianakDate)}</span>
          <span className="font-semibold text-slate-900">{pontianakTime} WIB</span>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Zone with Pontianak Emblem */}
        <div className="flex items-center gap-3">
          <img
            src={logoError ? APP_METADATA.localSealPath : APP_METADATA.sealUrl}
            alt="Lambang Kota Pontianak"
            className="w-9 h-9 object-contain drop-shadow-xs"
            onError={() => setLogoError(true)}
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-slate-950 tracking-tight leading-none">
                LabShift
              </span>
              <span className="text-xs px-1.5 py-0.2 bg-[#E3AFC9]/40 text-slate-800 font-semibold rounded">
                Personal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-none">
              Jadwal & Tugas ATLM Pontianak
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton variant="compact" />

          {/* Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 text-xs font-medium transition-colors cursor-pointer"
            title="Cari jadwal, rekan, atau catatan"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Cari...</span>
          </button>

          {/* Supabase status badge */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={
              isSupabaseConfigured
                ? 'Tersambung ke Supabase Cloud DB'
                : 'Penyimpanan lokal aktif (Klik untuk hubungkan Supabase)'
            }
          >
            {isSupabaseConfigured ? (
              <>
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Supabase Cloud</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Lokal / Offline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
