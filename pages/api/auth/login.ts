import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req);
  if (!checkRateLimit(`login:${ip}`, 10, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const user = await prisma.user.findUnique({ where: { username: String(username).toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Usuário ou senha inválidos' });

  const token = signSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  setSessionCookie(res, token);

  res.status(200).json({ id: user.id, name: user.name, role: user.role });
}
