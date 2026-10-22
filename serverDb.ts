/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'labshift_db.json');

export interface ServerUser {
  id: string;
  email: string;
  password?: string;
  displayName: string;
  role?: string;
  workUnit?: string;
  createdAt: string;
}

export interface ServerDatabase {
  users: ServerUser[];
  profile: {
    displayName: string;
    jobTitle: string;
    workUnit: string;
    photoUrl?: string;
  };
  shifts: any[];
  shift_coworkers: { shiftId: string; coworkerId: string }[];
  coworkers: any[];
  coworker_matrix_assignments: { coworkerId: string; date: string; shiftTypeId: string }[];
  change_logs: any[];
  notes: any[];
  reminders: any;
  updatedAt: string;
}

const DEFAULT_DB: ServerDatabase = {
  users: [
    {
      id: 'default-atlm-user-id',
      email: 'atlm@rsudssma.pontianak.go.id',
      password: 'atlm123',
      displayName: 'ATLM Patologi Klinik',
      role: 'Ahli Teknologi Laboratorium Medik',
      workUnit: 'Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  profile: {
    displayName: 'ATLM Patologi Klinik',
    jobTitle: 'Ahli Teknologi Laboratorium Medik (ATLM)',
    workUnit: 'Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie Pontianak',
  },
  shifts: [],
  shift_coworkers: [],
  coworkers: [
    {
      id: '00000000-0000-4000-a000-000000000010',
      userId: 'default-atlm-user-id',
      name: 'Siti Rahma, A.Md.AK',
      nickname: 'Siti',
      notes: 'Penanggung Jawab Hematologi',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-a000-000000000011',
      userId: 'default-atlm-user-id',
      name: 'Budi Santoso, S.Tr.Kes',
      nickname: 'Budi',
      notes: 'Penanggung Jawab Kimia Darah',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-4000-a000-000000000012',
      userId: 'default-atlm-user-id',
      name: 'Dewi Sartika, A.Md.AK',
      nickname: 'Dewi',
      notes: 'Penanggung Jawab Urinalisis & BDRS',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  coworker_matrix_assignments: [],
  change_logs: [],
  notes: [],
  reminders: {
    enabled: true,
    dayBeforeEnabled: true,
    dayBeforeTime: '20:00',
    minutesBeforeShift: 60,
    browserNotificationsEnabled: false,
  },
  updatedAt: new Date().toISOString(),
};

export function getDatabase(): ServerDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DB,
      ...parsed,
      users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_DB.users,
      coworkers: Array.isArray(parsed.coworkers) ? parsed.coworkers : DEFAULT_DB.coworkers,
      shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
      shift_coworkers: Array.isArray(parsed.shift_coworkers) ? parsed.shift_coworkers : [],
      coworker_matrix_assignments: Array.isArray(parsed.coworker_matrix_assignments) ? parsed.coworker_matrix_assignments : [],
    };
  } catch (err) {
    console.error('Error reading labshift_db.json:', err);
    return DEFAULT_DB;
  }
}

export function saveDatabase(data: ServerDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing labshift_db.json:', err);
  }
}
