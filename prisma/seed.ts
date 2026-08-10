import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Catálogo inicial — o gestor pode editar/adicionar mais depois pela tela de admin.
const DEGUSTACAO_PRODUCTS = [
  { name: 'Whey 100%', matName: 'dose whey 100%', color: '#8b0000', suggestion: '3–4 doses', defaultQty: 3,
    flavors: ['Coco com baunilha', 'Cookies', 'Banoff', 'Chocolate com avelã', 'Torta de limão'] },
  { name: 'Alfajor', matName: 'alfajor', color: '#d4af37', suggestion: '2–4 unidades', defaultQty: 2,
    flavors: ['Cookies', 'Morango', 'Banoff', 'Caramelo salgado', 'Avelã'] },
  { name: 'Super Bar', matName: 'super bar', color: '#3b82f6', suggestion: '2–4 unidades', defaultQty: 2,
    flavors: ['Chocolate com avelã', 'Leitinho', 'Torta de limão', 'Banoff'] },
  { name: 'Protein Brownie', matName: 'protein brownie', color: '#a0522d', suggestion: '2–4 unidades', defaultQty: 2,
    flavors: ['Avelã', 'Chocolate'] },
  { name: 'Snack Yamo', matName: 'snack Yamo', color: '#10b981', suggestion: '3–5 unidades', defaultQty: 3,
    flavors: ['Churrasco', 'Ervas finas', 'Bacon', 'Queijo', 'Presunto', 'Requeijão'] },
  { name: 'Pré-treino Turbo', matName: 'pré-treino turbo', color: '#8b5cf6', suggestion: '2–4 unidades', defaultQty: 2,
    flavors: ['Limão', 'Frutas vermelhas'] },
  { name: 'Bolinho Yamo', matName: 'bolinho Yamo', color: '#f97316', suggestion: '2–4 unidades', defaultQty: 2,
    flavors: ['Cenoura com chocolate', 'Chocolate'] },
];

const VENDA_ONLY_PRODUCTS = [
  { name: 'Sachê Whey 100%', color: '#9333ea',
    flavors: ['Banoff', 'Torta de limão', 'Cookies', 'Maracujá', 'Chocolate com avelã', 'Baunilha com coco'] },
  { name: 'Creatina', color: '#64748b', flavors: [] as string[] },
  { name: 'Pão de mel proteico', color: '#b45309', flavors: [] as string[] },
];

async function main() {
  // Usuário gestor inicial — troque a senha depois de logar pela primeira vez.
  const gestorPassword = await bcrypt.hash('trocar123', 10);
  await prisma.user.upsert({
    where: { username: 'gestor' },
    update: {},
    create: {
      username: 'gestor',
      passwordHash: gestorPassword,
      name: 'Gestor',
      role: 'GESTOR',
    },
  });

  // Um promotor de exemplo — João pode trocar a senha e cadastrar os demais pelo painel.
  const promotorPassword = await bcrypt.hash('trocar123', 10);
  await prisma.user.upsert({
    where: { username: 'joao' },
    update: {},
    create: {
      username: 'joao',
      passwordHash: promotorPassword,
      name: 'João Victor De Souza',
      role: 'PROMOTOR',
    },
  });

  for (const p of DEGUSTACAO_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, category: 'DEGUSTACAO' } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name: p.name,
        matName: p.matName,
        color: p.color,
        suggestion: p.suggestion,
        defaultQty: p.defaultQty,
        category: 'DEGUSTACAO',
        flavors: { create: p.flavors.map((f) => ({ name: f })) },
      },
    });
  }

  for (const p of VENDA_ONLY_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, category: 'VENDA' } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name: p.name,
        color: p.color,
        category: 'VENDA',
        defaultQty: 1,
        flavors: { create: p.flavors.map((f) => ({ name: f })) },
      },
    });
  }

  console.log('Seed concluído. Usuários: gestor/trocar123 e joao/trocar123 — troque as senhas em produção.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
