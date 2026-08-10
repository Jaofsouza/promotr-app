import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method === 'POST') {
    // Promotor salva o relatório que acabou de gerar (ao copiar/enviar no formulário).
    const {
      local, data, horaIni, horaFim, movimento, publicoDia, publicoAtingido,
      aceitacao, horarioPico, degustacao, material, vendas, textoFinal,
    } = req.body || {};

    if (!local || !data || !textoFinal) {
      return res.status(400).json({ error: 'Local, data e texto do relatório são obrigatórios' });
    }

    const report = await prisma.report.create({
      data: {
        promotorId: session.userId,
        local,
        data: new Date(data),
        horaIni, horaFim, movimento, publicoDia, publicoAtingido, aceitacao, horarioPico,
        degustacao: degustacao ?? [],
        material: material ?? [],
        vendas: vendas ?? [],
        textoFinal,
      },
    });
    return res.status(201).json(report);
  }

  if (req.method === 'GET') {
    // Promotor só vê os próprios relatórios; gestor pode filtrar por promotorId.
    const { promotorId } = req.query;
    let where: any = {};
    if (session.role === 'PROMOTOR') {
      where.promotorId = session.userId;
    } else if (promotorId) {
      where.promotorId = String(promotorId);
    }
    const reports = await prisma.report.findMany({
      where,
      orderBy: { data: 'desc' },
      include: { promotor: { select: { name: true, username: true } } },
      take: 200,
    });
    return res.status(200).json(reports);
  }

  res.status(405).end();
}
