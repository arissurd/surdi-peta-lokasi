# Worklog — SURDI Peta Lokasi Arsip

---
Task ID: main
Agent: main (Super Z)
Task: Build Next.js map location app based on db_surdi.xlsx with reference to https://github.com/arissurd/frontend, integrated backend+frontend, with admin and user roles.

Work Log:
- Inspected `db_surdi.xlsx` (sheet `tb_lokasi`, 43,762 rows × 14 cols) and the reference CRA repo (Login + App with SVG floor plans + JWT auth).
- Ran `prisma db push` — schema was already in sync (User + Location models with role field).
- Created `scripts/extract_excel.py` → produced `scripts/lokasi.json` (12.28 MB, 43,762 records).
- Added missing endpoints:
  - `src/app/api/auth/login/route.ts` (POST with bcrypt verify + JWT cookie)
  - `src/app/api/admin/users/[id]/route.ts` (PATCH + DELETE with self-protection)
- Created `scripts/seed.ts` — creates default admin (admin@surdi.go.id / admin123) and user (user@surdi.go.id / user123), imports all 43,762 archive rows, geocodes via BPS province name in `jalanMasuk`.
- Ran seed — locations were already populated from a previous run; only 635 had coordinates.
- Created `scripts/backfill_geo.ts` — backfilled coordinates for 1,149 additional rows by parsing BPS province names from `jalanMasuk`. Final: 1,784 mapped / 43,762 total.
- Built client SDK `src/lib/api.ts` — typed wrappers for all auth, locations, stats, and admin/users endpoints.
- Built UI components:
  - `src/app/layout.tsx` — added `leaflet/dist/leaflet.css` import, updated metadata.
  - `src/components/MapView.tsx` — Leaflet map with OSM tiles, custom SVG marker icons, popup with archive metadata, fly-to-selected animation, ResizeObserver for invalidateSize.
  - `src/components/LoginScreen.tsx` — emerald-themed card with show/hide password, demo account hints, sonner toast feedback.
  - `src/components/ExplorePanel.tsx` — 2-column layout (sidebar search + list, map + detail), debounced filter reload (q/jenis/prov/periode), map markers capped at 2000, detail card on selection.
  - `src/components/AdminPanel.tsx` — 3 tabs: Stats (4 KPI cards + 3 breakdown bars), Users (table + create/edit dialog + delete confirm), Locations (paginated table with filters + create/edit/delete).
  - `src/components/LocationFormDialog.tsx` — 15-field form including latitude/longitude for admin to set coords manually.
  - `src/app/page.tsx` — orchestrates boot-check-auth → login or main shell. Header with tabs (Eksplorasi/Admin visible only for ADMIN role), user dropdown with role badge + logout, sticky footer.
- Ran `bun run lint` — clean, no errors.
- Verified end-to-end with Agent Browser:
  - Login as admin → tab Admin appears, explore panel loads, 1,784 markers render on the map.
  - Search "Aceh" filters list AND map markers (1,784 → 113).
  - Click list item → detail card with all 12 archive fields + coordinates renders.
  - Switch to Admin tab → all 3 subtabs work; user table shows 4 users (admin + user from seed + 2 from earlier session); location table paginates with filter UI.
  - Login as regular user → Admin tab hidden, only Explore panel accessible.
  - No browser errors, no console errors.

Stage Summary:
- Final deliverable: a single Next.js 16 app (backend + frontend in one project, no separate API server) serving a Leaflet map of Indonesian archive locations.
- Default accounts: `admin@surdi.go.id` / `admin123` (ADMIN), `user@surdi.go.id` / `user123` (USER).
- Database: 43,762 archive rows imported from `db_surdi.xlsx`, 1,784 auto-geocoded to provincial capitals (rest can be edited by admin via the Locations form).
- Auth: JWT in httpOnly cookie, 7-day TTL, route protection on POST/PATCH/DELETE for ADMIN-only.
- All persisted scripts (`extract_excel.py`, `seed.ts`, `backfill_geo.ts`, `check_geo.ts`) live under `/home/z/my-project/scripts/` for re-running or edits.

---
Task ID: denah-sync
Agent: main (Super Z)
Task: Sync kode lokasi dengan denah SVG — klik G2.R1 → tampilkan denah_g2.svg dengan r1 terhighlight.

Work Log:
- Inspected `/public/denah/*.svg` — floor plans available for buildings E5, F2, F5, F6, G2, G3, G4, G5, G6, G7, G8 (11 files). Each SVG contains `<rect id="r1" .../>` up to `<rect id="r270" .../>` style elements.
- Queried DB to map location code patterns: 20 building prefixes (E3-E7, F2-F9, G2-G8). ~5,293 unique location codes across these buildings.
- Built `src/components/DenahView.tsx`:
  - `parseLokasi()` — parses codes like "G2.R1", "G5.R201", "F4.R8.SAF9" → { building: "G2", rackCode: "R1" }.
  - `hasDenah()` — checks if a building has an SVG floor plan.
  - Fetches `/denah/denah_<building>.svg` on demand and renders inline via `dangerouslySetInnerHTML`.
  - Injects CSS classes for `.denah-rack` (hover yellow), `.denah-highlight` (red fill + drop-shadow glow).
  - Walks all `[id]` elements matching `^(r|rk|rb|ra|ry)\d+$` and tags them as clickable racks.
  - Highlights the rack matching the selected location's rackCode (case-insensitive ID lookup).
  - Smooth-scrolls the highlighted rack into view inside the scroll area.
  - Building selector dropdown to switch floor plans manually.
  - Legend footer (rak tersedia / hover / terpilih).
- Built `GET /api/locations/by-code?code=G2.R1` — returns all archive rows at that rack (24 archives at G8.R139 for testing). Handles sub-codes too (e.g. `G2.R1.SAF9` matches `code=G2.R1`). SQLite doesn't support `mode: insensitive`, so we query both upper and lower variants.
- Rewrote `src/components/ExplorePanel.tsx`:
  - Added Peta/Denah toggle buttons in the right panel header.
  - When user clicks a list row, auto-switches to Denah view if the location's building has an SVG; falls back to Peta if only coordinates are available; otherwise shows a toast.
  - Each list row now shows two badges: "denah" (emerald) and "peta"/"no coord" (emerald/amber).
  - Clicking a rack inside the SVG opens a Dialog popup listing all archives at that rack; clicking an archive in the popup selects it as the active location.
- Refactored the SVG click delegation to use `document.addEventListener('click', handler, true)` (capture phase) so it survives React re-renders of the SVG content. Walks up to 10 ancestors to find an element with a rack-pattern ID.
- Lint clean. Verified with Agent Browser:
  - Login as admin → list shows "denah" badge on every G8 row.
  - Click G8.R138 → denah_g8.svg loads, `r138` highlighted red with glow.
  - Click rack r139 inside the SVG → popup "Arsip di Rak G8.R139" with 24 archive rows.
  - Search "G5.R201" → click row → denah auto-switches from G8 to G5, `r201` highlighted in the new SVG.

Stage Summary:
- Location codes now fully synced with floor plans: any "Building.Rack" code (e.g. G2.R1, G5.R201, F4.R8) auto-loads the matching `denah_<building>.svg` and highlights the rack element by ID.
- 11 floor plans supported; locations in buildings without SVGs (E3, E4, E6, E7, F3, F4, F7, F8, F9) fall back to the map view with a toast.
- Clicking any rack (highlighted or not) inside an SVG opens a popup listing all archives at that rack, with quick-jump to a specific archive's detail.

---
Task ID: denah-fixes
Agent: main (Super Z)
Task: 4 perbaikan: (1) hapus peta dunia, (2) hover tidak aktif setelah klik rak, (3) sembunyikan kode lokasi di popup, (4) tambah fitur upload denah untuk gedung yang belum ada.

Work Log:
- (1) Hapus peta dunia: hapus import `leaflet/dist/leaflet.css` dari layout, hapus dynamic import MapView, hapus toggle Peta/Denah, hapus badge "peta"/"no coord" di list. Sekarang panel kanan hanya menampilkan DenahView. Sidebar search + list tetap, tetapi badge baris disederhanakan jadi "denah" / "no svg" / "no code".
- (2) Fix hover setelah klik rak: root cause adalah CSS rule `.denah-highlight` menimpa `:hover` karena keduanya pakai `!important` dan highlight rule ada setelahnya. Solusi: tambah rule eksplisit `.denah-rack.denah-highlight:hover` dengan warna oranye (#f97316) yang berbeda dari merah default (#dc2626) dan kuning hover biasa (#fde68a). Class `.denah-rack` sekarang juga di-reapplied setiap kali SVG render ulang (sebelumnya hanya sekali) sehingga rak yang baru dirender juga bisa di-hover. Legend footer ditambah swatch "Hover rak terpilih" (oranye).
- (3) Sembunyikan kode lokasi di popup: ubah tampilan item popup dari `<font-mono> G8.R139 </font-mono>` + jalanMasuk menjadi hanya jalanMasuk sebagai title, dengan provenance/periode/nomorJumlah sebagai subtitle. Kode rak tetap di header dialog ("Arsip di Rak G8.R139") untuk konteks, tapi tidak di setiap item.
- (4) Fitur upload denah:
  - `GET /api/denah/list` — scan `/public/denah/` untuk file `denah_<code>.svg`, return list gedung yang punya denah (default + uploaded).
  - `POST /api/denah/upload` — admin-only, multipart form dengan `building` (validated against `ALLOWED_BUILDINGS`) + `file` (max 10 MB, must contain `<svg`). Strip XML declaration, save ke `/public/denah/denah_<building>.svg`.
  - `src/components/UploadDenahDialog.tsx` — dialog dengan dropdown gedung (missing buildings ditandai "(belum ada)", existing ditandai "(ganti)"), file picker, status overview badge grid, dan catatan tentang format `id="r<nomor>"`.
  - `DenahView` sekarang punya module-level cache `availableBuildingsCache` yang di-refresh via `refreshAvailableBuildings()`. `hasDenah()` menggunakan cache ini sehingga setelah upload, gedung baru langsung terdeteksi tanpa reload halaman. `ExplorePanel` subscribe ke cache ini untuk update badge list secara live.
  - Tombol "Upload denah" muncul di sidebar search card, hanya untuk admin (diakses via form yang sama untuk semua user, tapi API menolak jika bukan admin).
- Verifikasi Agent Browser:
  - Login admin → list G8.R138 menampilkan badge "denah" (tanpa "no coord"/"peta" lagi).
  - Klik G8.R138 → denah_g8.svg muncul, r138 highlight merah.
  - Klik rak r139 di SVG → popup terbuka dengan item pertama "Departemen Gouvernment Bedrijven · 1919" (tanpa kode lokasi di tiap item).
  - Tutup popup → hover r139 yang ter-highlight → fill berubah ke oranye #f97316 (hover aktif setelah klik ✅).
  - Hover r140 (rak tidak ter-highlight) → fill berubah ke kuning #fde68a ✅.
  - Klik "Upload denah" → dialog terbuka, gedung default E3 (pertama yang belum ada).
  - Upload test_e3.svg → toast sukses, dialog tertutup.
  - Cari "E3.A1.1" → badge baris berubah dari "no svg" ke "denah".
  - Klik baris E3.A1.1 → denah_e3.svg kustom dimuat (viewBox 0 0 400 300, 6 rak).

Stage Summary:
- 4 masalah selesai: peta dunia dihapus (hanya denah rak), hover berfungsi setelah klik rak (warna oranye khusus untuk hover rak terpilih), kode lokasi dihapus dari item popup, dan fitur upload denah baru memungkinkan admin menambah/ganti SVG untuk gedung manapun (E3, F3, F4, dst) tanpa perlu deploy ulang.
- Cache gedung tersedia live-update sehingga setelah upload, badge list dan dropdown DenahView langsung menampilkan gedung baru tanpa refresh.
- API upload memiliki validasi: admin-only, kode gedung harus ada di whitelist, file harus SVG (<10 MB), strip XML declaration.
