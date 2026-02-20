import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRefine } from './handlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
    const result = await handleRefine(req.body, ip);
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    console.error('[API] /api/refine error:', message);
    return res.status(status).json({ error: message });
  }
}
