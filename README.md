import pypandoc
from pathlib import Path

markdown = r"""# ForgeOS

**ForgeOS** adalah aplikasi manajemen proyek yang membantu pengguna menyusun proyek, memecah tujuan menjadi tugas, melacak progres pekerjaan, dan memanfaatkan AI untuk membantu perencanaan.

> Status: pengembangan aktif. Dokumentasi ini merangkum fitur dan konfigurasi yang telah dikonfirmasi selama pengembangan; beberapa bagian dapat berubah seiring perkembangan aplikasi.

## Daftar Isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur Data](#struktur-data)
- [Persyaratan](#persyaratan)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Menghubungkan Provider AI](#menghubungkan-provider-ai)
- [Database dan Migrasi Supabase](#database-dan-migrasi-supabase)
- [Keamanan](#keamanan)
- [Pemecahan Masalah](#pemecahan-masalah)
- [Rencana Pengembangan](#rencana-pengembangan)

## Fitur

Fitur yang telah dibangun atau sedang diintegrasikan:

- **Manajemen proyek** — membuat dan mengelola proyek milik pengguna.
- **Manajemen tugas** — tugas terkait proyek, deskripsi, prioritas, dan hari pengerjaan.
- **Pelacakan status tugas** — `todo`, `in_progress`, dan `done`.
- **Perencanaan berbantuan AI** — mengirim tujuan proyek ke provider AI untuk membantu menyusun rencana.
- **Konfigurasi provider AI** — mengatur nama provider, endpoint, model, dan API key melalui aplikasi.
- **Penyimpanan API key terenkripsi** — API key provider disimpan sebagai ciphertext menggunakan AES-256-GCM di sisi server.
- **Autentikasi dan isolasi data** — data proyek, tugas, dan konfigurasi AI dibatasi berdasarkan pengguna melalui Supabase Row Level Security (RLS).

Dukungan model dan endpoint AI bergantung pada kompatibilitas provider dengan format API yang digunakan aplikasi. NVIDIA NIM dapat digunakan sebagai contoh provider apabila endpoint, model, dan kredensial yang sesuai telah dikonfigurasi.

## Teknologi

Teknologi yang telah teridentifikasi dalam proyek:

- [Next.js](https://nextjs.org/) — framework aplikasi web.
- [React](https://react.dev/) dan [TypeScript](https://www.typescriptlang.org/) — antarmuka dan pemeriksaan tipe.
- [Supabase](https://supabase.com/) — autentikasi dan PostgreSQL.
- [`@supabase/ssr`](https://www.npmjs.com/package/@supabase/ssr) — integrasi Supabase pada aplikasi Next.js.
- Node.js Crypto — enkripsi API key AI di sisi server.
- Provider AI yang kompatibel dengan endpoint aplikasi.

Versi paket yang tepat mengikuti `package.json` dan lockfile di repositori.

## Struktur Data

Database utama menggunakan tiga tabel di schema `public`.

### `projects`

Menyimpan proyek milik pengguna.

| Kolom         | Keterangan                                 |
| ------------- | ------------------------------------------ |
| `id`          | ID proyek                                  |
| `name`        | Nama proyek                                |
| `description` | Deskripsi proyek                           |
| `color`       | Warna penanda proyek                       |
| `created_at`  | Waktu pembuatan                            |
| `updated_at`  | Waktu pembaruan                            |
| `user_id`     | Pemilik proyek, merujuk ke `auth.users.id` |

### `tasks`

Menyimpan tugas yang terhubung dengan proyek.

| Kolom          | Keterangan                         |
| -------------- | ---------------------------------- |
| `id`           | ID tugas                           |
| `project_id`   | Proyek induk                       |
| `title`        | Judul tugas                        |
| `description`  | Deskripsi tugas                    |
| `is_completed` | Penanda selesai                    |
| `status`       | `todo`, `in_progress`, atau `done` |
| `priority`     | `low`, `medium`, atau `high`       |
| `day`          | Hari pengerjaan                    |
| `created_at`   | Waktu pembuatan                    |

### `ai_provider_settings`

Menyimpan konfigurasi provider AI per pengguna.

| Kolom               | Keterangan                                         |
| ------------------- | -------------------------------------------------- |
| `id`                | ID konfigurasi                                     |
| `user_id`           | Pemilik konfigurasi; satu konfigurasi per pengguna |
| `provider_name`     | Nama provider                                      |
| `base_url`          | Endpoint API                                       |
| `model`             | ID/nama model                                      |
| `encrypted_api_key` | API key dalam bentuk terenkripsi                   |
| `created_at`        | Waktu pembuatan                                    |
| `updated_at`        | Waktu pembaruan                                    |

Ketiga tabel menggunakan Row Level Security (RLS). Kebijakan tabel proyek dan konfigurasi AI membatasi akses ke data pengguna yang sedang masuk. Kebijakan tugas memeriksa kepemilikan proyek induknya.

## Persyaratan

Pastikan perangkat pengembangan memiliki:

- Node.js versi LTS yang kompatibel dengan versi Next.js pada proyek.
- npm (atau package manager yang sesuai dengan lockfile).
- Akun dan proyek Supabase.
- Kredensial provider AI jika ingin mencoba fitur AI.

## Menjalankan Secara Lokal

1. Clone repositori atau buka direktori proyek.
2. Buka terminal di direktori `ForgeOS`.
3. Pasang dependensi sesuai lockfile:

   ```bash
   npm install
   ```

4. Buat file `.env.local` di direktori utama proyek dan isi variabel yang diperlukan. Lihat [Konfigurasi Environment](#konfigurasi-environment).
5. Pastikan schema database dan kebijakan RLS sudah diterapkan pada proyek Supabase yang digunakan.
6. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

7. Buka `http://localhost:3000` di browser.

Perintah tambahan seperti `npm run build`, `npm run lint`, atau `npm run typecheck` hanya tersedia jika didefinisikan di `package.json`.

## Konfigurasi Environment

Nama variabel yang telah dikonfirmasi digunakan pada proyek:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AI_SETTINGS_ENCRYPTION_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL`: URL proyek Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key untuk mengakses Supabase dari aplikasi.
- `AI_SETTINGS_ENCRYPTION_KEY`: kunci enkripsi server untuk melindungi API key provider AI yang tersimpan.

Periksa file helper Supabase server dan route API di kode sumber untuk memastikan apakah ada variabel server tambahan yang diperlukan pada versi proyek saat ini.

### Membuat kunci enkripsi

ForgeOS menggunakan AES-256-GCM. Jika implementasi saat ini meminta kunci dalam format 64 karakter heksadesimal, kunci dapat dibuat secara lokal menggunakan Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Simpan hasilnya sebagai `AI_SETTINGS_ENCRYPTION_KEY` di `.env.local`. Jangan membagikan nilai kunci tersebut atau memasukkannya ke repositori.

**Penting:** jika data konfigurasi AI terenkripsi akan dipindahkan ke lingkungan baru, kunci enkripsi yang sama harus dipertahankan agar ciphertext lama dapat didekripsi. Jika database baru dimulai tanpa data lama, kunci baru dapat dibuat.

## Menghubungkan Provider AI

ForgeOS menyediakan halaman pengaturan provider AI. Alur umumnya:

1. Buka halaman pengaturan AI di aplikasi.
2. Masukkan nama provider.
3. Masukkan endpoint API yang kompatibel.
4. Masukkan ID model yang benar-benar tersedia pada provider.
5. Masukkan API key provider.
6. Simpan pengaturan dan coba fitur perencanaan AI.

### Contoh: NVIDIA NIM

[NVIDIA NIM](https://build.nvidia.com/) dapat dijadikan contoh untuk panduan konfigurasi provider. Model, akses gratis, kuota, dan ketersediaannya dapat berubah. Periksa halaman model NVIDIA yang dipilih untuk mengetahui endpoint, autentikasi, model ID, dan batas penggunaan terkini.

Jangan mengasumsikan semua model NVIDIA NIM gratis atau selalu tersedia. Gunakan endpoint dan model ID persis seperti yang disediakan provider.

Jangan pernah menaruh API key provider pada kode frontend, commit Git, log, issue publik, atau dokumentasi. Masukkan key hanya melalui mekanisme konfigurasi yang disediakan aplikasi.

## Database dan Migrasi Supabase

Schema awal disimpan pada file migrasi:

```text
supabase/migrations/20261018000000_initial_schema.sql
```

Migrasi tersebut mendefinisikan tabel `projects`, `tasks`, `ai_provider_settings`, indeks, constraint, RLS, dan kebijakan akses. File ini ditujukan untuk **proyek Supabase baru** dan bukan untuk dijalankan ulang pada database yang sudah memiliki tabel-tabel tersebut.

Untuk menyiapkan proyek Supabase baru:

1. Buat proyek baru di [Supabase Dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor** pada proyek baru.
3. Jalankan isi file migrasi awal satu kali.
4. Verifikasi ketiga tabel, constraint, indeks, RLS, dan kebijakannya.
5. Perbarui konfigurasi lokal agar menunjuk ke proyek baru.
6. Jalankan ForgeOS dan uji daftar/masuk pengguna, proyek, tugas, serta pengaturan AI.

Proyek Supabase baru tidak otomatis memiliki akun pengguna dari proyek lama. Pengguna perlu mendaftar atau masuk melalui sistem autentikasi proyek baru, kecuali migrasi pengguna dilakukan secara terpisah dan direncanakan dengan hati-hati.

### Catatan migrasi data

File migrasi awal hanya membuat struktur database; file tersebut tidak memindahkan data proyek, tugas, pengguna, atau pengaturan AI dari proyek lama. Sebelum migrasi produksi, buat backup dan susun prosedur migrasi data yang sesuai.

## Keamanan

- Jangan commit `.env.local` atau file yang berisi rahasia.
- Pastikan `.env.local` tercakup dalam `.gitignore`.
- Jangan pernah mengekspos Supabase service-role key di browser atau variabel berawalan `NEXT_PUBLIC_`.
- Gunakan publishable key untuk penggunaan client yang dilindungi RLS.
- Pertahankan RLS dan uji akses dengan lebih dari satu akun pengguna.
- API key provider AI harus ditangani di server dan disimpan terenkripsi.
- Lindungi `AI_SETTINGS_ENCRYPTION_KEY` seperti password penting. Kehilangan kunci dapat membuat data terenkripsi lama tidak dapat dipulihkan.
- Jangan mengirim isi `.env.local`, token, password, atau API key ke issue, chat publik, maupun repositori.

## Pemecahan Masalah

### Konfigurasi Supabase belum lengkap

Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sudah terisi pada `.env.local`. Setelah mengubah environment variable, mulai ulang server pengembangan.

### Tabel atau kolom tidak ditemukan

Pastikan migrasi diterapkan pada proyek Supabase yang benar dan nama kolom di database cocok dengan kode aplikasi.

### Pengguna tidak dapat melihat proyek atau tugas

Periksa sesi autentikasi, kepemilikan `user_id`, relasi `tasks.project_id`, dan kebijakan RLS. Jangan menonaktifkan RLS sebagai solusi permanen.

### Provider AI menolak permintaan

Periksa endpoint, model ID, API key, kuota, rate limit, dan format request yang didukung provider. Jika provider sedang sibuk atau membatasi permintaan, coba lagi nanti atau gunakan model lain yang tersedia.

### API key AI gagal didekripsi

Pastikan `AI_SETTINGS_ENCRYPTION_KEY` sama dengan kunci yang digunakan saat data tersebut dienkripsi. Jangan membuat kunci baru jika masih perlu membaca ciphertext lama.

## Rencana Pengembangan

Area pengembangan berikut dapat dijadikan panduan; ini bukan klaim bahwa seluruh item telah selesai:

- Menyelesaikan dan menguji alur migrasi Supabase.
- Menyediakan panduan provider AI yang jelas, termasuk contoh NVIDIA NIM.
- Menambah validasi dan pesan error yang mudah dipahami pada integrasi AI.
- Menguji isolasi data antar pengguna dan kebijakan RLS.
- Menyusun pengujian otomatis untuk alur proyek, tugas, dan pengaturan AI.
- Menyempurnakan dokumentasi instalasi, deployment, backup, dan pemulihan.

## Status Proyek

ForgeOS masih dalam pengembangan aktif. Gunakan README ini sebagai dokumentasi awal dan perbarui saat fitur, struktur database, atau konfigurasi berubah.
"""

output_path = Path("/mnt/data/README.md")
pypandoc.convert_text(markdown, "md", format="md", outputfile=str(output_path), extra_args=["--standalone"])
print(f"README dibuat: {output_path} ({output_path.stat().st_size} bytes)")

- `UPSTASH_REDIS_REST_URL`: URL REST database Redis Upstash.
- `UPSTASH_REDIS_REST_TOKEN`: token autentikasi Redis Upstash.

Keduanya digunakan oleh `Redis.fromEnv()` di `lib/ai-rate-limit.ts`
untuk menginisialisasi Redis yang mendukung rate limiting permintaan AI.

Simpan kedua nilai sebagai rahasia. Jangan memasukkannya ke repositori
atau membagikannya kepada pihak lain.
