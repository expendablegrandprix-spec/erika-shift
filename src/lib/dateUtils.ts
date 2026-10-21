/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PONTIANAK_TIMEZONE } from './constants.ts';

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

/**
 * Returns current date string in Asia/Pontianak timezone in YYYY-MM-DD format
 */
export function getPontianakDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PONTIANAK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current time string in Asia/Pontianak in HH:mm 24-hour format
 */
export function getPontianakTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: PONTIANAK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Format a YYYY-MM-DD string into Indonesian date: e.g. "20 Oktober 2026"
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return dateStr;
  }
  return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
}

/**
 * Format a YYYY-MM-DD string into full Indonesian date with Day: e.g. "Selasa, 20 Oktober 2026"
 */
export function formatIndonesianFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dateObj = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12));
  const dayName = INDONESIAN_DAYS[dateObj.getUTCDay()];
  return `${dayName}, ${formatIndonesianDate(dateStr)}`;
}

/**
 * Get weekday name in Indonesian for YYYY-MM-DD
 */
export function getIndonesianDayName(dateStr: string): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dateObj = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12));
  return INDONESIAN_DAYS[dateObj.getUTCDay()];
}

/**
 * Helper to add days to a YYYY-MM-DD date string
 */
export function addDays(dateStr: string, daysToAdd: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dateObj = new Date(Date.UTC(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12));
  dateObj.setUTCDate(dateObj.getUTCDate() + daysToAdd);
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if a date string is today in Pontianak timezone
 */
export function isTodayInPontianak(dateStr: string): boolean {
  return dateStr === getPontianakDateString();
}

/**
 * Parses time string "HH:mm" into minutes from start of day (0 to 1439)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight to "HH:mm"
 */
export function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Calculates start and end timestamps in minutes for an interval.
 * If endTime is less than or equal to startTime, it crosses midnight into the next day (+1440 mins).
 */
export function getIntervalRange(startTime?: string, endTime?: string): { start: number; end: number; crossesMidnight: boolean } | null {
  if (!startTime || !endTime) return null;
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  let crossesMidnight = false;
  if (end <= start) {
    end += 1440; // Next day
    crossesMidnight = true;
  }
  return { start, end, crossesMidnight };
}
