/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import type { ConflictIssue } from '../types/index.ts';

interface Props {
  conflicts: ConflictIssue[];
  onSelectShift?: (shiftId: string) => void;
}

export const ConflictAlert: React.FC<Props> = ({ conflicts, onSelectShift }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {conflicts.map((conflict, idx) => {
        const isOverlap = conflict.severity === 'OVERLAP';
        const isDuplicate = conflict.severity === 'DUPLICATE';

        const bgClass = isOverlap
          ? 'bg-rose-50 border-rose-300 text-rose-900'
          : isDuplicate
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-yellow-50 border-yellow-300 text-yellow-900';

        const icon = isOverlap ? (
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        ) : isDuplicate ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        );

        return (
          <div
            key={idx}
            className={`p-3.5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${bgClass}`}
          >
            <div className="flex items-start gap-3">
              {icon}
              <div>
                <div className="font-semibold text-sm">{conflict.message}</div>
                <div className="text-xs mt-0.5 opacity-90">{conflict.details}</div>
              </div>
            </div>

            {onSelectShift && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectShift(conflict.shiftAId)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-1 text-slate-800"
                >
                  Tinjau Shift A <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectShift(conflict.shiftBId)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-1 text-slate-800"
                >
                  Tinjau Shift B <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
