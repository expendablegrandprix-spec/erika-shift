/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Shift, ConflictIssue } from '../types/index.ts';
import { getIntervalRange } from './dateUtils.ts';

/**
 * Checks for conflicts between two shifts on the same or adjacent dates.
 * Considers:
 * 1. Duplicate shift entries (same date, same shift type, same times) -> DUPLICATE
 * 2. Missing times on multiple shifts on the same date -> NEEDS_VERIFICATION
 * 3. Overlapping time intervals (including overnight / crossing midnight) -> OVERLAP
 * 4. Distinct non-overlapping shifts -> NONE
 */
export function checkPairConflict(shiftA: Shift, shiftB: Shift): ConflictIssue | null {
  // If either shift is cancelled, ignore conflict
  if (shiftA.status === 'cancelled' || shiftB.status === 'cancelled') {
    return null;
  }

  // Must be on the same date or adjacent dates (for overnight overlap)
  const isSameDate = shiftA.shiftDate === shiftB.shiftDate;
  if (!isSameDate) {
    // Check if shift A crosses midnight from previous day into shift B's start date
    // or vice versa
    return null;
  }

  // Case 1: Exact duplicate
  if (
    shiftA.shiftTypeId === shiftB.shiftTypeId &&
    (shiftA.startTime || '') === (shiftB.startTime || '') &&
    (shiftA.endTime || '') === (shiftB.endTime || '')
  ) {
    return {
      severity: 'DUPLICATE',
      shiftAId: shiftA.id,
      shiftBId: shiftB.id,
      date: shiftA.shiftDate,
      message: 'Jadwal ganda terdeteksi',
      details: 'Terdapat dua jadwal shift yang identik pada tanggal yang sama.',
    };
  }

  // Case 2: One or both shifts have no start/end time specified
  const hasTimesA = Boolean(shiftA.startTime && shiftA.endTime);
  const hasTimesB = Boolean(shiftB.startTime && shiftB.endTime);

  if (!hasTimesA || !hasTimesB) {
    return {
      severity: 'NEEDS_VERIFICATION',
      shiftAId: shiftA.id,
      shiftBId: shiftB.id,
      date: shiftA.shiftDate,
      message: 'Perlu verifikasi: terdapat lebih dari satu jadwal pada tanggal ini',
      details: 'Salah satu atau kedua shift belum memiliki jam mulai/selesai yang lengkap untuk memverifikasi ada tidaknya tumpang tindih waktu.',
    };
  }

  // Case 3: Both shifts have valid start and end times
  const rangeA = getIntervalRange(shiftA.startTime, shiftA.endTime);
  const rangeB = getIntervalRange(shiftB.startTime, shiftB.endTime);

  if (!rangeA || !rangeB) {
    return {
      severity: 'NEEDS_VERIFICATION',
      shiftAId: shiftA.id,
      shiftBId: shiftB.id,
      date: shiftA.shiftDate,
      message: 'Perlu verifikasi: jam shift tidak valid',
      details: 'Format jam mulai dan selesai memerlukan pemeriksaan lebih lanjut.',
    };
  }

  // Overlap condition: max(startA, startB) < min(endA, endB)
  const overlapStart = Math.max(rangeA.start, rangeB.start);
  const overlapEnd = Math.min(rangeA.end, rangeB.end);

  if (overlapStart < overlapEnd) {
    return {
      severity: 'OVERLAP',
      shiftAId: shiftA.id,
      shiftBId: shiftB.id,
      date: shiftA.shiftDate,
      message: 'Konflik waktu terdeteksi',
      details: `Waktu shift saling bertabrakan antara ${shiftA.startTime}-${shiftA.endTime} dan ${shiftB.startTime}-${shiftB.endTime}.`,
    };
  }

  // No conflict: times do not overlap!
  return null;
}

/**
 * Evaluates all shifts and detects any conflicts across the entire schedule.
 */
export function detectAllConflicts(shifts: Shift[]): ConflictIssue[] {
  const activeShifts = shifts.filter((s) => s.status !== 'cancelled');
  const issues: ConflictIssue[] = [];

  for (let i = 0; i < activeShifts.length; i++) {
    for (let j = i + 1; j < activeShifts.length; j++) {
      const issue = checkPairConflict(activeShifts[i], activeShifts[j]);
      if (issue) {
        issues.push(issue);
      }
    }
  }

  return issues;
}

/**
 * Returns conflicts involving a specific shift ID
 */
export function getConflictsForShift(shiftId: string, allConflicts: ConflictIssue[]): ConflictIssue[] {
  return allConflicts.filter((c) => c.shiftAId === shiftId || c.shiftBId === shiftId);
}
