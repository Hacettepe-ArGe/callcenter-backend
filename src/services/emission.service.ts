import prisma from '../config/prisma'
import { EmissionType, EmissionScope, Emission, Worker, Company } from '@prisma/client'

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
          carbonValue,
          workerId,
          companyId,
          cost: emissionFactor.price ? amount * emissionFactor.price : null
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
  async deleteCompanyEmissions(companyId: number): Promise<void> {
    await prisma.emission.deleteMany({
      where: { companyId }
    });
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
            carbonValue,
            unit: emissionFactor.unit,
            cost: emissionFactor.price ? data.amount * emissionFactor.price : null
          }
        });

        // Şirketin tüm emisyonlarını topla
        const allEmissions = await prisma.emission.findMany({
          where: {
            companyId
          }
        });

        const totalCarbon = allEmissions.reduce((total, emission) => {
          return total + emission.carbonValue;
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

        // Mevcut ay için MonthlyEmission güncelle veya oluştur
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const existingMonthlyEmission = await prisma.monthlyEmission.findFirst({
          where: {
            companyId,
            month: firstDayOfMonth
          }
        });

        if (existingMonthlyEmission) {
          await prisma.monthlyEmission.update({
            where: {
              id: existingMonthlyEmission.id
            },
            data: {
              totalCarbon
            }
          });
        } else {
          await prisma.monthlyEmission.create({
            data: {
              month: firstDayOfMonth,
              totalCarbon,
              companyId
            }
          });
        }

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
            carbonValue,
            unit: emissionFactor.unit,
            cost: emissionFactor.price ? data.amount * emissionFactor.price : null
          }
        });

        // Şirketin tüm emisyonlarını topla
        const allEmissions = await prisma.emission.findMany({
          where: {
            companyId
          }
        });

        const totalCarbon = allEmissions.reduce((total, emission) => {
          return total + emission.carbonValue;
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

        // Mevcut ay için MonthlyEmission güncelle
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const existingMonthlyEmission = await prisma.monthlyEmission.findFirst({
          where: {
            companyId,
            month: firstDayOfMonth
          }
        });

        if (existingMonthlyEmission) {
          await prisma.monthlyEmission.update({
            where: {
              id: existingMonthlyEmission.id
            },
            data: {
              totalCarbon
            }
          });
        } else {
          await prisma.monthlyEmission.create({
            data: {
              month: firstDayOfMonth,
              totalCarbon,
              companyId
            }
          });
        }

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
}