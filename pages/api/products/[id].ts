import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;

  const id = String(req.query.id);

  if (req.method === 'PUT') {
    const { name, matName, suggestion, defaultQty, color, flavors } = req.body || {};
    // Substitui a lista de sabores por completo (mais simples e previsível do que fazer diff).
    if (Array.isArray(flavors)) {
      await prisma.flavor.deleteMany({ where: { productId: id } });
    }
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(matName !== undefined && { matName }),
        ...(suggestion !== undefined && { suggestion }),
        ...(defaultQty !== undefined && { defaultQty }),
        ...(color !== undefined && { color }),
        ...(Array.isArray(flavors) && {
          flavors: { create: flavors.filter(Boolean).map((f: string) => ({ name: f })) },
        }),
      },
      include: { flavors: true },
    });
    return res.status(200).json(product);
  }

  if (req.method === 'DELETE') {
    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
