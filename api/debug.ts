import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {};
  
  // Check 1: Environment variable
  checks['GEMINI_API_KEY'] = process.env.GEMINI_API_KEY ? 'SET (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'NOT SET';
  
  // Check 2: Node version
  checks['node_version'] = process.version;
  
  // Check 3: Try importing @google/genai
  try {
    const genai = await import('@google/genai');
    checks['genai_import'] = 'OK (keys: ' + Object.keys(genai).slice(0, 5).join(', ') + ')';
  } catch (e: any) {
    checks['genai_import'] = 'FAILED: ' + e.message;
  }
  
  // Check 4: Try importing shared module
  try {
    const shared = await import('./handlers');
    checks['shared_import'] = 'OK (keys: ' + Object.keys(shared).join(', ') + ')';
  } catch (e: any) {
    checks['shared_import'] = 'FAILED: ' + e.message;
  }
  
  res.status(200).json(checks);
}
