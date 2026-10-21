/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ShiftWithDetails } from '../types/index.ts';
import { addDays } from './dateUtils.ts';
import { APP_METADATA } from './constants.ts';

/**
 * Escapes characters for iCalendar text values according to RFC 5545
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats date & time strings into iCalendar local representation: YYYYMMDDTHHMMSS
 */
export function formatIcsDateTime(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return `${cleanDate}T000000`;
  }
  const parts = timeStr.trim().split(':');
  const hh = (parts[0] || '00').padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  return `${cleanDate}T${hh}${mm}00`;
}

/**
 * Generates an RFC 5545 compliant .ics string for all active shifts.
 * Compatible with Google Calendar, Apple Calendar, Microsoft Outlook, and mobile calendar apps.
 */
export function generateIcsCalendar(
  shifts: ShiftWithDetails[],
  calendarTitle: string = `Jadwal Shift ATLM - ${APP_METADATA.hospital}`
): string {
  const activeShifts = shifts.filter((s) => s.status !== 'cancelled');
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LabShift Personal//RSUD Sultan Syarif Mohamad Alkadrie//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarTitle)}`,
    'X-WR-TIMEZONE:Asia/Pontianak',
  ];

  // Timezone definition block for Asia/Pontianak (WIB UTC+7)
  lines.push(
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Pontianak',
    'X-LIC-LOCATION:Asia/Pontianak',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:WIB',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  );

  for (const shift of activeShifts) {
    const uid = `shift-${shift.id}@labshift.rsud-ssma.pontianak`;
    const summary = `Shift ${shift.shiftType.name} - ${shift.shiftType.description}`;

    // Description text with tasks and coworkers
    const descParts: string[] = [
      `Warna Shift: ${shift.shiftType.name}`,
      `Penugasan: ${shift.shiftType.description}`,
    ];

    if (shift.coworkers && shift.coworkers.length > 0) {
      descParts.push(`Rekan Shift: ${shift.coworkers.map((c) => c.name).join(', ')}`);
    }

    if (shift.notes) {
      descParts.push(`Catatan: ${shift.notes}`);
    }

    descParts.push(`Unit: ${APP_METADATA.unit} - ${APP_METADATA.hospital}`);
    descParts.push('Status: ' + (shift.isConfirmed ? 'Terkonfirmasi' : 'Perlu Konfirmasi'));

    const description = escapeIcsText(descParts.join('\n'));
    const location = escapeIcsText(
      shift.location || `${APP_METADATA.unit}, ${APP_METADATA.hospital}, Pontianak`
    );

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);

    if (shift.startTime && shift.endTime) {
      const dtStart = formatIcsDateTime(shift.shiftDate, shift.startTime);

      // Check if end time crosses midnight
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      let endDate = shift.shiftDate;
      if (endTotal <= startTotal) {
        endDate = addDays(shift.shiftDate, 1);
      }

      const dtEnd = formatIcsDateTime(endDate, shift.endTime);

      lines.push(`DTSTART;TZID=Asia/Pontianak:${dtStart}`);
      lines.push(`DTEND;TZID=Asia/Pontianak:${dtEnd}`);
    } else {
      // Full day event
      const dtStartDate = shift.shiftDate.replace(/-/g, '');
      const dtEndDate = addDays(shift.shiftDate, 1).replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${dtStartDate}`);
      lines.push(`DTEND;VALUE=DATE:${dtEndDate}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    lines.push(`STATUS:${shift.isConfirmed ? 'CONFIRMED' : 'TENTATIVE'}`);

    // Pre-shift alarm reminder 60 minutes before
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Pengingat Shift ${escapeIcsText(shift.shiftType.name)}`);
    lines.push('TRIGGER:-PT60M');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generates an .ics string for a single specific shift.
 */
export function generateSingleShiftIcs(shift: ShiftWithDetails): string {
  return generateIcsCalendar([shift], `Shift ${shift.shiftType.name} (${shift.shiftDate})`);
}

/**
 * Triggers browser download of an .ics calendar file.
 */
export function downloadIcsFile(icsContent: string, fileName: string = 'jadwal_shift_atlm.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName.endsWith('.ics') ? fileName : `${fileName}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
