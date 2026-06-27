import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { config } from '../config.js';

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.adminApiKey) {
    res.status(503).json({ error: 'ADMIN_API_KEY not configured' });
    return;
  }

  const key = req.headers['x-admin-key'] ?? req.body?.adminKey;
  if (key !== config.adminApiKey) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}
