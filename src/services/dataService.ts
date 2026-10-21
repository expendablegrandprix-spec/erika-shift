/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  Shift,
  ShiftWithDetails,
  ShiftType,
  ShiftTask,
  Coworker,
  ShiftChangeLog,
  PersonalNote,
  ReminderSetting,
  UserProfile,
} from '../types/index.ts';
import { PREDEFINED_SHIFT_TYPES, PREDEFINED_TASKS_BY_CODE } from '../lib/constants.ts';
import { getPontianakDateString } from '../lib/dateUtils.ts';

const LOCAL_STORAGE_KEY_PREFIX = 'labshift_personal_';

// Local storage fallback helpers
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
}

// Default initial ATLM profile
const DEFAULT_PROFILE: UserProfile = {
  id: 'atlm-user-rsud-ssma',
  displayName: 'ATLM Patologi Klinik',
  jobTitle: 'Ahli Teknologi Laboratorium Medik (ATLM)',
  workUnit: 'Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie Pontianak',
};

// Default initial sample coworkers for convenience (or empty)
const DEFAULT_COWORKERS: Coworker[] = [
  { id: 'coworker-1', userId: 'default', name: 'Budi Santoso, A.Md.AK', nickname: 'Budi', notes: 'Spesialis Kimia Darah', isActive: true },
  { id: 'coworker-2', userId: 'default', name: 'Siti Rahmawati, S.Tr.Kes', nickname: 'Siti', notes: 'Petugas BDRS & Serologi', isActive: true },
  { id: 'coworker-3', userId: 'default', name: 'Rina Kusuma, A.Md.Kes', nickname: 'Rina', notes: 'Mikrobiologi & TCM BTA', isActive: true },
  { id: 'coworker-4', userId: 'default', name: 'Hendra Wijaya, A.Md.AK', nickname: 'Hendra', notes: 'Operator LIS & Urinalisis', isActive: true },
];

export class DataService {
  // -------------------------------------------------------------
  // SHIFT TYPES & TASKS
  // -------------------------------------------------------------
  static async getShiftTypes(): Promise<ShiftType[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shift_types')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            colorHex: d.color_hex,
            description: d.description,
            sortOrder: d.sort_order,
            isActive: d.is_active,
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch shift_types failed, using predefined:', e);
      }
    }
    return PREDEFINED_SHIFT_TYPES;
  }

  static async getShiftTasks(shiftTypeCode: string): Promise<string[]> {
    return PREDEFINED_TASKS_BY_CODE[shiftTypeCode] || [];
  }

  // -------------------------------------------------------------
  // USER PROFILE
  // -------------------------------------------------------------
  static async getProfile(): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (!error && data) {
            return {
              id: data.id,
              displayName: data.display_name || user.email?.split('@')[0] || 'ATLM',
              jobTitle: data.job_title || DEFAULT_PROFILE.jobTitle,
              workUnit: data.work_unit || DEFAULT_PROFILE.workUnit,
              photoUrl: data.photo_url || undefined,
            };
          }
        }
      } catch (e) {
        console.warn('Supabase getProfile failed:', e);
      }
    }
    return getLocalItem<UserProfile>('profile', DEFAULT_PROFILE);
  }

  static async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getProfile();
    const updated = { ...current, ...profile };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: updated.displayName,
            job_title: updated.jobTitle,
            work_unit: updated.workUnit,
            photo_url: updated.photoUrl,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Supabase updateProfile failed:', e);
      }
    }

    setLocalItem('profile', updated);
    return updated;
  }

  // -------------------------------------------------------------
  // COWORKERS
  // -------------------------------------------------------------
  static async getCoworkers(): Promise<Coworker[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('coworkers')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (!error && data) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            name: d.name,
            nickname: d.nickname,
            notes: d.notes,
            isActive: d.is_active,
            createdAt: d.created_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getCoworkers failed:', e);
      }
    }
    return getLocalItem<Coworker[]>('coworkers', DEFAULT_COWORKERS);
  }

  static async createCoworker(coworker: Omit<Coworker, 'id' | 'userId' | 'isActive'>): Promise<Coworker> {
    const newCoworker: Coworker = {
      id: 'coworker-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      userId: 'local-user',
      name: coworker.name.trim(),
      nickname: coworker.nickname?.trim() || '',
      notes: coworker.notes?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('coworkers')
            .insert({
              user_id: user.id,
              name: newCoworker.name,
              nickname: newCoworker.nickname,
              notes: newCoworker.notes,
              is_active: true,
            })
            .select()
            .single();
          if (!error && data) {
            newCoworker.id = data.id;
            newCoworker.userId = data.user_id;
          }
        }
      } catch (e) {
        console.warn('Supabase createCoworker failed:', e);
      }
    }

    const current = await this.getCoworkers();
    setLocalItem('coworkers', [newCoworker, ...current]);
    return newCoworker;
  }

  static async updateCoworker(id: string, updates: Partial<Coworker>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('coworkers')
          .update({
            name: updates.name,
            nickname: updates.nickname,
            notes: updates.notes,
            is_active: updates.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase updateCoworker failed:', e);
      }
    }

    const coworkers = await this.getCoworkers();
    const updatedList = coworkers.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setLocalItem('coworkers', updatedList);
  }

  // -------------------------------------------------------------
  // SHIFTS
  // -------------------------------------------------------------
  static async getShifts(): Promise<ShiftWithDetails[]> {
    const shiftTypes = await this.getShiftTypes();
    const coworkers = await this.getCoworkers();
    const shiftTypesMap = new Map(shiftTypes.map((st) => [st.id, st]));
    const coworkersMap = new Map(coworkers.map((c) => [c.id, c]));

    let rawShifts: Shift[] = [];
    let shiftCoworkerPairs: { shiftId: string; coworkerId: string }[] = [];
    let allTaskChecks: { shiftId: string; taskName: string; isCompleted: boolean; id: string }[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: shiftsData, error: sErr } = await supabase
          .from('shifts')
          .select('*')
          .order('shift_date', { ascending: true });

        if (!sErr && shiftsData) {
          rawShifts = shiftsData.map((d) => ({
            id: d.id,
            userId: d.user_id,
            shiftDate: d.shift_date,
            shiftTypeId: d.shift_type_id,
            startTime: d.start_time,
            endTime: d.end_time,
            location: d.location,
            notes: d.notes,
            status: d.status,
            originalShiftTypeId: d.original_shift_type_id,
            isConfirmed: d.is_confirmed,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));

          const { data: scData } = await supabase.from('shift_coworkers').select('*');
          if (scData) {
            shiftCoworkerPairs = scData.map((sc) => ({ shiftId: sc.shift_id, coworkerId: sc.coworker_id }));
          }

          const { data: tcData } = await supabase.from('shift_task_checks').select('*');
          if (tcData) {
            allTaskChecks = tcData.map((tc) => ({
              id: tc.id,
              shiftId: tc.shift_id,
              taskName: tc.task_name,
              isCompleted: tc.is_completed,
            }));
          }
        }
      } catch (e) {
        console.warn('Supabase getShifts failed, using local:', e);
      }
    }

    if (rawShifts.length === 0) {
      rawShifts = getLocalItem<Shift[]>('shifts', this.getInitialSampleShifts());
      shiftCoworkerPairs = getLocalItem<{ shiftId: string; coworkerId: string }[]>('shift_coworkers', [
        { shiftId: 'sample-shift-today', coworkerId: 'coworker-1' },
        { shiftId: 'sample-shift-today', coworkerId: 'coworker-2' },
      ]);
      allTaskChecks = getLocalItem<{ shiftId: string; taskName: string; isCompleted: boolean; id: string }[]>(
        'shift_task_checks',
        []
      );
    }

    // Combine with details
    return rawShifts.map((s) => {
      const shiftType = shiftTypesMap.get(s.shiftTypeId) || PREDEFINED_SHIFT_TYPES[0];
      const originalShiftType = s.originalShiftTypeId ? shiftTypesMap.get(s.originalShiftTypeId) : undefined;
      const assignedCoworkerIds = shiftCoworkerPairs.filter((p) => p.shiftId === s.id).map((p) => p.coworkerId);
      const shiftCoworkers = assignedCoworkerIds.map((id) => coworkersMap.get(id)).filter(Boolean) as Coworker[];

      // Filter tasks checked for this shift
      const taskChecks = allTaskChecks.filter((tc) => tc.shiftId === s.id);

      return {
        ...s,
        shiftType,
        originalShiftType,
        coworkers: shiftCoworkers,
        taskChecks,
      };
    });
  }

  static async createShift(
    shiftData: Omit<Shift, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    coworkerIds: string[] = []
  ): Promise<ShiftWithDetails> {
    const shiftId = 'shift-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const newShift: Shift = {
      ...shiftData,
      id: shiftId,
      userId: 'local-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('shifts')
            .insert({
              user_id: user.id,
              shift_date: newShift.shiftDate,
              shift_type_id: newShift.shiftTypeId,
              start_time: newShift.startTime || null,
              end_time: newShift.endTime || null,
              location: newShift.location || null,
              notes: newShift.notes || null,
              status: newShift.status,
              original_shift_type_id: newShift.originalShiftTypeId || null,
              is_confirmed: newShift.isConfirmed,
            })
            .select()
            .single();

          if (!error && data) {
            newShift.id = data.id;
            newShift.userId = data.user_id;

            // Insert coworkers
            if (coworkerIds.length > 0) {
              await supabase.from('shift_coworkers').insert(
                coworkerIds.map((cid) => ({
                  shift_id: data.id,
                  coworker_id: cid,
                }))
              );
            }
          }
        }
      } catch (e) {
        console.warn('Supabase createShift failed:', e);
      }
    }

    // Save locally
    const currentShifts = getLocalItem<Shift[]>('shifts', this.getInitialSampleShifts());
    setLocalItem('shifts', [...currentShifts, newShift]);

    if (coworkerIds.length > 0) {
      const currentPairs = getLocalItem<{ shiftId: string; coworkerId: string }[]>('shift_coworkers', []);
      const newPairs = coworkerIds.map((cid) => ({ shiftId: newShift.id, coworkerId: cid }));
      setLocalItem('shift_coworkers', [...currentPairs, ...newPairs]);
    }

    // Log creation
    await this.createChangeLog({
      shiftId: newShift.id,
      changeType: 'created',
      newShiftDate: newShift.shiftDate,
      newShiftTypeId: newShift.shiftTypeId,
      newStartTime: newShift.startTime,
      newEndTime: newShift.endTime,
      reason: 'Penambahan jadwal shift baru',
      source: 'manual',
    });

    const all = await this.getShifts();
    return all.find((s) => s.id === newShift.id) || (newShift as ShiftWithDetails);
  }

  static async updateShift(
    id: string,
    updates: Partial<Shift>,
    coworkerIds?: string[],
    changeReason?: string,
    changeSource: ShiftChangeLog['source'] = 'manual',
    sourceMessage?: string
  ): Promise<void> {
    const all = await this.getShifts();
    const oldShift = all.find((s) => s.id === id);
    if (!oldShift) return;

    // Check if there are actual changes
    const hasChanges =
      (updates.shiftDate && updates.shiftDate !== oldShift.shiftDate) ||
      (updates.shiftTypeId && updates.shiftTypeId !== oldShift.shiftTypeId) ||
      (updates.startTime && updates.startTime !== oldShift.startTime) ||
      (updates.endTime && updates.endTime !== oldShift.endTime) ||
      (updates.status && updates.status !== oldShift.status);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('shifts')
          .update({
            shift_date: updates.shiftDate,
            shift_type_id: updates.shiftTypeId,
            start_time: updates.startTime,
            end_time: updates.endTime,
            location: updates.location,
            notes: updates.notes,
            status: updates.status,
            original_shift_type_id: updates.originalShiftTypeId || oldShift.originalShiftTypeId,
            is_confirmed: updates.isConfirmed !== undefined ? updates.isConfirmed : oldShift.isConfirmed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (coworkerIds !== undefined) {
          await supabase.from('shift_coworkers').delete().eq('shift_id', id);
          if (coworkerIds.length > 0) {
            await supabase.from('shift_coworkers').insert(
              coworkerIds.map((cid) => ({
                shift_id: id,
                coworker_id: cid,
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Supabase updateShift failed:', e);
      }
    }

    // Local update
    const rawShifts = getLocalItem<Shift[]>('shifts', this.getInitialSampleShifts());
    const updatedShifts = rawShifts.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s));
    setLocalItem('shifts', updatedShifts);

    if (coworkerIds !== undefined) {
      const currentPairs = getLocalItem<{ shiftId: string; coworkerId: string }[]>('shift_coworkers', []);
      const filtered = currentPairs.filter((p) => p.shiftId !== id);
      const newPairs = coworkerIds.map((cid) => ({ shiftId: id, coworkerId: cid }));
      setLocalItem('shift_coworkers', [...filtered, ...newPairs]);
    }

    // Write change log only if actual scheduling fields changed
    if (hasChanges) {
      await this.createChangeLog({
        shiftId: id,
        changeType: updates.status === 'cancelled' ? 'cancelled' : 'updated',
        oldShiftDate: oldShift.shiftDate,
        newShiftDate: updates.shiftDate || oldShift.shiftDate,
        oldShiftTypeId: oldShift.shiftTypeId,
        newShiftTypeId: updates.shiftTypeId || oldShift.shiftTypeId,
        oldStartTime: oldShift.startTime,
        newStartTime: updates.startTime || oldShift.startTime,
        oldEndTime: oldShift.endTime,
        newEndTime: updates.endTime || oldShift.endTime,
        reason: changeReason || (updates.status === 'cancelled' ? 'Shift dibatalkan' : 'Pembaruan jadwal shift'),
        source: changeSource,
        sourceMessage,
      });
    }
  }

  static async cancelShift(id: string, reason: string = 'Pembatalan shift'): Promise<void> {
    await this.updateShift(id, { status: 'cancelled' }, undefined, reason, 'manual');
  }

  static async deleteShift(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('shift_coworkers').delete().eq('shift_id', id);
        await supabase.from('shift_task_checks').delete().eq('shift_id', id);
        await supabase.from('shifts').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteShift failed:', e);
      }
    }
    const rawShifts = getLocalItem<Shift[]>('shifts', this.getInitialSampleShifts());
    setLocalItem('shifts', rawShifts.filter((s) => s.id !== id));
    const currentPairs = getLocalItem<{ shiftId: string; coworkerId: string }[]>('shift_coworkers', []);
    setLocalItem('shift_coworkers', currentPairs.filter((p) => p.shiftId !== id));
  }

  // -------------------------------------------------------------
  // TASK CHECKLIST
  // -------------------------------------------------------------
  static async toggleTaskCheck(shiftId: string, taskName: string, isCompleted: boolean): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('shift_task_checks').upsert({
            user_id: user.id,
            shift_id: shiftId,
            task_name: taskName,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Supabase toggleTaskCheck failed:', e);
      }
    }

    const current = getLocalItem<{ shiftId: string; taskName: string; isCompleted: boolean; id: string }[]>(
      'shift_task_checks',
      []
    );
    const existingIndex = current.findIndex((tc) => tc.shiftId === shiftId && tc.taskName === taskName);

    if (existingIndex >= 0) {
      current[existingIndex].isCompleted = isCompleted;
    } else {
      current.push({
        id: 'tc-' + Date.now(),
        shiftId,
        taskName,
        isCompleted,
      });
    }
    setLocalItem('shift_task_checks', current);
  }

  // -------------------------------------------------------------
  // SHIFT CHANGE LOGS
  // -------------------------------------------------------------
  static async getChangeLogs(): Promise<ShiftChangeLog[]> {
    const shiftTypes = await this.getShiftTypes();
    const typeMap = new Map(shiftTypes.map((t) => [t.id, t]));

    let logs: ShiftChangeLog[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('shift_change_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          logs = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            shiftId: d.shift_id,
            changeType: d.change_type,
            oldShiftDate: d.old_shift_date,
            newShiftDate: d.new_shift_date,
            oldShiftTypeId: d.old_shift_type_id,
            newShiftTypeId: d.new_shift_type_id,
            oldStartTime: d.old_start_time,
            newStartTime: d.new_start_time,
            oldEndTime: d.old_end_time,
            newEndTime: d.new_end_time,
            reason: d.reason,
            source: d.source,
            sourceMessage: d.source_message,
            createdAt: d.created_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getChangeLogs failed:', e);
      }
    }

    if (logs.length === 0) {
      logs = getLocalItem<ShiftChangeLog[]>('shift_change_logs', []);
    }

    // Attach resolved shift type objects
    return logs.map((log) => ({
      ...log,
      oldShiftType: log.oldShiftTypeId ? typeMap.get(log.oldShiftTypeId) : undefined,
      newShiftType: log.newShiftTypeId ? typeMap.get(log.newShiftTypeId) : undefined,
    }));
  }

  static async createChangeLog(log: Omit<ShiftChangeLog, 'id' | 'userId' | 'createdAt'>): Promise<void> {
    const newLog: ShiftChangeLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      userId: 'local-user',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('shift_change_logs').insert({
            user_id: user.id,
            shift_id: log.shiftId || null,
            change_type: log.changeType,
            old_shift_date: log.oldShiftDate || null,
            new_shift_date: log.newShiftDate || null,
            old_shift_type_id: log.oldShiftTypeId || null,
            new_shift_type_id: log.newShiftTypeId || null,
            old_start_time: log.oldStartTime || null,
            new_start_time: log.newStartTime || null,
            old_end_time: log.oldEndTime || null,
            new_end_time: log.newEndTime || null,
            reason: log.reason || null,
            source: log.source || 'manual',
            source_message: log.sourceMessage || null,
          });
        }
      } catch (e) {
        console.warn('Supabase createChangeLog failed:', e);
      }
    }

    const current = getLocalItem<ShiftChangeLog[]>('shift_change_logs', []);
    setLocalItem('shift_change_logs', [newLog, ...current]);
  }

  // -------------------------------------------------------------
  // PERSONAL NOTES
  // -------------------------------------------------------------
  static async getNotes(): Promise<PersonalNote[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('personal_notes')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            shiftId: d.shift_id,
            noteDate: d.note_date,
            title: d.title,
            content: d.content,
            isPinned: d.is_pinned,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (e) {
        console.warn('Supabase getNotes failed:', e);
      }
    }
    return getLocalItem<PersonalNote[]>('personal_notes', [
      {
        id: 'sample-note-1',
        userId: 'local-user',
        title: 'Cek Reagen Kimia & Kontrol Alat',
        content: 'Periksa masa kedaluwarsa reagen glukosa dan kolesterol serta jalankan QC sebelum shift pagi dimulai.',
        isPinned: true,
        noteDate: getPontianakDateString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  static async createNote(note: Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PersonalNote> {
    const newNote: PersonalNote = {
      ...note,
      id: 'note-' + Date.now(),
      userId: 'local-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('personal_notes')
            .insert({
              user_id: user.id,
              shift_id: note.shiftId || null,
              note_date: note.noteDate || null,
              title: note.title,
              content: note.content,
              is_pinned: note.isPinned,
            })
            .select()
            .single();
          if (!error && data) {
            newNote.id = data.id;
            newNote.userId = data.user_id;
          }
        }
      } catch (e) {
        console.warn('Supabase createNote failed:', e);
      }
    }

    const current = await this.getNotes();
    setLocalItem('personal_notes', [newNote, ...current]);
    return newNote;
  }

  static async deleteNote(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('personal_notes').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteNote failed:', e);
      }
    }

    const current = await this.getNotes();
    setLocalItem('personal_notes', current.filter((n) => n.id !== id));
  }

  // -------------------------------------------------------------
  // REMINDERS
  // -------------------------------------------------------------
  static async getReminderSettings(): Promise<ReminderSetting> {
    const defaultSettings: ReminderSetting = {
      enabled: true,
      dayBeforeEnabled: true,
      dayBeforeTime: '20:00',
      minutesBeforeShift: 60,
      browserNotificationsEnabled: false,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('reminder_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              enabled: data.enabled,
              dayBeforeEnabled: data.day_before_enabled,
              dayBeforeTime: data.day_before_time?.slice(0, 5) || '20:00',
              minutesBeforeShift: data.minutes_before_shift || 60,
              browserNotificationsEnabled: data.browser_notifications_enabled || false,
            };
          }
        }
      } catch (e) {
        console.warn('Supabase getReminderSettings failed:', e);
      }
    }
    return getLocalItem<ReminderSetting>('reminder_settings', defaultSettings);
  }

  static async updateReminderSettings(settings: Partial<ReminderSetting>): Promise<ReminderSetting> {
    const current = await this.getReminderSettings();
    const updated = { ...current, ...settings };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('reminder_settings').upsert({
            user_id: user.id,
            enabled: updated.enabled,
            day_before_enabled: updated.dayBeforeEnabled,
            day_before_time: updated.dayBeforeTime,
            minutes_before_shift: updated.minutesBeforeShift,
            browser_notifications_enabled: updated.browserNotificationsEnabled,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Supabase updateReminderSettings failed:', e);
      }
    }

    setLocalItem('reminder_settings', updated);
    return updated;
  }

  // -------------------------------------------------------------
  // INITIAL SAMPLE SHIFTS (Seeded for Pontianak today and tomorrow)
  // -------------------------------------------------------------
  private static getInitialSampleShifts(): Shift[] {
    const today = getPontianakDateString();
    // Default today shift: BIRU
    return [
      {
        id: 'sample-shift-today',
        userId: 'local-user',
        shiftDate: today,
        shiftTypeId: '22222222-2222-2222-2222-222222222222', // BIRU
        startTime: '07:00',
        endTime: '14:00',
        location: 'Lab Patologi Klinik - Ruang Kimia Darah',
        notes: 'Shift Pagi Reguler Kimia Klinik & Elektrolit',
        status: 'scheduled',
        isConfirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // -------------------------------------------------------------
  // BACKUP & EXPORT
  // -------------------------------------------------------------
  static async exportToCsv(type: 'shifts' | 'changes' | 'coworkers'): Promise<string> {
    if (type === 'shifts') {
      const shifts = await this.getShifts();
      const headers = ['ID', 'Tanggal', 'Warna Shift', 'Jam Mulai', 'Jam Selesai', 'Lokasi', 'Status', 'Terkonfirmasi', 'Catatan'];
      const rows = shifts.map((s) => [
        s.id,
        s.shiftDate,
        s.shiftType.name,
        s.startTime || '',
        s.endTime || '',
        `"${(s.location || '').replace(/"/g, '""')}"`,
        s.status,
        s.isConfirmed ? 'Ya' : 'Belum',
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'changes') {
      const logs = await this.getChangeLogs();
      const headers = ['ID', 'Waktu Dicatat', 'Jenis Perubahan', 'Tanggal Asal', 'Tanggal Baru', 'Shift Asal', 'Shift Baru', 'Alasan', 'Sumber'];
      const rows = logs.map((l) => [
        l.id,
        l.createdAt,
        l.changeType,
        l.oldShiftDate || '',
        l.newShiftDate || '',
        l.oldShiftType?.name || '',
        l.newShiftType?.name || '',
        `"${(l.reason || '').replace(/"/g, '""')}"`,
        l.source,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'coworkers') {
      const coworkers = await this.getCoworkers();
      const headers = ['ID', 'Nama Lengkap', 'Nama Panggilan', 'Catatan', 'Aktif'];
      const rows = coworkers.map((c) => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.nickname || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        c.isActive ? 'Ya' : 'Tidak',
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return '';
  }

  static async exportToIcs(calendarTitle?: string): Promise<string> {
    const { generateIcsCalendar } = await import('../lib/icsExport.ts');
    const shifts = await this.getShifts();
    return generateIcsCalendar(shifts, calendarTitle);
  }

  static async exportFullBackupJson(): Promise<string> {
    const profile = await this.getProfile();
    const shifts = await this.getShifts();
    const coworkers = await this.getCoworkers();
    const changeLogs = await this.getChangeLogs();
    const notes = await this.getNotes();
    const reminders = await this.getReminderSettings();

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      source: 'LabShift Personal - RSUD Sultan Syarif Mohamad Alkadrie',
      profile,
      shifts,
      coworkers,
      changeLogs,
      notes,
      reminders,
    };

    return JSON.stringify(backupData, null, 2);
  }

  static async restoreBackupJson(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Format data JSON tidak valid.' };
      }

      if (data.profile) setLocalItem('profile', data.profile);
      if (Array.isArray(data.coworkers)) setLocalItem('coworkers', data.coworkers);
      if (Array.isArray(data.shifts)) {
        // Strip joined properties for storage
        const cleanShifts = data.shifts.map((s: ShiftWithDetails) => ({
          id: s.id,
          userId: s.userId,
          shiftDate: s.shiftDate,
          shiftTypeId: s.shiftTypeId,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          notes: s.notes,
          status: s.status,
          originalShiftTypeId: s.originalShiftTypeId,
          isConfirmed: s.isConfirmed,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        setLocalItem('shifts', cleanShifts);
      }
      if (Array.isArray(data.changeLogs)) setLocalItem('shift_change_logs', data.changeLogs);
      if (Array.isArray(data.notes)) setLocalItem('personal_notes', data.notes);
      if (data.reminders) setLocalItem('reminder_settings', data.reminders);

      return { success: true, message: 'Cadangan data berhasil dipulihkan.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing JSON';
      return { success: false, message: `Gagal memulihkan cadangan: ${msg}` };
    }
  }
}
