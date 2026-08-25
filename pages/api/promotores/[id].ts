import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = requireAuth(req, res, 'GESTOR');
  if (!session) return;

  const id = String(req.query.id);

  // Ver um promotor específico
  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    });
    if (!user || user.role !== 'PROMOTOR') return res.status(404).json({ error: 'Não encontrado' });
    return res.status(200).json(user);
  }

  // Editar nome/usuário e/ou resetar a senha
  if (req.method === 'PATCH') {
    const alvo = await prisma.user.findUnique({ where: { id } });
    if (!alvo || alvo.role !== 'PROMOTOR') return res.status(404).json({ error: 'Não encontrado' });

    const { name, username, password } = req.body || {};
    const data: { name?: string; username?: string; passwordHash?: string } = {};

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Nome não pode ficar vazio' });
      data.name = String(name).trim();
    }

    if (username !== undefined) {
      const novoUsername = String(username).toLowerCase().trim();
      if (!novoUsername) return res.status(400).json({ error: 'Usuário não pode ficar vazio' });
      const existing = await prisma.user.findUnique({ where: { username: novoUsername } });
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: 'Já existe um usuário com esse nome de login' });
      }
      data.username = novoUsername;
    }

    if (password) {
      if (String(password).length < 4) {
        return res.status(400).json({ error: 'A senha precisa ter pelo menos 4 caracteres' });
      }
      data.passwordHash = await hashPassword(String(password));
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, role: true },
    });
    return res.status(200).json(user);
  }

  // Remover promotor
  if (req.method === 'DELETE') {
    const alvo = await prisma.user.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ error: 'Não encontrado' });
    if (alvo.role === 'GESTOR') {
      return res.status(400).json({ error: 'Não é possível excluir uma conta de gestor por aqui' });
    }
    if (alvo.id === session.userId) {
      return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
    }

    // Protege o histórico: não deixa apagar quem já tem relatórios salvos
    const numReports = await prisma.report.count({ where: { promotorId: id } });
    if (numReports > 0) {
      return res.status(409).json({
        error: `Esse promotor tem ${numReports} relatório(s) salvos e não pode ser excluído — o histórico seria perdido.`,
      });
    }

    // Sem relatórios: remove os itens de agenda dele e o usuário, tudo junto
    await prisma.$transaction([
      prisma.agendaItem.deleteMany({ where: { promotorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    return res.status(204).end();
  }

  res.status(405).end();
}
