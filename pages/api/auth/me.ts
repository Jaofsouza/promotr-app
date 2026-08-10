import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Não autenticado' });
  res.status(200).json(session);
}
