import { Request, Response } from 'express'
import { EmissionService } from '../services/emission.service'
import { EmissionType, EmissionScope } from '@prisma/client'

const emissionService = new EmissionService()

export const calculateEmission = async (req: Request, res: Response) => {
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

export const getEmissionFactors = async (req: Request, res: Response) => {
  try {
    const { scope } = req.params
    const factors = await emissionService.getEmissionFactors(scope as EmissionScope)
    res.json(factors)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}