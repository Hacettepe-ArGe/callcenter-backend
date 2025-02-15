import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

interface CompanyRequest extends Request {
  company?: {
    id: number;
    email: string;
    name: string;
  };
}

const prisma = new PrismaClient();

export const checkCompanyAssociation = async (
  req: CompanyRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const company = req.company;

    if (!company || !company.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userCompany = await prisma.company.findFirst({
      where: {
        id: company.id,
        workers: {
          some: {
            id: company.id
          }
        }
      }
    });

    if (!userCompany) {
      return res.status(403).json({ 
        error: 'Forbidden: You do not have permission to access this company\'s data' 
      });
    }

    next();
  } catch (error) {
    console.error('Company association check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 