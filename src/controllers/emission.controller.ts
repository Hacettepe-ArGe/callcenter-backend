import { Request, Response } from 'express'
import { EmissionService } from '../services/emission.service'
import { EmissionType, EmissionScope } from '@prisma/client'
import { NextFunction } from 'express'
const emissionService = new EmissionService()

export const calculateEmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category, amount, scope } = req.body
    const result = await emissionService.calculateEmission(
      type as EmissionType,
      category,
      amount,
      scope as EmissionScope
    )

    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getEmissionFactors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scope } = req.params
    const factors = await emissionService.getEmissionFactors(scope as EmissionScope)
    res.json(factors)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getTotalEmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - Auth middleware'den gelen user bilgisini kullan
    const companyId = req.user?.companyId;
    
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