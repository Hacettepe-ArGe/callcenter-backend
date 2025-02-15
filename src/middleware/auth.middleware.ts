import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Bypass authentication if TEST_MODE is enabled and test company ID is provided
    if (process.env.TEST_MODE === 'true' && req.query.companyId) {
      const testCompany = await prisma.company.findUnique({
        where: { id: Number(req.query.companyId) },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      if (testCompany) {
        req.company = testCompany;
        return next();
      }
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      email: string;
    };

    const company = await prisma.company.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!company) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.company = company;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}; 