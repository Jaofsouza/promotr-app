import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Edição e remoção da agenda são exclusivas do gestor — o promotor só visualiza.
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;

  const id = String(req.query.id);

  if (req.method === 'PUT') {
    const { data, local, horaIni, horaFim, observacao } = req.body || {};
    const item = await prisma.agendaItem.update({
      where: { id },
      data: {
        ...(data !== undefined && { data: new Date(data) }),
        ...(local !== undefined && { local }),
        ...(horaIni !== undefined && { horaIni }),
        ...(horaFim !== undefined && { horaFim }),
        ...(observacao !== undefined && { observacao }),
      },
    });
    return res.status(200).json(item);
  }

  if (req.method === 'DELETE') {
    await prisma.agendaItem.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
