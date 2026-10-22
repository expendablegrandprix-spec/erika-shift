import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory polyfill for localStorage in node test environment
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, val: string) => storage.set(key, String(val)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { DataService, DEFAULT_COWORKERS } from './dataService.ts';

test('DataService initializes default coworkers when storage is empty', async () => {
  storage.clear();
  const coworkers = await DataService.getCoworkers();
  assert.ok(coworkers.length >= 3, 'Should have default coworkers');
  assert.equal(coworkers[0].name, DEFAULT_COWORKERS[0].name);
});

test('DataService creates and persists a new coworker', async () => {
  const newCw = await DataService.createCoworker({
    name: 'Ahmad Faisal, S.Tr.Kes',
    nickname: 'Ahmad',
    notes: 'Petugas Pengambilan Sampel & BDRS',
  });

  assert.ok(newCw.id, 'New coworker should have an ID');
  assert.equal(newCw.name, 'Ahmad Faisal, S.Tr.Kes');

  const all = await DataService.getCoworkers();
  const found = all.find((c) => c.id === newCw.id);
  assert.ok(found, 'Created coworker must be found in all coworkers');
  assert.equal(found.name, 'Ahmad Faisal, S.Tr.Kes');
});

test('DataService creates, updates, and deletes shifts persistently', async () => {
  const shiftTypes = await DataService.getShiftTypes();
  const morningType = shiftTypes[0];

  const shift = await DataService.createShift(
    {
      shiftDate: '2026-11-05',
      shiftTypeId: morningType.id,
      startTime: '07:00',
      endTime: '14:30',
      location: 'Lab Patologi Klinik',
      status: 'scheduled',
      isConfirmed: true,
    },
    []
  );

  assert.ok(shift.id, 'Shift must have an id');
  assert.equal(shift.shiftDate, '2026-11-05');

  let shifts = await DataService.getShifts();
  let saved = shifts.find((s) => s.id === shift.id);
  assert.ok(saved, 'Saved shift must be retrieved');

  // Update
  await DataService.updateShift(shift.id, {
    notes: 'Catatan diperbarui',
    isConfirmed: true,
  });

  shifts = await DataService.getShifts();
  saved = shifts.find((s) => s.id === shift.id);
  assert.equal(saved?.notes, 'Catatan diperbarui');

  // Delete
  await DataService.deleteShift(shift.id);
  shifts = await DataService.getShifts();
  assert.equal(shifts.find((s) => s.id === shift.id), undefined);
});

test('DataService manages coworker matrix assignments', () => {
  DataService.setCoworkerMatrixAssignment('coworker-1', '2026-11-10', 'st-kuning');
  let assignments = DataService.getCoworkerMatrixAssignments();
  let found = assignments.find((a) => a.coworkerId === 'coworker-1' && a.date === '2026-11-10');
  assert.ok(found);
  assert.equal(found?.shiftTypeId, 'st-kuning');

  // Clear by setting null
  DataService.setCoworkerMatrixAssignment('coworker-1', '2026-11-10', null);
  assignments = DataService.getCoworkerMatrixAssignments();
  found = assignments.find((a) => a.coworkerId === 'coworker-1' && a.date === '2026-11-10');
  assert.equal(found, undefined);
});
