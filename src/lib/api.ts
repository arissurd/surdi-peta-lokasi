/**
 * Tiny client-side helpers for calling the SURDI API.
 * All endpoints return JSON; we throw on non-2xx so callers can use try/catch.
 */

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
};

export type Location = {
  id: string;
  provenance: string | null;
  jalanMasuk: string | null;
  periode: string | null;
  lokasi: string | null;
  jenis: string | null;
  media: string | null;
  nomorJumlah: string | null;
  bagian: string | null;
  pAkuisisi: string | null;
  pPengolahan: string | null;
  pDigitalisasi: string | null;
  pRestorasi: string | null;
  noInventaris: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MapMarker = Pick<
  Location,
  | "id"
  | "lokasi"
  | "jalanMasuk"
  | "provenance"
  | "jenis"
  | "media"
  | "periode"
  | "bagian"
  | "latitude"
  | "longitude"
>;

export type ListResponse = {
  data: Location[];
  total: number;
  page: number;
  limit: number;
};

export type MapResponse = {
  markers: MapMarker[];
  total: number;
};

export type Stats = {
  totalLocations: number;
  mappedLocations: number;
  unmappedLocations: number;
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  byJenis: { name: string; count: number }[];
  byProv: { name: string; count: number }[];
  byPeriode: { name: string; count: number }[];
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
};

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    credentials: "same-origin",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const api = {
  me: () => req<{ user: AuthUser | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    req<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    req<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  register: (email: string, password: string, name?: string) =>
    req<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  // ─── Locations ───────────────────────────────────────────────────────────
  list: (params: {
    q?: string;
    jenis?: string;
    prov?: string;
    periode?: string;
    mapped?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const u = new URL("/api/locations", window.location.origin);
    if (params.q) u.searchParams.set("q", params.q);
    if (params.jenis) u.searchParams.set("jenis", params.jenis);
    if (params.prov) u.searchParams.set("prov", params.prov);
    if (params.periode) u.searchParams.set("periode", params.periode);
    if (params.mapped) u.searchParams.set("mapped", "1");
    if (params.page) u.searchParams.set("page", String(params.page));
    if (params.limit) u.searchParams.set("limit", String(params.limit));
    return req<ListResponse>(u.toString());
  },
  mapMarkers: (params: { q?: string; jenis?: string; prov?: string; periode?: string }) => {
    const u = new URL("/api/locations", window.location.origin);
    u.searchParams.set("mode", "map");
    if (params.q) u.searchParams.set("q", params.q);
    if (params.jenis) u.searchParams.set("jenis", params.jenis);
    if (params.prov) u.searchParams.set("prov", params.prov);
    if (params.periode) u.searchParams.set("periode", params.periode);
    return req<MapResponse>(u.toString());
  },
  getLocation: (id: string) =>
    req<{ data: Location }>(`/api/locations/${id}`),
  createLocation: (body: Partial<Location>) =>
    req<{ data: Location }>("/api/locations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateLocation: (id: string, body: Partial<Location>) =>
    req<{ data: Location }>(`/api/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteLocation: (id: string) =>
    req<{ ok: true }>(`/api/locations/${id}`, { method: "DELETE" }),

  // ─── Stats ───────────────────────────────────────────────────────────────
  stats: () => req<Stats>("/api/stats"),

  // ─── Admin users ────────────────────────────────────────────────────────
  listUsers: () => req<{ data: AdminUser[] }>("/api/admin/users"),
  createUser: (body: { email: string; password: string; name?: string; role?: "ADMIN" | "USER" }) =>
    req<{ data: AdminUser }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: Partial<{ email: string; name: string; password: string; role: "ADMIN" | "USER" }>) =>
    req<{ data: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    req<{ ok: true }>(`/api/admin/users/${id}`, { method: "DELETE" }),
};
