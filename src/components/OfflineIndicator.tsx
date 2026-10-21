/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 sm:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/90 text-white px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Mode Offline — Menggunakan data lokal tersimpan (PWA Cache).</span>
    </div>
  );
};
