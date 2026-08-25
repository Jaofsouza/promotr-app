import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword, verifyPassword } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;
  if (req.method !== 'POST') return res.status(405).end();

  if (!checkRateLimit(`senha:${session.userId}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
  }

  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ error: 'Preencha a senha atual e a nova senha' });
  }
  if (String(novaSenha).length < 4) {
    return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 4 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const ok = await verifyPassword(String(senhaAtual), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

  const passwordHash = await hashPassword(String(novaSenha));
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return res.status(200).json({ ok: true });
}
