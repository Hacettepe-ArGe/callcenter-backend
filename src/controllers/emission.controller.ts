import { Request, Response } from 'express'
import { EmissionService } from '../services/emission.service'
import { EmissionType, EmissionScope } from '@prisma/client'
import { NextFunction } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { validateEmissionDate } from '../utils/dateValidation'
import prisma from '../config/prisma'

const emissionService = new EmissionService()

// Şirketin 12 aylık emisyon verilerini getir
export const getEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const companyId = (req as AuthRequest).user?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const emissions = await emissionService.getCompanyEmissions(companyId);
    res.status(200).json({
      success: true,
      data: emissions
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Yeni çalışan oluştur veya şirket emisyonu ekle
export const postEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const companyId = (req as AuthRequest).user?.companyId;
    const { department, name, type, category, amount, scope } = req.body;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    // Eğer name varsa, yeni çalışan oluştur
    if (name) {
      const worker = await emissionService.createOrUpdateWorker(
        null,
        companyId,
        {
          department,
          name
        }
      );
      res.status(201).json({
        success: true,
        data: worker
      });
    } 
    // Eğer name yoksa ve scope SIRKET ise, şirket emisyonu oluştur
    else if (scope === 'SIRKET') {
      const emission = await emissionService.calculateEmission(
        type as EmissionType,
        category,
        amount,
        scope as EmissionScope,
        null, // workerId null olacak
        companyId
      );
      
      res.status(201).json({
        success: true,
        data: emission
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Geçersiz istek. Çalışan oluşturmak için name gerekli, şirket emisyonu için scope SIRKET olmalı.' 
      });
    }

  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Şirket bilgilerini güncelle
export const updateEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const companyId = (req as AuthRequest).user?.companyId;
    const { name, email } = req.body;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const company = await emissionService.updateCompany(companyId, { name, email });
    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Şirket emisyon verilerini sil
export const deleteEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const companyId = (req as AuthRequest).user?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    await emissionService.deleteCompanyEmissions(companyId);
    res.status(200).json({
      success: true,
      message: 'Şirket emisyon verileri başarıyla silindi'
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Çalışanın emisyon verilerini getir
export const getUserEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // worker id
    const companyId = (req as AuthRequest).user?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    const emissions = await emissionService.getWorkerEmissions(parseInt(id), companyId);
    res.status(200).json({
      success: true,
      data: emissions
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Çalışan için yeni emisyon kaydı oluştur
export const postUserEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // worker id
    const { type, category, amount, scope, name, department } = req.body; // name ve department ekledik
    const companyId = (req as AuthRequest).user?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    // Önce worker'ı oluştur veya güncelle
    const worker = await emissionService.createOrUpdateWorker(
      parseInt(id),
      companyId,
      {
        department,
        name
      }
    );

    // Sonra emisyon kaydını oluştur
    const emission = await emissionService.createWorkerEmission(
      worker.id,
      companyId,
      {
        type: type as EmissionType,
        category,
        amount,
        scope: scope as EmissionScope
      }
    );

    res.status(201).json({
      success: true,
      data: {
        worker,
        emission
      }
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Çalışanın emisyon kaydını güncelle
export const updateUserEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // emission id
    const { type, category, amount, scope } = req.body;
    const companyId = (req as AuthRequest).user?.companyId;
    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }
    const emission = await emissionService.updateWorkerEmission(
      parseInt(id),
      companyId,
      {
        type: type as EmissionType,
        category,
        amount,
        scope: scope as EmissionScope
      }
    );
    res.status(200).json({
      success: true,
      data: emission
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Çalışanın emisyon kaydını sil
export const deleteUserEmission = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // emission id
    const companyId = (req as AuthRequest).user?.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'Şirket bilgisi bulunamadı' });
      return;
    }

    await emissionService.deleteWorkerEmission(parseInt(id), companyId);
    res.status(200).json({
      success: true,
      message: 'Emisyon kaydı başarıyla silindi'
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
}

export const getEmissionFactors = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const { scope } = req.params
    const factors = await emissionService.getEmissionFactors(scope as EmissionScope)
    res.json(factors)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getTotalEmissions = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = (req as AuthRequest).user?.companyId;
    
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: 'Şirket ID bulunamadı'
      });
      return;
    }

    const totalEmissions = await emissionService.calculateTotalEmissions(companyId);
    
    res.status(200).json({
      success: true,
      data: {
        totalEmissions,
        unit: 'KG_CO2',
        calculatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Toplam emisyon hesaplanırken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};

export const createEmission = async (req: Request, res: Response) => {
  try {
    const { date, ...emissionData } = req.body;
    
    // Validate emission date
    const dateValidation = validateEmissionDate(new Date(date));
    if (!dateValidation.isValid) {
      res.status(400).json({ error: dateValidation.message });
      return;
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: parseInt(emissionData.companyId) }
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Check if worker exists if workerId is provided
    if (emissionData.workerId) {
      const worker = await prisma.worker.findFirst({
        where: { 
          id: parseInt(emissionData.workerId),
          companyId: parseInt(emissionData.companyId)
        }
      });

      if (!worker) {
        res.status(404).json({ error: 'Worker not found or does not belong to the company' });
        return;
      }
    }

    // Validate emission type and category
    const emissionFactor = await prisma.emissionFactor.findFirst({
      where: {
        type: emissionData.type,
        category: emissionData.category
      }
    });

    if (!emissionFactor) {
      res.status(400).json({ error: 'Invalid emission type or category' });
      return;
    }

    // Calculate carbon value based on emission factor
    const carbonValue = emissionData.amount * emissionFactor.emissionFactor;

    const emission = await prisma.emission.create({
      data: {
        ...emissionData,
        carbonValue,
        date: new Date(date)
      }
    });

    // Update company's total carbon
    await prisma.company.update({
      where: { id: parseInt(emissionData.companyId) },
      data: {
        totalCarbon: { increment: carbonValue }
      }
    });

    // Update or create monthly emission record
    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    res.json(emission);
  } catch (error) {
    console.error('Create emission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getFieldTypes = async (req: Request, res: Response) => {
  try {
    const fieldTypes = await emissionService.fieldTypes();
    res.json(fieldTypes);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};