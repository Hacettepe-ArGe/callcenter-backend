import prisma from '../config/prisma'
import { EmissionType, EmissionScope } from '@prisma/client'

export class EmissionService {
  async calculateEmission(
    type: EmissionType,
    category: string,
    amount: number,
    scope: EmissionScope
  ) {
    const emissionFactor = await prisma.emissionFactor.findFirst({
      where: {
        type,
        category,
        scope
      }
    })

    if (!emissionFactor) {
      throw new Error('Emission factor not found')
    }

    const carbonValue = emissionFactor.price ? amount / emissionFactor.price * emissionFactor.emissionFactor : emissionFactor.emissionFactor * amount


    return {
      carbonValue,
      unit: emissionFactor.unit
    }
  }

  async getEmissionFactors(scope: EmissionScope) {
    return prisma.emissionFactor.findMany({
      where: { scope }
    })
  }
}