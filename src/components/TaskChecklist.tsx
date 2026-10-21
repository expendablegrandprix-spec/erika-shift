/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Info } from 'lucide-react';
import { DataService } from '../services/dataService.ts';
import type { ShiftWithDetails } from '../types/index.ts';

interface Props {
  shift: ShiftWithDetails;
  onUpdate?: () => void;
}

export const TaskChecklist: React.FC<Props> = ({ shift, onUpdate }) => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      setLoading(true);
      const defaultTasks = await DataService.getShiftTasks(shift.shiftType.code);
      if (!isMounted) return;

      setTasks(defaultTasks);
      const map: Record<string, boolean> = {};
      shift.taskChecks.forEach((tc) => {
        map[tc.taskName] = tc.isCompleted;
      });
      setCompletedMap(map);
      setLoading(false);
    }

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, [shift]);

  const handleToggle = async (taskName: string) => {
    const nextState = !completedMap[taskName];
    setCompletedMap((prev) => ({ ...prev, [taskName]: nextState }));

    await DataService.toggleTaskCheck(shift.id, taskName, nextState);
    if (onUpdate) onUpdate();
  };

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => completedMap[t]).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
        Memuat daftar tugas laboratorium...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Daftar Tugas & Pemeriksaan
          </span>
          <p className="text-xs text-slate-600 mt-0.5">
            {completedCount} dari {totalCount} tugas selesai ({progressPercent}%)
          </p>
        </div>
        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tasks.map((task) => {
          const isDone = Boolean(completedMap[task]);
          return (
            <button
              key={task}
              type="button"
              onClick={() => handleToggle(task)}
              className={`flex items-center gap-2.5 p-2.5 text-left rounded-lg border transition-all text-sm ${
                isDone
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {isDone ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className={`truncate ${isDone ? 'line-through text-emerald-800/80' : ''}`}>
                {task}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>Daftar tugas ini adalah panduan kerja pribadi ATLM dan bukan dokumen validasi hasil lab resmi.</span>
      </div>
    </div>
  );
};
