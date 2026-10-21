/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  History,
  ArrowRight,
  Clock,
  Calendar,
  MessageSquare,
  Sparkles,
  FileText,
  Search,
} from 'lucide-react';
import type { ShiftChangeLog } from '../types/index.ts';
import { formatIndonesianDate, formatIndonesianFullDate } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from '../components/ShiftColorBadge.tsx';

interface Props {
  changeLogs: ShiftChangeLog[];
}

export const ChangeHistoryPage: React.FC<Props> = ({ changeLogs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = changeLogs.filter((log) => {
    const q = search.toLowerCase();
    return (
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.sourceMessage && log.sourceMessage.toLowerCase().includes(q)) ||
      (log.newShiftType && log.newShiftType.name.toLowerCase().includes(q)) ||
      (log.oldShiftType && log.oldShiftType.name.toLowerCase().includes(q)) ||
      (log.newShiftDate && log.newShiftDate.includes(q))
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Audit Trail Perubahan Shift
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat Perubahan Jadwal
          </h1>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari alasan, tanggal, atau warna..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
          />
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Perubahan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Setiap perubahan jadwal, penyesuaian jam dinas, atau tukar shift dari chat WhatsApp akan tercatat rapi di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isCreated = log.changeType === 'created';
            const isCancelled = log.changeType === 'cancelled';
            const isUpdated = log.changeType === 'updated';

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                {/* Top status bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                        isCreated
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {log.changeType.toUpperCase()}
                    </span>

                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">
                      Dicatat: {new Date(log.createdAt).toLocaleString('id-ID', {
                        timeZone: 'Asia/Pontianak',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })} WIB
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 font-medium">
                    Sumber: {log.source}
                  </span>
                </div>

                {/* Transition Comparison */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  {/* Left: Original / Old */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      {isCreated ? 'Status Awal' : 'Jadwal Semula:'}
                    </span>
                    {log.oldShiftType ? (
                      <div className="flex items-center gap-2">
                        <ShiftColorBadge shiftType={log.oldShiftType} size="sm" />
                        <span className="font-semibold text-slate-800">
                          {formatIndonesianDate(log.oldShiftDate || '')}
                        </span>
                        {log.oldStartTime && (
                          <span className="text-slate-500 font-mono">
                            ({log.oldStartTime} - {log.oldEndTime})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada jadwal sebelumnya</span>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="hidden sm:flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Right: New Shift */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      {isCancelled ? 'Status Akhir' : 'Jadwal Baru / Pengganti:'}
                    </span>
                    {log.newShiftType && !isCancelled ? (
                      <div className="flex items-center gap-2">
                        <ShiftColorBadge shiftType={log.newShiftType} size="sm" />
                        <span className="font-bold text-slate-900">
                          {formatIndonesianDate(log.newShiftDate || '')}
                        </span>
                        {log.newStartTime && (
                          <span className="text-slate-600 font-mono">
                            ({log.newStartTime} - {log.newEndTime})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-rose-600 font-bold">Shift Dibatalkan</span>
                    )}
                  </div>
                </div>

                {/* Reason & Source Message */}
                {log.reason && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Alasan: </span>
                    {log.reason}
                  </div>
                )}

                {log.sourceMessage && (
                  <div className="p-2.5 bg-slate-100/70 rounded-lg text-slate-600 text-[11px] italic border-l-2 border-slate-300">
                    "{log.sourceMessage}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
