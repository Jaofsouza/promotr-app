import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;

  const id = String(req.query.id);

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Não encontrado' });
    return res.status(200).json(user);
  }

  res.status(405).end();
}
