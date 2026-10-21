/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { ShiftWithDetails } from '../types/index.ts';
import { escapeIcsText, formatIcsDateTime, generateIcsCalendar } from './icsExport.ts';
import { PREDEFINED_SHIFT_TYPES } from './constants.ts';

test('escapeIcsText escapes semicolons, commas, and newlines', () => {
  const input = 'Catatan, shift; reagen\nbaru';
  const expected = 'Catatan\\, shift\\; reagen\\nbaru';
  assert.equal(escapeIcsText(input), expected);
});

test('formatIcsDateTime formats date and time to YYYYMMDDTHHMMSS', () => {
  assert.equal(formatIcsDateTime('2026-10-21', '07:00'), '20261021T070000');
  assert.equal(formatIcsDateTime('2026-10-21', '14:30'), '20261021T143000');
  assert.equal(formatIcsDateTime('2026-10-21'), '20261021T000000');
});

test('generateIcsCalendar generates RFC 5545 calendar with timezone and overnight support', () => {
  const shifts: ShiftWithDetails[] = [
    {
      id: 'shift-day-1',
      userId: 'user-1',
      shiftDate: '2026-10-21',
      shiftTypeId: PREDEFINED_SHIFT_TYPES[1].id, // BIRU
      shiftType: PREDEFINED_SHIFT_TYPES[1],
      startTime: '07:00',
      endTime: '14:00',
      status: 'scheduled',
      isConfirmed: true,
      coworkers: [
        {
          id: 'c-1',
          userId: 'user-1',
          name: 'Budi Santoso',
          isActive: true,
        },
      ],
      taskChecks: [],
    },
    {
      id: 'shift-night-2',
      userId: 'user-1',
      shiftDate: '2026-10-22',
      shiftTypeId: PREDEFINED_SHIFT_TYPES[4].id, // HIJAU
      shiftType: PREDEFINED_SHIFT_TYPES[4],
      startTime: '21:00',
      endTime: '07:00', // Overnight
      status: 'scheduled',
      isConfirmed: false,
      coworkers: [],
      taskChecks: [],
    },
    {
      id: 'shift-cancelled',
      userId: 'user-1',
      shiftDate: '2026-10-23',
      shiftTypeId: PREDEFINED_SHIFT_TYPES[0].id,
      shiftType: PREDEFINED_SHIFT_TYPES[0],
      status: 'cancelled',
      isConfirmed: false,
      coworkers: [],
      taskChecks: [],
    },
  ];

  const ics = generateIcsCalendar(shifts, 'Jadwal Test');

  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(ics.includes('X-WR-TIMEZONE:Asia/Pontianak'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Pontianak:20261021T070000'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Pontianak:20261021T140000'));
  assert.ok(ics.includes('SUMMARY:Shift Biru'));
  assert.ok(ics.includes('STATUS:CONFIRMED'));
  assert.ok(ics.includes('Budi Santoso'));

  // Overnight shift ends next day (2026-10-23T070000)
  assert.ok(ics.includes('DTSTART;TZID=Asia/Pontianak:20261022T210000'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Pontianak:20261023T070000'));
  assert.ok(ics.includes('STATUS:TENTATIVE'));

  // Cancelled shift is excluded
  assert.ok(!ics.includes('shift-cancelled'));
  assert.ok(ics.includes('END:VCALENDAR'));
});
