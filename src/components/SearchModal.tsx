/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, X, Calendar, Users, FileText, ArrowRight } from 'lucide-react';
import type { ShiftWithDetails, Coworker, PersonalNote } from '../types/index.ts';
import { formatIndonesianDate } from '../lib/dateUtils.ts';
import { ShiftColorBadge } from './ShiftColorBadge.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shifts: ShiftWithDetails[];
  coworkers: Coworker[];
  notes: PersonalNote[];
  onSelectShift: (shiftId: string) => void;
  onSelectCoworker: (coworkerId: string) => void;
}

export const SearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shifts,
  coworkers,
  notes,
  onSelectShift,
  onSelectCoworker,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingShifts = q
    ? shifts.filter(
        (s) =>
          s.shiftDate.includes(q) ||
          s.shiftType.name.toLowerCase().includes(q) ||
          s.shiftType.code.toLowerCase().includes(q) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          s.coworkers.some((c) => c.name.toLowerCase().includes(q))
      )
    : [];

  const matchingCoworkers = q
    ? coworkers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.nickname && c.nickname.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      )
    : [];

  const matchingNotes = q
    ? notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 pt-16">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tanggal, warna shift, nama rekan, atau catatan..."
            className="w-full text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto space-y-4 flex-1 text-xs pr-1">
          {!q ? (
            <div className="py-8 text-center text-slate-400">
              Ketik kata kunci pencarian (misal: "Biru", "Budi", "Urinalisis", "2026-10").
            </div>
          ) : matchingShifts.length === 0 && matchingCoworkers.length === 0 && matchingNotes.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              Tidak ada hasil yang cocok dengan "{query}".
            </div>
          ) : (
            <>
              {/* Shift Results */}
              {matchingShifts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                    Jadwal Shift ({matchingShifts.length})
                  </span>
                  {matchingShifts.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        onSelectShift(s.id);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ShiftColorBadge shiftType={s.shiftType} size="sm" />
                        <span className="font-bold text-slate-900">
                          {formatIndonesianDate(s.shiftDate)}
                        </span>
                        {s.startTime && (
                          <span className="text-slate-500 font-mono">
                            {s.startTime} - {s.endTime}
                          </span>
                        )}
                        <span className="text-slate-400 truncate hidden sm:inline">
                          · {s.location || s.shiftType.description}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Coworker Results */}
              {matchingCoworkers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                    Rekan Laboratorium ({matchingCoworkers.length})
                  </span>
                  {matchingCoworkers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCoworker(c.id);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(c.nickname || c.name).charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 truncate">{c.name}</span>
                        {c.notes && (
                          <span className="text-slate-400 truncate">· {c.notes}</span>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Note Results */}
              {matchingNotes.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                    Catatan Pribadi ({matchingNotes.length})
                  </span>
                  {matchingNotes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <div className="font-bold text-slate-900">{n.title}</div>
                      <p className="text-slate-600 line-clamp-2 mt-0.5">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
