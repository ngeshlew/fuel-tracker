import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

export const requireDriveToken = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env['DRIVE_API_TOKEN'];
  if (!expected) {
    res.status(503).json({ error: 'drive_api_disabled' });
    return;
  }

  const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  // Hashing both sides gives equal-length buffers, so the compare time doesn't leak the token length.
  if (!match?.[1] || !timingSafeEqual(digest(match[1]), digest(expected))) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  next();
};
