import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const { category } = req.query;
    const products = await prisma.product.findMany({
      where: category ? { category: String(category) } : undefined,
      include: { flavors: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json(products);
  }

  if (req.method === 'POST') {
    if (session.role !== 'GESTOR') return res.status(403).json({ error: 'Sem permissão' });
    const { name, matName, category, suggestion, defaultQty, color, flavors } = req.body || {};
    if (!name || !category) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
    }
    const product = await prisma.product.create({
      data: {
        name,
        matName: matName || null,
        category, // "DEGUSTACAO" ou "VENDA"
        suggestion: suggestion || null,
        defaultQty: defaultQty ?? 2,
        color: color || '#8b0000',
        flavors: {
          create: Array.isArray(flavors) ? flavors.filter(Boolean).map((f: string) => ({ name: f })) : [],
        },
      },
      include: { flavors: true },
    });
    return res.status(201).json(product);
  }

  res.status(405).end();
}
