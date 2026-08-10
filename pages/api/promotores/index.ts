import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;

  if (req.method === 'GET') {
    const promotores = await prisma.user.findMany({
      where: { role: 'PROMOTOR' },
      select: { id: true, name: true, username: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(promotores);
  }

  if (req.method === 'POST') {
    const { name, username, password } = req.body || {};
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios' });
    }
    const existing = await prisma.user.findUnique({ where: { username: String(username).toLowerCase().trim() } });
    if (existing) return res.status(409).json({ error: 'Já existe um usuário com esse nome de login' });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, username: String(username).toLowerCase().trim(), passwordHash, role: 'PROMOTOR' },
      select: { id: true, name: true, username: true },
    });
    return res.status(201).json(user);
  }

  res.status(405).end();
}
