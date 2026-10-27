# SURDI — Peta Lokasi Arsip

Sistem Penelusuran Digital Arsip dengan denah rak interaktif, pencarian multi-kriteria, dan manajemen pengguna (admin/user).

## Fitur Utama

- **Denah Rak Interaktif** — Klik kode lokasi (mis. `G2.R190`) untuk menampilkan denah gedung dan highlight rak yang sesuai. Support zoom in/out (tombol + scroll wheel), drag-to-pan, dan klik rak untuk melihat daftar arsip.
- **Pencarian Multi-Kriteria** — Cari berdasarkan kode lokasi, jalan masuk, no inventaris, jenis, provenance, periode, dan gedung.
- **Manajemen Pengguna** — Admin dapat membuat/edit/hapus akun dengan role ADMIN atau USER.
- **Manajemen Lokasi** — CRUD lengkap untuk data arsip dengan pagination dan filter.
- **Upload Denah SVG** — Admin dapat mengunggah file SVG floor plan untuk gedung yang belum tersedia.
- **Hapus Denah** — Admin dapat menghapus denah yang sudah diupload.
- **Export/Import Excel** — Export data arsip ke `.xlsx` (sesuai filter) dan import data baru dari Excel (mode append/replace).
- **Tema Minimalis** — Terinspirasi dari desain minimalis Jepang (terracotta `#BA5D5D`, navy `#232837`, putih soft `#F7F6F4`).
- **Responsive Mobile** — Layout single-column di mobile dengan sidebar yang selalu visible.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite)
- **Auth**: JWT cookie (httpOnly, 7-day TTL) + bcrypt
- **Font**: Noto Sans JP
- **Icons**: Lucide React

## Akun Demo

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | `admin@surdi.go.id`   | `admin123` |
| User  | `user@surdi.go.id`    | `user123`  |

## Setup

```bash
# Install dependencies
bun install

# Push Prisma schema to SQLite
bun run db:push

# Seed database (default users + import from db_surdi.xlsx)
python3 scripts/extract_excel.py   # Extract Excel to JSON
bun run scripts/seed.ts             # Seed DB

# Start dev server
bun run dev
```

## Struktur Database

### User
- `id`, `email`, `name`, `password` (bcrypt), `role` (ADMIN/USER), `createdAt`, `updatedAt`

### Location (tb_lokasi)
- `id`, `provenance`, `jalanMasuk`, `periode`, `lokasi`, `jenis`, `media`, `nomorJumlah`, `bagian`, `pAkuisisi`, `pPengolahan`, `pDigitalisasi`, `pRestorasi`, `noInventaris`, `createdAt`, `updatedAt`

## API Endpoints

| Method | Endpoint                          | Deskripsi                          | Auth     |
|--------|-----------------------------------|------------------------------------|----------|
| POST   | `/api/auth/login`                 | Login dengan email + password      | Public   |
| POST   | `/api/auth/register`              | Register akun baru                 | Public   |
| GET    | `/api/auth/me`                    | Get current user                   | Cookie   |
| POST   | `/api/auth/logout`                | Logout                             | Cookie   |
| GET    | `/api/locations`                  | List locations (filter + paginate) | Cookie   |
| POST   | `/api/locations`                  | Create location                    | ADMIN    |
| GET    | `/api/locations/[id]`             | Get location by ID                 | Cookie   |
| PATCH  | `/api/locations/[id]`             | Update location                    | ADMIN    |
| DELETE | `/api/locations/[id]`             | Delete location                    | ADMIN    |
| GET    | `/api/locations/by-code?code=`    | Get archives at same rack code     | Cookie   |
| GET    | `/api/locations/export`           | Export to XLSX                     | Cookie   |
| POST   | `/api/locations/import`           | Import from XLSX                   | ADMIN    |
| GET    | `/api/stats`                      | Dashboard statistics               | Cookie   |
| GET    | `/api/admin/users`                | List all users                     | ADMIN    |
| POST   | `/api/admin/users`                | Create user                        | ADMIN    |
| PATCH  | `/api/admin/users/[id]`           | Update user                        | ADMIN    |
| DELETE | `/api/admin/users/[id]`           | Delete user                        | ADMIN    |
| GET    | `/api/denah/list`                 | List available floor plans        | Public   |
| POST   | `/api/denah/upload`               | Upload SVG floor plan              | ADMIN    |
| DELETE | `/api/denah/[building]`           | Delete SVG floor plan              | ADMIN    |

## Denah Rak (Floor Plans)

Denah tersedia untuk gedung: E5, F2, F5, F6, G2, G3, G4, G5, G6, G7, G8.

Format SVG harus memiliki elemen dengan `id="r<nomor>"` (mis. `id="r1"`, `id="r201"`) agar sinkron dengan kode lokasi seperti `G2.R1`.

## License

MIT
