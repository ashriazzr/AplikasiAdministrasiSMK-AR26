# Setup GitHub Pages

Panduan untuk hosting aplikasi ini di GitHub Pages.

## Prasyarat

- Repository di GitHub
- Akun Supabase yang sudah dikonfigurasi

## Langkah-langkah

### 1. Konfigurasi Repository GitHub

#### a. Push Aplikasi ke GitHub

```bash
cd d:\COLLEGE\SKRIPSI\AplikasiAdministrasiSMK-AR26

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repository-name.git
git push -u origin main
```

#### b. Enable GitHub Pages

1. Buka repository di GitHub
2. Pergi ke **Settings** → **Pages**
3. Pilih **Build and deployment**
4. Source: **GitHub Actions** ✅

**Catatan:** GitHub Actions sudah dikonfigurasi di `.github/workflows/deploy.yml`

---

### 2. Setup Environment Variables di GitHub

GitHub Actions memerlukan Supabase credentials untuk build:

1. Buka repository → **Settings** → **Secrets and variables** → **Actions**
2. Tambahkan 2 secrets baru:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |

   > Ambil dari Supabase Dashboard → Settings → API

---

### 3. Konfigurasi CORS di Supabase

Agar Supabase menerima request dari GitHub Pages domain Anda:

1. Buka Supabase Dashboard
2. Pergi ke **Settings** → **API** → **CORS allowed origins**
3. Tambahkan URL GitHub Pages Anda:
   ```
   https://username.github.io
   https://username.github.io/repository-name
   ```
   
   > Pastikan untuk kedua format (dengan dan tanpa path repository)

---

### 4. Deployment Otomatis

Setelah setup selesai, aplikasi akan di-deploy otomatis setiap kali Anda push ke `main` branch:

1. Push perubahan ke GitHub:
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

2. GitHub Actions akan:
   - ✅ Install dependencies
   - ✅ Build aplikasi
   - ✅ Deploy ke GitHub Pages

3. Cek status di repository → **Actions** tab

---

### 5. Akses Aplikasi

Setelah deployment selesai, aplikasi bisa diakses di:

- **User repository**: `https://username.github.io/repository-name`
- **Organization repository**: `https://org.github.io/repository-name`

---

## Troubleshooting

### Build Gagal di GitHub Actions

- **Cek logs**: Repository → Actions → Latest workflow run
- **Pastikan env vars sudah ada**: Settings → Secrets and variables → Actions
- **Test build lokal**: `npm run build`

### Aplikasi Blank Saat di-akses

- **Cek console browser**: F12 → Console untuk error messages
- **Pastikan CORS sudah dikonfigurasi** di Supabase
- **Clear browser cache**: Ctrl+Shift+Delete

### Error: Cannot find module

- **Jalankan lokal dulu**: `npm install && npm run dev`
- **Pastikan semua dependencies terinstall**: `npm ci`

---

## Rollback

Jika ada issue, Anda bisa rollback ke versi sebelumnya:

1. Revert commit di GitHub
2. GitHub Actions akan otomatis deploy versi sebelumnya

---

## Environment Variables (.env.local)

Untuk development lokal, file `.env.local` sudah di-`.gitignore` (aman dari GitHub).

Isi dengan:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Reference

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Supabase CORS Configuration](https://supabase.com/docs/guides/api/cors)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
