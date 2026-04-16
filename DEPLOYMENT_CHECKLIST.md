# GitHub Pages Deployment Checklist

Daftar item yang perlu dikonfigurasi sebelum deploy ke GitHub Pages.

## ✅ Pre-Deployment Checklist

- [ ] Repository sudah di-push ke GitHub
- [ ] `.github/workflows/deploy.yml` ada di repository
- [ ] `GITHUB_PAGES_SETUP.md` sudah dibaca

## ✅ GitHub Repository Setup

- [ ] Repository settings → Pages
- [ ] Source: dipilih **GitHub Actions**
- [ ] Branch: `main`

## ✅ GitHub Secrets Setup

Pergi ke: **Settings** → **Secrets and variables** → **Actions**

- [ ] `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`

## ✅ Supabase CORS Setup

Pergi ke: **Supabase Dashboard** → **Settings** → **API**

- [ ] Tambahkan `https://username.github.io` 
- [ ] Tambahkan `https://username.github.io/repository-name`

## ✅ Push ke GitHub

```bash
git add .
git commit -m "Setup GitHub Pages deployment"
git push origin main
```

## ✅ Verifikasi Deployment

1. Buka repository → **Actions** tab
2. Tunggu workflow `Deploy to GitHub Pages` selesai (hijau ✓)
3. Buka `https://username.github.io/repository-name`

---

## 🔗 Reference Links

- GitHub Pages: https://github.com/username/repository-name/settings/pages
- GitHub Secrets: https://github.com/username/repository-name/settings/secrets/actions
- GitHub Actions: https://github.com/username/repository-name/actions
- Supabase Dashboard: https://app.supabase.com

---

## 📝 Notes

- GitHub Actions workflow akan otomatis trigger setiap push ke main
- Deployment biasanya selesai dalam 2-5 menit
- Cache GitHub Pages biasanya refresh dalam 10 menit

Jika ada masalah, lihat [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) bagian Troubleshooting.
