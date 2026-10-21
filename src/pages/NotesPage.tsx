/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Search,
  ShieldAlert,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import type { PersonalNote } from '../types/index.ts';
import { formatIndonesianDate, getPontianakDateString } from '../lib/dateUtils.ts';
import { DataService } from '../services/dataService.ts';

interface Props {
  notes: PersonalNote[];
  onRefresh: () => void;
}

export const NotesPage: React.FC<Props> = ({ notes, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState(getPontianakDateString());
  const [isPinned, setIsPinned] = useState(false);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteDate(getPontianakDateString());
    setIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (n: PersonalNote) => {
    setEditingNote(n);
    setTitle(n.title);
    setContent(n.content);
    setNoteDate(n.noteDate || getPontianakDateString());
    setIsPinned(n.isPinned);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingNote) {
      await DataService.createNote({
        title: title.trim(),
        content: content.trim(),
        noteDate,
        isPinned,
      });
      await DataService.deleteNote(editingNote.id);
    } else {
      await DataService.createNote({
        title: title.trim(),
        content: content.trim(),
        noteDate,
        isPinned,
      });
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus catatan pribadi ini?')) {
      await DataService.deleteNote(id);
      onRefresh();
    }
  };

  const handleTogglePin = async (n: PersonalNote) => {
    await DataService.createNote({
      title: n.title,
      content: n.content,
      noteDate: n.noteDate,
      isPinned: !n.isPinned,
    });
    await DataService.deleteNote(n.id);
    onRefresh();
  };

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Buku Catatan Kerja ATLM
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Catatan Pribadi Laboratorium
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Catatan</span>
        </button>
      </div>

      {/* Mandatory Privacy Reminder Banner (Section 19) */}
      <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Pengingat Privasi Pasien (UU Kesehatan & Etika ATLM):</span>
          <p className="mt-0.5 text-amber-800">
            Dilarang keras mencatat nama pasien, nomor rekam medis (RM), tanggal lahir, hasil laboratorium pasien, atau data klinis identifikasi pasien lainnya ke dalam catatan pribadi ini.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari catatan reagen, operan alat, atau jadwal..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
        />
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Catatan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Gunakan untuk mencatat stok reagen, pemeliharaan instrumen analyzer, atau jadwal operan jaga.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                note.isPinned
                  ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-200/50'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{note.title}</h3>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note)}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      note.isPinned
                        ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={note.isPinned ? 'Lepas sematan' : 'Sematkan di atas'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {note.noteDate && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatIndonesianDate(note.noteDate)}</span>
                  </div>
                )}

                <p className="text-xs text-slate-700 mt-2.5 whitespace-pre-line leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400">
                <span>
                  {new Date(note.createdAt).toLocaleDateString('id-ID', {
                    timeZone: 'Asia/Pontianak',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(note)}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    title="Edit catatan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    title="Hapus catatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD / EDIT NOTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingNote ? 'Edit Catatan' : 'Buat Catatan Pribadi Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Catatan *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Stok Reagen Glukosa Habis"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Terkait Tanggal
                </label>
                <input
                  type="date"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Isi Catatan
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis informasi pengingat, catatan operan jaga, atau checklist..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinNote"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="pinNote" className="text-slate-700 font-medium">
                  Sematkan catatan ini di posisi teratas
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
