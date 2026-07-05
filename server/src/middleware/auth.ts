import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required — refusing to start.');
}

export { JWT_SECRET };

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.access_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    req.user = user;
    next();
  });
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role?.toLowerCase() === 'superadmin') return next();
  res.status(403).json({ error: 'Superadmin access required' });
};

export const isAdminOrSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin') return next();
  res.status(403).json({ error: 'Admin or Superadmin access required' });
};
