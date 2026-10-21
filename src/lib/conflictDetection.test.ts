/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Shift } from '../types/index.ts';
import { checkPairConflict, detectAllConflicts } from './conflictDetection.ts';

const baseShift: Shift = {
  id: 'shift-1',
  userId: 'user-1',
  shiftDate: '2026-10-20',
  shiftTypeId: '11111111-1111-1111-1111-111111111111',
  startTime: '07:00',
  endTime: '14:00',
  status: 'scheduled',
  isConfirmed: true,
};

test('detects exact duplicate shift on same date', () => {
  const shift2: Shift = {
    ...baseShift,
    id: 'shift-2',
  };
  const issue = checkPairConflict(baseShift, shift2);
  assert.ok(issue);
  assert.equal(issue.severity, 'DUPLICATE');
});

test('detects overlapping shifts on same date', () => {
  const shift2: Shift = {
    ...baseShift,
    id: 'shift-2',
    shiftTypeId: '22222222-2222-2222-2222-222222222222',
    startTime: '12:00',
    endTime: '19:00', // Overlaps with 07:00-14:00
  };
  const issue = checkPairConflict(baseShift, shift2);
  assert.ok(issue);
  assert.equal(issue.severity, 'OVERLAP');
});

test('flags needs verification when times are missing', () => {
  const shiftMissing: Shift = {
    ...baseShift,
    id: 'shift-2',
    shiftTypeId: '22222222-2222-2222-2222-222222222222',
    startTime: undefined,
    endTime: undefined,
  };
  const issue = checkPairConflict(baseShift, shiftMissing);
  assert.ok(issue);
  assert.equal(issue.severity, 'NEEDS_VERIFICATION');
});

test('returns null when shifts on same date do NOT overlap', () => {
  // Morning shift: 07:00 to 14:00
  // Evening shift: 14:00 to 21:00 (back-to-back or distinct)
  const shiftEvening: Shift = {
    ...baseShift,
    id: 'shift-2',
    shiftTypeId: '22222222-2222-2222-2222-222222222222',
    startTime: '14:00',
    endTime: '21:00',
  };
  const issue = checkPairConflict(baseShift, shiftEvening);
  assert.equal(issue, null);
});

test('ignores cancelled shifts in conflict detection', () => {
  const cancelledShift: Shift = {
    ...baseShift,
    id: 'shift-2',
    status: 'cancelled',
  };
  const conflicts = detectAllConflicts([baseShift, cancelledShift]);
  assert.equal(conflicts.length, 0);
});
