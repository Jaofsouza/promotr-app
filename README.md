# Degustações — app com login, painel do gestor e agenda

App em Next.js (roda de graça no Vercel) que substitui a ferramenta HTML
única por um sistema com login por promotor, histórico de relatórios salvo,
agenda controlada pelo gestor, e catálogo de produtos editável sem precisar
mexer em código.

## O que tem aqui

- **Login** — cada promotor e o gestor têm usuário/senha próprios.
- **Tela do promotor** — o mesmo formulário de relatório de sempre (degustação,
  material, vendas, movimento, aceitação etc.), mais uma aba "Minha agenda"
  (só leitura) com a semana que o gestor montou.
- **Painel do gestor** — lista de promotores; ao clicar em um, abre o perfil
  dele com o histórico de relatórios enviados e a agenda (só o gestor edita).
- **Catálogo de produtos** — tela onde o gestor cadastra produto/sabor novo
  sem precisar pedir pra alguém mexer no código.
- Ao copiar ou enviar o relatório pro WhatsApp, ele já é salvo no banco
  automaticamente e o formulário zera pro próximo.

## Passo a passo pra colocar no ar

### 1. Criar um banco Postgres gratuito
Use o **Neon** (neon.tech) ou o **Supabase** (supabase.com) — os dois têm
plano gratuito suficiente pra esse uso. Crie o projeto e copie a
"connection string" (algo como `postgresql://usuario:senha@host/banco`).

### 2. Subir o código num repositório
Crie um repositório no GitHub e suba esta pasta inteira (menos `node_modules`
e `.next`, que não devem ir pro repositório — o `.gitignore` já cuida disso).

### 3. Importar o projeto na Vercel
Em vercel.com, "Add New Project" → selecione o repositório. Antes de
clicar em Deploy, configure as variáveis de ambiente (Settings →
Environment Variables):

- `DATABASE_URL` — a connection string do passo 1
- `JWT_SECRET` — qualquer texto longo e aleatório (gere um com
  `openssl rand -base64 32` no terminal, ou peça pra mim gerar um)

### 4. Criar as tabelas no banco
Depois do primeiro deploy (ou antes, rodando localmente com o `.env`
apontando pro mesmo banco), rode:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Isso cria as tabelas e já deixa dois usuários prontos pra testar:

- Gestor: usuário `gestor`, senha `trocar123`
- Promotor de exemplo: usuário `joao`, senha `trocar123`

**Troque essas senhas assim que entrar pela primeira vez** (por enquanto
a troca de senha se faz direto no banco ou recriando o usuário pelo painel
— posso adicionar uma tela de "trocar minha senha" se você quiser).

### 5. Cadastrar os outros promotores e produtos
Logado como gestor, use "+ Novo promotor" na tela inicial pra criar o
login de cada um, e "Catálogo de produtos" pra ajustar/adicionar produtos
e sabores sempre que precisar — sem precisar me acionar.

## Rodando localmente pra testar antes de publicar

```bash
npm install
cp .env.example .env   # edite com sua DATABASE_URL e JWT_SECRET
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Abre em `http://localhost:3000`.

## Estrutura do projeto

- `prisma/schema.prisma` — as 4 tabelas: usuários, produtos/sabores,
  relatórios e agenda.
- `pages/api/` — toda a lógica de backend (login, CRUD de produtos,
  relatórios, agenda, promotores).
- `pages/promotor/` — tela do promotor.
- `pages/gestor/` — telas do gestor.
- `lib/auth.ts` — login, senha e sessão.
- `lib/prisma.ts` — conexão com o banco.

## Próximos passos possíveis (não incluídos ainda)

- Tela de "trocar minha senha" pro promotor e pro gestor.
- Exportar o histórico de relatórios em planilha.
- Soma automática de vendas por produto no período, pro gestor bater o
  olho sem abrir promotor por promotor.
