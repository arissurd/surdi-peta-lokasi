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
