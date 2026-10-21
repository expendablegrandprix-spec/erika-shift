/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ShiftType } from '../types/index.ts';

interface Props {
  shiftType: ShiftType;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export const ShiftColorBadge: React.FC<Props> = ({
  shiftType,
  size = 'md',
  showDescription = false,
}) => {
  // Determine readable text color based on shift color
  const isLightColor = shiftType.code === 'KUNING' || shiftType.code === 'ABU_ABU';
  const textColor = isLightColor ? 'text-slate-900 font-bold' : 'text-white font-bold';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md',
    lg: 'text-sm px-3 py-1.5 rounded-lg',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 shadow-xs uppercase tracking-wider ${sizeClasses[size]} ${textColor}`}
        style={{ backgroundColor: shiftType.colorHex }}
      >
        <span className="w-2 h-2 rounded-full bg-white/70 shadow-xs" />
        {shiftType.name}
      </span>
      {showDescription && (
        <span className="text-xs text-slate-500 truncate max-w-xs">
          {shiftType.description}
        </span>
      )}
    </div>
  );
};
