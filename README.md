# LabShift Personal — ATLM RSUD Sultan Syarif Mohamad Alkadrie

Aplikasi manajemen jadwal dinas, deteksi bentrok shift otomatis, integrasi rekapitulasi kerja, ekstraksi chat WhatsApp AI, dan sinkronisasi real-time database Supabase untuk Analis Teknologi Laboratorium Medik (ATLM).

---

## 🚀 Panduan Deploy ke Vercel

Proyek ini telah dikonfigurasi siap pakai untuk deploy langsung ke **Vercel** (`vercel.json` dan `api/index.ts`).

### Langkah 1: Hubungkan ke GitHub / GitLab / Bitbucket
1. Unggah kode repositori ini ke akun Git Anda (GitHub, GitLab, atau Bitbucket).

### Langkah 2: Impor Proyek di Vercel Dashboard
1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New...** > **Project**.
2. Pilih repositori Git proyek LabShift Personal ini.
3. Vercel akan otomatis mendeteksi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`

### Langkah 3: Atur Environment Variables di Vercel
Pada bagian **Environment Variables** di Vercel, tambahkan variabel berikut:

| Nama Variabel | Nilai Contoh | Keterangan |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://ibqqxxgfszcualkfnmcj.supabase.co` | URL Database Supabase Anda |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` | Kunci anon Supabase Anda |
| `GEMINI_API_KEY` | *(Kunci API Google Gemini Anda)* | Opsional: Untuk AI parser chat & screenshot |

### Langkah 4: Klik Deploy
Klik tombol **Deploy**. Vercel akan membangun aplikasi frontend (SPA) dan menyediakan fungsi backend serverless di `/api/*` secara otomatis.
Aplikasi Anda akan langsung online dengan domain `https://nama-proyek.vercel.app`!
