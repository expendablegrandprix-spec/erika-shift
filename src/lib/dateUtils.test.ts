/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIndonesianDate,
  formatIndonesianFullDate,
  addDays,
  timeToMinutes,
  minutesToTime,
  getIntervalRange,
} from './dateUtils.ts';

test('formatIndonesianDate formats YYYY-MM-DD correctly', () => {
  assert.equal(formatIndonesianDate('2026-10-20'), '20 Oktober 2026');
  assert.equal(formatIndonesianDate('2026-01-01'), '1 Januari 2026');
  assert.equal(formatIndonesianDate('2026-12-31'), '31 Desember 2026');
});

test('formatIndonesianFullDate includes weekday name', () => {
  // 2026-10-20 is Tuesday (Selasa)
  assert.equal(formatIndonesianFullDate('2026-10-20'), 'Selasa, 20 Oktober 2026');
});

test('addDays adds positive and negative days properly', () => {
  assert.equal(addDays('2026-10-20', 1), '2026-10-21');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-10-20', -1), '2026-10-19');
});

test('timeToMinutes and minutesToTime calculate 24h intervals', () => {
  assert.equal(timeToMinutes('07:00'), 420);
  assert.equal(timeToMinutes('14:30'), 870);
  assert.equal(minutesToTime(420), '07:00');
  assert.equal(minutesToTime(870), '14:30');
});

test('getIntervalRange handles standard and overnight shifts', () => {
  // Day shift: 07:00 to 14:00
  const dayShift = getIntervalRange('07:00', '14:00');
  assert.ok(dayShift);
  assert.equal(dayShift.start, 420);
  assert.equal(dayShift.end, 840);
  assert.equal(dayShift.crossesMidnight, false);

  // Night shift: 21:00 to 07:00 (crosses midnight)
  const nightShift = getIntervalRange('21:00', '07:00');
  assert.ok(nightShift);
  assert.equal(nightShift.start, 1260);
  assert.equal(nightShift.end, 420 + 1440); // 1860
  assert.equal(nightShift.crossesMidnight, true);
});
