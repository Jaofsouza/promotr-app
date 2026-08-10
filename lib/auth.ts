import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';
const COOKIE_NAME = 'promotor_session';
const SESSION_DAYS = 30;

export type SessionPayload = {
  userId: string;
  username: string;
  name: string;
  role: 'PROMOTOR' | 'GESTOR';
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

export function getSession(req: { headers: { cookie?: string } }): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

/** Usa em rotas de API que exigem login. Retorna a sessão ou já envia 401. */
export function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  role?: 'PROMOTOR' | 'GESTOR'
): SessionPayload | null {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Não autenticado' });
    return null;
  }
  if (role && session.role !== role) {
    res.status(403).json({ error: 'Sem permissão' });
    return null;
  }
  return session;
}
