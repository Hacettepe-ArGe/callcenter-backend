// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: { companyId: number; email?: string };
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header missing' });
    return;
  }

  // Expecting the header to be in format "Bearer <token>"
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Token missing' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { companyId: number };
    (req as AuthRequest).user = { companyId: payload.companyId };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
};

export const validateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header missing' });
    return;
  }

  // Expecting the header to be in format "Bearer <token>"
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as { companyId?: number, exp?: number };
      
      if (!payload.companyId) {
        res.status(401).json({ message: 'Invalid token payload' });
        return;
      }

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        res.status(401).json({ message: 'Token expired' });
        return;
      }

      (req as AuthRequest).user = { companyId: payload.companyId };
      next();
    } else {
      res.status(401).json({ message: 'Invalid token format' });
      return;
    }
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
};