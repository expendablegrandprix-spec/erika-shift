/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScheduleMessageOffline } from './aiParserService.ts';

test('parses swap message with coworker, color, and times', () => {
  const msg = 'Besok kamu tukar sama Budi. Kamu masuk Biru jam 07.00 sampai 14.00.';
  const result = parseScheduleMessageOffline(msg, '2026-10-20');

  assert.equal(result.date, '2026-10-21');
  assert.equal(result.shiftCode, 'BIRU');
  assert.equal(result.shiftName, 'Biru');
  assert.equal(result.startTime, '07:00');
  assert.equal(result.endTime, '14:00');
  assert.equal(result.changeType, 'swap');
  assert.ok(result.coworkerName?.toLowerCase().includes('budi'));
  assert.equal(result.confidence, 'high');
});

test('parses lusa with yellow shift', () => {
  const msg = 'Lusa tolong gantikan shift Kuning pukul 14.00 s/d 21.00';
  const result = parseScheduleMessageOffline(msg, '2026-10-20');

  assert.equal(result.date, '2026-10-22');
  assert.equal(result.shiftCode, 'KUNING');
  assert.equal(result.startTime, '14:00');
  assert.equal(result.endTime, '21:00');
  assert.equal(result.changeType, 'replacement');
});

test('handles missing times with appropriate ambiguity notes', () => {
  const msg = 'Masuk shift Ungu besok ya';
  const result = parseScheduleMessageOffline(msg, '2026-10-20');

  assert.equal(result.date, '2026-10-21');
  assert.equal(result.shiftCode, 'UNGU');
  assert.ok(result.ambiguities.length > 0);
});
