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

  async calculateTotalEmissions(companyId: number): Promise<number> {
    try {
      // Şirketin tüm emisyonlarını al
      const emissions = await prisma.emission.findMany({
        where: {
          companyId: companyId
        }
      });

      // Toplam karbon değerini hesapla
      const totalCarbon = emissions.reduce((total, emission) => {
        return total + emission.carbonValue;
      }, 0);
      
      // Mevcut ay için kayıt oluştur veya güncelle
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Mevcut ay için kayıt var mı kontrol et
      const existingMonthlyEmission = await prisma.monthlyEmission.findFirst({
        where: {
          companyId: companyId,
          month: firstDayOfMonth
        }
      });

      if (existingMonthlyEmission) {
        // Varsa güncelle
        await prisma.monthlyEmission.update({
          where: {
            id: existingMonthlyEmission.id
          },
          data: {
            totalCarbon: totalCarbon
          }
        });
      } else {
        // Yoksa yeni kayıt oluştur
        await prisma.monthlyEmission.create({
          data: {
            month: firstDayOfMonth,
            totalCarbon: totalCarbon,
            companyId: companyId
          }
        });
      }
      
      // Şirketin toplam karbon değerini güncelle
      await prisma.company.update({
        where: {
          id: companyId
        },
        data: {
          totalCarbon: totalCarbon
        }
      });
      
      return totalCarbon;
    } catch (error) {
      throw new Error('Toplam emisyon hesaplanırken hata oluştu');
    }
  }
}