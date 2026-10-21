/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ShiftType } from '../types/index.ts';

export const PONTIANAK_TIMEZONE = 'Asia/Pontianak';

export const APP_METADATA = {
  name: 'LabShift Personal',
  subtitle: 'Jadwal & Tugas Pribadi ATLM',
  hospital: 'RSUD Sultan Syarif Mohamad Alkadrie',
  city: 'Kota Pontianak, Kalimantan Barat',
  unit: 'Instalasi Laboratorium Patologi Klinik',
  sealUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Seal_of_Pontianak.svg?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original',
  localSealPath: '/seal_of_pontianak.svg',
};

export const BRAND_COLORS = {
  blush: '#FFDDDD',
  orchid: '#E3AFC9',
  sun: '#FFF83F',
  navy: '#0F172A',
  slate: '#334155',
  lightGray: '#F8FAFC',
};

export const PREDEFINED_SHIFT_TYPES: ShiftType[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'KUNING',
    name: 'Kuning',
    colorHex: '#FACC15',
    description: 'Laboratorium Urinalisis, Feses & Mikroskopik Khusus',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'BIRU',
    name: 'Biru',
    colorHex: '#3B82F6',
    description: 'Kimia Klinik, Serologi, Elektrolit & Hormon',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    code: 'UNGU',
    name: 'Ungu',
    colorHex: '#8B5CF6',
    description: 'Hematologi, Imunoserologi Khusus & Sediaan Darah',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    code: 'ABU_ABU',
    name: 'Abu-Abu',
    colorHex: '#9CA3AF',
    description: 'Operator LIS, Validasi & Pelaporan Nilai Kritis',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    code: 'HIJAU',
    name: 'Hijau',
    colorHex: '#22C55E',
    description: 'Laboratorium TB / Mikrobiologi Molekuler (TCM, BTA, PCR)',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    code: 'PINK',
    name: 'Pink',
    colorHex: '#EC4899',
    description: 'Merangkap Petugas BDRS (Bank Darah Rumah Sakit)',
    sortOrder: 6,
    isActive: true,
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    code: 'SIANG',
    name: 'Shift Siang',
    colorHex: '#0EA5E9',
    description: 'Pelayanan Laboratorium Shift Siang (Tanpa aturan warna shift pagi)',
    sortOrder: 7,
    isActive: true,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    code: 'MALAM',
    name: 'Shift Malam',
    colorHex: '#475569',
    description: 'Pelayanan Laboratorium Shift Malam (Tanpa aturan warna shift pagi)',
    sortOrder: 8,
    isActive: true,
  },
];

export const PREDEFINED_TASKS_BY_CODE: Record<string, string[]> = {
  KUNING: ['Urine', 'Feses', 'Sekret', 'Mikroskopik', 'Malaria', 'Diff', 'BTA'],
  BIRU: ['Kimia Klinik', 'Serologi', 'Kromatografi', 'Elektrolit', 'AGD', 'HbA1c', 'Imuno Serologi', 'Hormon'],
  UNGU: ['PH', 'Widal', 'Goldar', 'Tubex', 'Pembuatan sediaan darah', 'Pengecatan sediaan darah'],
  ABU_ABU: ['Operator LIS', 'Terima telepon', 'Validasi hasil', 'Lapor nilai kritis', 'Catat nilai kritis'],
  HIJAU: ['TCM', 'Pembuatan BTA', 'Pengecatan BTA', 'SARS-CoV-2 Antigen', 'PCR'],
  PINK: ['Merangkap petugas BDRS'],
  SIANG: ['Pelayanan Rutin & Cito', 'Kimia & Hematologi', 'Validasi & Pelaporan Siang'],
  MALAM: ['Pelayanan Cito Darurat', 'Bank Darah / BDRS', 'Validasi & Penanganan Sampel Malam'],
};
