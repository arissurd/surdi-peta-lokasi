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
