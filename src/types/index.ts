/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShiftCode = 'KUNING' | 'BIRU' | 'UNGU' | 'ABU_ABU' | 'HIJAU' | 'PINK' | 'SIANG' | 'MALAM';

export interface ShiftType {
  id: string;
  code: ShiftCode;
  name: string;
  colorHex: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ShiftTask {
  id: string;
  shiftTypeId: string;
  taskName: string;
  sortOrder: number;
}

export interface Coworker {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CoworkerMatrixAssignment {
  coworkerId: string;
  date: string; // YYYY-MM-DD
  shiftTypeId: string;
}

export type ShiftStatus = 'scheduled' | 'changed' | 'cancelled';

export interface Shift {
  id: string;
  userId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftTypeId: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes?: string;
  status: ShiftStatus;
  originalShiftTypeId?: string;
  isConfirmed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftTaskCheck {
  id: string;
  userId?: string;
  shiftId: string;
  taskName: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ShiftWithDetails extends Shift {
  shiftType: ShiftType;
  originalShiftType?: ShiftType;
  coworkers: Coworker[];
  taskChecks: ShiftTaskCheck[];
}

export interface ShiftChangeLog {
  id: string;
  userId: string;
  shiftId?: string;
  changeType: 'created' | 'updated' | 'cancelled' | 'swapped';
  oldShiftDate?: string;
  newShiftDate?: string;
  oldShiftTypeId?: string;
  newShiftTypeId?: string;
  oldStartTime?: string;
  newStartTime?: string;
  oldEndTime?: string;
  newEndTime?: string;
  reason?: string;
  source: 'manual' | 'chat_text' | 'screenshot' | 'imported';
  sourceMessage?: string;
  createdAt: string;
  // Resolved types for UI
  oldShiftType?: ShiftType;
  newShiftType?: ShiftType;
}

export interface PersonalNote {
  id: string;
  userId: string;
  shiftId?: string;
  noteDate?: string; // YYYY-MM-DD
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSetting {
  id?: string;
  userId?: string;
  enabled: boolean;
  dayBeforeEnabled: boolean;
  dayBeforeTime: string; // HH:mm, default 20:00
  minutesBeforeShift: number; // default 60
  browserNotificationsEnabled: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  jobTitle: string;
  workUnit: string;
  photoUrl?: string;
}

export type ConflictSeverity = 'OVERLAP' | 'DUPLICATE' | 'NEEDS_VERIFICATION' | 'NONE';

export interface ConflictIssue {
  severity: ConflictSeverity;
  shiftAId: string;
  shiftBId: string;
  date: string;
  message: string;
  details: string;
}

export interface ParsedChatResult {
  date?: string; // YYYY-MM-DD
  dateLabel?: string;
  shiftCode?: ShiftCode;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  coworkerName?: string;
  changeType: 'swap' | 'replacement' | 'new_schedule' | 'cancellation';
  reason?: string;
  originalShiftHint?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  ambiguities: string[];
}
