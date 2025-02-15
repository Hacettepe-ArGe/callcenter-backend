import { Request, Response } from 'express'
import { EmissionService } from '../services/emission.service'
import { EmissionType, EmissionScope } from '@prisma/client'
import { NextFunction } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'

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