import type { Request, RequestHandler } from "express";

import { isDemoAccountModeEnabled } from "../config/env";
import { store } from "../lib/store";
import { verifyAccessToken } from "../lib/supabase/admin";
import type { Profile, Role } from "../lib/types";
import { forbidden, unauthorized } from "./errors";

/**
 * Request authentication.
 *
 * Two kinds of bearer token are accepted:
 *  - a Supabase access token (the normal path): verified with Supabase, so the
 *    identity is signed by the auth server, never asserted by the browser;
 *  - `demo.<userId>` while Supabase is not configured, so the split frontend can
 *    be tried out end to end. Those tokens stop working the moment Supabase env
 *    vars are present.
 */

export type AuthContext = {
  userId: string;
  email: string | null;
  role: Role;
  profile: Profile;
  demo: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const DEMO_PREFIX = "demo.";

function bearerToken(req: Request): string | null {
  const header = req.header("authorization") ?? "";
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
}

async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const token = bearerToken(req);
  if (!token) return null;

  if (token.startsWith(DEMO_PREFIX)) {
    if (!isDemoAccountModeEnabled()) return null;
    const profile = await store.getProfile(token.slice(DEMO_PREFIX.length));
    return profile
      ? { userId: profile.id, email: profile.email, role: profile.role, profile, demo: true }
      : null;
  }

  const user = await verifyAccessToken(token);
  if (!user) return null;
  const profile = await store.ensureProfile({ id: user.id, email: user.email });
  return { userId: profile.id, email: profile.email, role: profile.role, profile, demo: false };
}

export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.auth = (await resolveAuth(req)) ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};

export function requireAuth(): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    next();
  };
}

export function requireAdmin(): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (req.auth.role !== "admin") {
      next(forbidden("The admin area is restricted to administrators."));
      return;
    }
    next();
  };
}

/** Use inside a handler that already passed `requireAuth()`. */
export function authOf(req: Request): AuthContext {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
