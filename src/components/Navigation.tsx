/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarDays,
  Calendar,
  Grid,
  Users,
  MoreHorizontal,
  History,
  FileText,
  BarChart3,
  Settings,
  MessageSquareShare,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

export type NavTab = 'today' | 'calendar' | 'matrix' | 'add_shift' | 'my_shifts' | 'coworkers' | 'changes' | 'ai_parser' | 'notes' | 'stats' | 'settings';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  conflictCount: number;
}

export const Navigation: React.FC<Props> = ({ activeTab, onSelectTab, conflictCount }) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isToolsActive = ['ai_parser', 'changes', 'notes'].includes(activeTab);
  const isMoreActive = ['my_shifts', 'ai_parser', 'changes', 'notes', 'stats', 'settings'].includes(activeTab);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop Navigation Bar */}
      <nav className="hidden md:flex items-center border-b border-slate-200 bg-white px-6 py-2.5 text-sm font-medium shadow-2xs">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectTab('today')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Hari Ini</span>
              {conflictCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'calendar' || activeTab === 'add_shift'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Kalender & Tambah Shift</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-teal-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Grid className="w-4 h-4 text-teal-600" />
              <span>Matriks Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('my_shifts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'my_shifts'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#FFCED8]" />
              <span>Shift Saya</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('coworkers')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'coworkers'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekan</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('stats')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Statistik</span>
            </button>

            {/* Tools Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  isToolsActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>Alat & Fitur</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => { onSelectTab('ai_parser'); setIsToolsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeTab === 'ai_parser' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquareShare className="w-4 h-4 text-emerald-600" />
                    <span>Tempel Chat WhatsApp AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSelectTab('changes'); setIsToolsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeTab === 'changes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>Riwayat Perubahan Shift</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onSelectTab('notes'); setIsToolsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      activeTab === 'notes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Catatan Personal Lab</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (5 ideal balanced items) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => onSelectTab('today')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === 'today' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <CalendarDays className="w-5 h-5" />
            {conflictCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Hari Ini</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === 'calendar' || activeTab === 'add_shift' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kalender</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('my_shifts')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === 'my_shifts' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <UserCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] mt-0.5">Shift Saya</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('coworkers')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === 'coworkers' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Rekan</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            activeTab === 'stats' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Statistik</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab(isMoreActive ? activeTab : 'changes')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer ${
            isMoreActive ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Lainnya</span>
        </button>
      </nav>
    </>
  );
};
