import prisma from '../config/prisma'
import { EmissionType, EmissionScope, Emission, Worker, Company } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

class EmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmissionError';
  }
}

export class EmissionService {
  async calculateEmission(
    type: EmissionType,
    category: string,
    amount: number,
    scope: EmissionScope,
    workerId: number | null,
    companyId: number
  ) {
    try {
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

      const carbonValue = emissionFactor.price 
        ? amount / emissionFactor.price * emissionFactor.emissionFactor 
        : emissionFactor.emissionFactor * amount

      // Emisyonu veritabanına kaydet
      const emission = await prisma.emission.create({
        data: {
          type,
          category,
          amount,
          scope,
          unit: emissionFactor.unit,
          carbonValue: new Decimal(carbonValue),
          workerId,
          companyId,
          cost: emissionFactor.price ? amount * emissionFactor.price : null,
          source: "SYSTEM"
        }
      });

      return {
        emission,
        carbonValue,
        unit: emissionFactor.unit
      }
    } catch (error) {
      throw new Error('Emisyon hesaplanırken veya kaydedilirken hata oluştu')
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
        return total + Number(emission.carbonValue);
      }, 0);
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

  // Şirketin son 12 aylık emisyon verilerini getir
  async getCompanyEmissions(companyId: number) {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    return prisma.emission.findMany({
      where: {
        companyId,
        date: {
          gte: lastYear
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  // Worker oluştur veya güncelle
  async createOrUpdateWorker(
    workerId: number | null,
    companyId: number,
    data: {
      department: string;
      name: string;
    }
  ): Promise<Worker> {
    if (workerId) {
      // Varolan worker'ı güncelle
      return prisma.worker.update({
        where: {
          id: workerId
        },
        data: {
          department: data.department
        }
      });
    } else {
      // Yeni worker oluştur
      return prisma.worker.create({
        data: {
          companyId,
          name: data.name,
          department: data.department
        }
      });
    }
  }

  // Şirket bilgilerini güncelle
  async updateCompany(
    companyId: number, 
    data: { name?: string; email?: string }
  ): Promise<Company> {
    return prisma.company.update({
      where: { id: companyId },
      data
    });
  }

  // Şirketin tüm emisyon verilerini sil
  async deleteEmission(emissionId: number): Promise<Emission> {
    const emission = await prisma.emission.delete({
      where: { id: emissionId }
    });
    return emission;
  }

  // Worker'ın tüm emisyonlarını getir
  async getWorkerEmissions(workerId: number, companyId: number) {
    const worker = await prisma.worker.findFirst({
      where: {
        id: workerId,
        companyId
      },
      include: {
        emissions: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    });

    if (!worker) {
      throw new Error('Çalışan bulunamadı');
    }

    return worker;
  }

  // Çalışan için yeni emisyon kaydı oluştur
  async createWorkerEmission(
    workerId: number,
    companyId: number,
    data: {
      type: EmissionType;
      category: string;
      amount: number;
      scope: EmissionScope;
    }
  ): Promise<Emission> {
    try {
      // Transaction başlat
      return await prisma.$transaction(async (prisma) => {
        const worker = await prisma.worker.findFirst({
          where: {
            id: workerId,
            companyId
          }
        });

        if (!worker) {
          throw new Error('Çalışan bulunamadı');
        }

        const emissionFactor = await prisma.emissionFactor.findFirst({
          where: {
            type: data.type,
            category: data.category,
            scope: data.scope
          }
        });

        if (!emissionFactor) {
          throw new Error('Emisyon faktörü bulunamadı');
        }

        const carbonValue = emissionFactor.price 
          ? data.amount / emissionFactor.price * emissionFactor.emissionFactor
          : emissionFactor.emissionFactor * data.amount;

        // Yeni emisyonu oluştur
        const emission = await prisma.emission.create({
          data: {
            type: data.type,
            category: data.category,
            amount: data.amount,
            scope: data.scope as EmissionScope,
            workerId,
            companyId,
            carbonValue: new Decimal(carbonValue),
            unit: emissionFactor.unit,
            cost: emissionFactor.price ? data.amount * emissionFactor.price : null,
            source: "WORKER"
          }
        });

        // Şirketin tüm emisyonlarını topla
        const allEmissions = await prisma.emission.findMany({
          where: {
            companyId
          }
        });

        const totalCarbon = allEmissions.reduce((total, emission) => {
          return total + Number(emission.carbonValue);
        }, 0);

        // Şirketin toplam karbon değerini güncelle
        await prisma.company.update({
          where: {
            id: companyId
          },
          data: {
            totalCarbon
          }
        });
        return emission;
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new EmissionError('Emisyon kaydı oluşturulurken bir hata oluştu: ' + error.message);
      }
      throw new EmissionError('Emisyon kaydı oluşturulurken bilinmeyen bir hata oluştu');
    }
  }

  // Çalışanın emisyon kaydını güncelle
  async updateWorkerEmission(
    emissionId: number,
    companyId: number,
    data: {
      type: EmissionType;
      category: string;
      amount: number;
      scope: EmissionScope;
    }
  ): Promise<Emission> {
    try {
      return await prisma.$transaction(async (prisma) => {
        const emission = await prisma.emission.findFirst({
          where: {
            id: emissionId,
            companyId
          }
        });
        if (!emission) {
          throw new Error('Emisyon kaydı bulunamadı');
        }
        const emissionFactor = await prisma.emissionFactor.findFirst({
          where: {
            type: data.type,
            category: data.category,
            scope: data.scope
          }
        });

        if (!emissionFactor) {
          throw new Error('Emisyon faktörü bulunamadı');
        }

        const carbonValue = emissionFactor.price 
          ? data.amount / emissionFactor.price * emissionFactor.emissionFactor
          : emissionFactor.emissionFactor * data.amount;

        // Emisyonu güncelle
        const updatedEmission = await prisma.emission.update({
          where: { id: emissionId },
          data: {
            type: data.type,
            category: data.category,
            amount: data.amount,
            scope: data.scope,
            carbonValue: new Decimal(carbonValue),
            unit: emissionFactor.unit,
            cost: emissionFactor.price ? data.amount * emissionFactor.price : null,
            source: "WORKER"
          }
        });

        // Şirketin tüm emisyonlarını topla
        const allEmissions = await prisma.emission.findMany({
          where: {
            companyId
          }
        });

        const totalCarbon = allEmissions.reduce((total, emission) => {
          return total + Number(emission.carbonValue);
        }, 0);

        // Şirketin toplam karbon değerini güncelle
        await prisma.company.update({
          where: {
            id: companyId
          },
          data: {
            totalCarbon
          }
        });
        return updatedEmission;
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new EmissionError('Emisyon kaydı güncellenirken bir hata oluştu: ' + error.message);
      }
      throw new EmissionError('Emisyon kaydı güncellenirken bilinmeyen bir hata oluştu');
    }
  }

  // Çalışanın emisyon kaydını sil
  async deleteWorkerEmission(emissionId: number, companyId: number): Promise<void> {
    const emission = await prisma.emission.findFirst({
      where: {
        id: emissionId,
        companyId
      }
    });

    if (!emission) {
      throw new Error('Emisyon kaydı bulunamadı');
    }

    await prisma.emission.delete({
      where: { id: emissionId }
    });
  }
  async fieldTypes(){
    const factors = await prisma.emissionFactor.findMany({
      select: {
        type: true,
        category: true
      },
      distinct: ['category', 'type']
    });
    const groupedByCategory = factors.reduce((acc, factor) => {
      if (!acc[factor.category]) {
        acc[factor.category] = [];
      }
      acc[factor.category].push(factor.type);
      return acc;
    }, {} as Record<string, EmissionType[]>);

    return groupedByCategory;
  }
}