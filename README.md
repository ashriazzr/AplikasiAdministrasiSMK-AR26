
# Aplikasi Administrasi SMK

Sistem administrasi terintegrasi untuk Sekolah Menengah Kejuruan dengan fitur manajemen siswa, kelas, kegiatan, tagihan pembayaran, dan integrasi RFID.

## Fitur Utama

- **Manajemen Siswa & Kelas** - Kelola data siswa, kelas, dan rombongan belajar
- **Sistem Tagihan** - Generate dan kelola tagihan pembayaran siswa secara otomatis
- **Riwayat Pembayaran** - Catat dan pantau riwayat pembayaran siswa
- **Manajemen Kegiatan** - Kelola kegiatan administrasi dan beasiswa
- **RFID Scanner** - Integrasi dengan RFID untuk identifikasi siswa
- **Analytics & Cashflow** - Laporan keuangan dan analisis arus kas
- **Autentikasi & RLS** - Sistem login dengan role-based access control

## Teknologi

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Real-time**: Supabase Realtime
- **Hardware**: Arduino RFID Integration

## Instalasi & Setup

### Prerequisites
- Node.js 18+
- npm atau yarn
- Akun Supabase

### Langkah-langkah

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd AplikasiAdministrasiSMK-AR26
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Isi file `.env.local` dengan konfigurasi Supabase Anda:
   ```env
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

4. **Setup database**
   - Jalankan migrations di Supabase
   - Lihat `supabase/migrations/` untuk detail schema

5. **Run development server**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`

## Development

```bash
# Start development server
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── app/
│   ├── components/    # React components
│   ├── contexts/      # React contexts
│   └── routes.tsx     # Route definitions
├── styles/            # Global styles
└── main.tsx           # Entry point

supabase/
├── migrations/        # Database migrations
└── functions/         # Edge functions
```

## Database

Database dikelola melalui Supabase dengan PostgreSQL. Schema mencakup:
- `users` - User accounts
- `siswa` - Data siswa
- `kelas` - Data kelas
- `tagihan` - Tagihan pembayaran
- `kegiatan` - Kegiatan administrasi
- Dan tabel supporting lainnya

Lihat `supabase/migrations/` untuk dokumentasi schema lengkap.

## RFID Integration

Aplikasi mendukung RFID scanner via Arduino. Konfigurasi:
- Arduino code tersedia (built from sketches)
- Serial communication untuk identifikasi siswa
- Real-time data sync dengan database

## Deployment

### GitHub Pages

Aplikasi ini bisa di-deploy ke GitHub Pages dengan automatic deployment via GitHub Actions.

**Setup:**
1. Push repository ke GitHub
2. Aktifkan GitHub Pages di Settings (gunakan GitHub Actions)
3. Tambahkan environment secrets untuk Supabase credentials
4. Konfigurasi CORS di Supabase

Lihat [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) untuk panduan lengkap.

**Akses Aplikasi:**
```
https://username.github.io/repository-name
```

### Deployment Manual

```bash
# Build aplikasi
npm run build

# Hasilnya ada di folder 'dist/'
# Upload ke hosting pilihan Anda (Vercel, Netlify, GitHub Pages, dll)
```

## Lisensi

[Tentukan lisensi proyek Anda]

## Kontribusi

[Jelaskan proses kontribusi jika diperlukan]

## Support

Untuk pertanyaan atau masalah, silakan buat issue di repository ini.
  