import type { NextApiRequest } from 'next';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Limitador de taxa simples, em memória, por chave (ex: "login:<ip>").
 *
 * Importante: como o app roda em funções serverless (Vercel), cada instância
 * "quente" tem seu próprio contador — não é um limite 100% distribuído/global.
 * Ainda assim, já dificulta bastante um script simples tentando várias senhas
 * em sequência, que é o cenário mais comum. Se um dia o tráfego justificar um
 * limite realmente global, trocar por algo como Upstash Redis.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}

export function getClientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.socket?.remoteAddress || 'unknown';
}
