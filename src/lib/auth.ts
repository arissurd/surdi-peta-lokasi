import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "surdi-dev-secret-change-me";
const COOKIE_NAME = "surdi_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
};

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}

export async function verifyPassword(p: string, hash: string) {
  return bcrypt.compare(p, hash);
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload || !payload.sub) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user) return null;
  // Cross-check the role against DB (in case it changed)
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return null;
  return { ...user, role: dbUser.role as "ADMIN" | "USER", name: dbUser.name };
}

export async function setAuthCookie(user: AuthUser) {
  const store = await cookies();
  const token = signToken(user);
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
