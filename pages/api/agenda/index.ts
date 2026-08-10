import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    // Promotor só vê a própria agenda; gestor pode filtrar por promotorId.
    const { promotorId, from, to } = req.query;
    let where: any = {};
    if (session.role === 'PROMOTOR') {
      where.promotorId = session.userId;
    } else if (promotorId) {
      where.promotorId = String(promotorId);
    }
    if (from || to) {
      where.data = {};
      if (from) where.data.gte = new Date(String(from));
      if (to) where.data.lte = new Date(String(to));
    }
    const items = await prisma.agendaItem.findMany({ where, orderBy: { data: 'asc' } });
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    // Só o gestor monta/dispara a agenda.
    if (session.role !== 'GESTOR') return res.status(403).json({ error: 'Sem permissão' });
    const { promotorId, data, local, horaIni, horaFim, observacao } = req.body || {};
    if (!promotorId || !data || !local || !horaIni || !horaFim) {
      return res.status(400).json({ error: 'Promotor, data, local e horários são obrigatórios' });
    }
    const item = await prisma.agendaItem.create({
      data: { promotorId, data: new Date(data), local, horaIni, horaFim, observacao: observacao || null },
    });
    return res.status(201).json(item);
  }

  res.status(405).end();
}
