import { PrismaClient, EmissionType, EmissionScope } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Yardımcı fonksiyonlar
function getSeasionalFactor(month: number) {
  return {
    electricity: 1 + Math.cos((month - 6) * Math.PI / 6) * 0.3,  // Yaz aylarında klima kullanımı
    gas: 1 + Math.cos((month + 6) * Math.PI / 6) * 0.6,         // Kış aylarında ısınma
    water: 1 + Math.cos((month - 6) * Math.PI / 6) * 0.2,       // Yaz aylarında su kullanımı
    paper: 1 - Math.cos(month * Math.PI / 6) * 0.1,             // Yıl boyunca sabit
    travel: 1 - Math.cos((month - 3) * Math.PI / 6) * 0.4       // İlkbahar ve sonbaharda seyahat
  }
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

async function createEmission(data: any) {
  return prisma.emission.create({ data })
}

async function main() {
  // Veritabanını temizle
  console.log('Veritabanı temizleniyor...')
  await prisma.$transaction([
    prisma.emission.deleteMany(),
    prisma.worker.deleteMany(),
    prisma.emissionFactor.deleteMany(),
    prisma.company.deleteMany(),
  ])

  // Emisyon faktörlerini yükle
  const emissionData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../emisyonlar.json'), 'utf-8')
  )
  await seedEmissionFactors(emissionData.sirket, EmissionScope.SIRKET)
  await seedEmissionFactors(emissionData.calisan, EmissionScope.CALISAN)

  // Şirket oluştur
  const company = await prisma.company.create({
    data: {
      name: 'Yeşil Teknoloji A.Ş.',
      email: 'admin@yesilteknoloji.com',
      password: await bcrypt.hash('password123', 10),
    }
  })

  // Çalışanları oluştur
  const departments = ['Yazılım', 'Satış', 'Yönetim', 'İK', 'Finans', 'Operasyon']
  const workers = await Promise.all(
    departments.map(dept => 
      prisma.worker.create({
        data: {
          name: `${dept}`,
          department: dept,
          companyId: company.id
        }
      })
    )
  )

  // Son 24 ay için veri oluştur
  const currentDate = new Date()
  const months = Array.from({ length: 24 }, (_, i) => {
    const date = new Date()
    date.setMonth(currentDate.getMonth() + 8 - i)
    return date
  })

  for (const date of months) {
    const month = date.getMonth()
    const factors = getSeasionalFactor(month)
    
    // Şirket Emisyonları
    // 1. Faturalar
    await createEmission({
      type: 'FATURA',
      category: 'elektrik',
      amount: 300 * factors.electricity,
      unit: 'KWH',
      carbonValue: 300 * factors.electricity * emissionData.sirket.fatura.elektrik.emisyon_faktoru,
      cost: 300 * factors.electricity * emissionData.sirket.fatura.elektrik.fiyat,
      date,
      scope: 'SIRKET',
      source: 'Elektrik Tüketimi',
      companyId: company.id
    })
    const amount = 700 * randomInRange(0.8, 1.2)
    await createEmission({
      type: 'FATURA',
      category: 'dogalgaz',
      amount: amount* factors.gas,
      unit: 'M3',
      carbonValue: 700 * factors.gas * emissionData.sirket.fatura.dogalgaz.emisyon_faktoru,
      cost: 700 * factors.gas * emissionData.sirket.fatura.dogalgaz.fiyat,
      date,
      scope: 'SIRKET',
      source: 'Doğalgaz Tüketimi',
      companyId: company.id
    })

    // 2. Çalışan bazlı emisyonlar
    for (const worker of workers) {
      // Ulaşım emisyonları
      if (Math.random() > 0.3) {
        const amount = randomInRange(600, 1200)
        await createEmission({
          type: 'ULASIM',
          category: ['dizel_otomobil', 'benzin_otomobil', 'elektrik_otomobil'][Math.floor(Math.random() * 3)],
          amount: amount,
          unit: 'KM',
          carbonValue: amount * factors.travel * 0.171,
          date,
          scope: 'CALISAN',
          source: 'Araç Kullanımı',
          workerId: worker.id,
          companyId: company.id
        })
      }

      // Departmana özel emisyonlar
      if (worker.department === 'Satış') {
        const amount = randomInRange(3, 8)
        await createEmission({
          type: 'KG_GIRDILI',
          category: 'kagit',
          amount: amount,
          unit: 'KG',
          carbonValue: amount * factors.paper * emissionData.sirket.kg_girdili.kagit.emisyon_faktoru,
          date,
          scope: 'CALISAN',
          source: 'Kağıt Kullanımı',
          workerId: worker.id,
          companyId: company.id
        })
      }

      // Yönetim seyahatleri
      if (worker.department === 'Yönetim' && Math.random() > 0.6) {
        const amount = randomInRange(2, 4)
        await createEmission({
          type: 'SAAT_GIRDILI',
          category: 'ucak',
          amount: amount,
          unit: 'SAAT',
          carbonValue: amount * emissionData.calisan.saat_girdili.ucak.emisyon_faktoru,
          date,
          scope: 'CALISAN',
          source: 'Uçak Seyahati',
          workerId: worker.id,
          companyId: company.id
        })
      }
    }
  }
  const weeks = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(currentDate.getDate() + 4 - i)
    return date
  })

  for (const date of weeks) {
    const month = date.getMonth()
    const factors = getSeasionalFactor(month)
    
    // Şirket Emisyonları
    // 1. Faturalar
    await createEmission({
      type: 'FATURA',
      category: 'elektrik',
      amount: 300 * factors.electricity,
      unit: 'KWH',
      carbonValue: 300 * factors.electricity * emissionData.sirket.fatura.elektrik.emisyon_faktoru,
      cost: 300 * factors.electricity * emissionData.sirket.fatura.elektrik.fiyat,
      date,
      scope: 'SIRKET',
      source: 'Elektrik Tüketimi',
      companyId: company.id
    })
    const amount = 700 * randomInRange(0.8, 1.2)
    await createEmission({
      type: 'FATURA',
      category: 'dogalgaz',
      amount: amount* factors.gas,
      unit: 'M3',
      carbonValue: 700 * factors.gas * emissionData.sirket.fatura.dogalgaz.emisyon_faktoru,
      cost: 700 * factors.gas * emissionData.sirket.fatura.dogalgaz.fiyat,
      date,
      scope: 'SIRKET',
      source: 'Doğalgaz Tüketimi',
      companyId: company.id
    })

    // 2. Çalışan bazlı emisyonlar
    for (const worker of workers) {
      // Ulaşım emisyonları
      if (Math.random() > 0.3) {
        const amount = randomInRange(600, 1200)
        await createEmission({
          type: 'ULASIM',
          category: ['dizel_otomobil', 'benzin_otomobil', 'elektrik_otomobil'][Math.floor(Math.random() * 3)],
          amount: amount,
          unit: 'KM',
          carbonValue: amount * factors.travel * 0.171,
          date,
          scope: 'CALISAN',
          source: 'Araç Kullanımı',
          workerId: worker.id,
          companyId: company.id
        })
      }

      // Departmana özel emisyonlar
      if (worker.department === 'Satış') {
        const amount = randomInRange(3, 8)
        await createEmission({
          type: 'KG_GIRDILI',
          category: 'kagit',
          amount: amount,
          unit: 'KG',
          carbonValue: amount * factors.paper * emissionData.sirket.kg_girdili.kagit.emisyon_faktoru,
          date,
          scope: 'CALISAN',
          source: 'Kağıt Kullanımı',
          workerId: worker.id,
          companyId: company.id
        })
      }

      // Yönetim seyahatleri
      if (worker.department === 'Yönetim' && Math.random() > 0.6) {
        const amount = randomInRange(2, 4)
        await createEmission({
          type: 'SAAT_GIRDILI',
          category: 'ucak',
          amount: amount,
          unit: 'SAAT',
          carbonValue: amount * emissionData.calisan.saat_girdili.ucak.emisyon_faktoru,
          date,
          scope: 'CALISAN',
          source: 'Uçak Seyahati',
          workerId: worker.id,
          companyId: company.id
        })
      }
    }
  }

  // Toplam karbon emisyonunu güncelle
  const totalCarbonEmissions = await prisma.emission.aggregate({
    _sum: { carbonValue: true },
    where: { companyId: company.id }
  })

  await prisma.company.update({
    where: { id: company.id },
    data: { totalCarbon: Number(totalCarbonEmissions._sum.carbonValue) || 0 }
  })

  console.log('Seed işlemi başarıyla tamamlandı!')
}

async function seedEmissionFactors(data: any, scope: EmissionScope) {
  for (const [type, categories] of Object.entries(data)) {
    for (const [category, details] of Object.entries(categories as object)) {
      const factor = details as any
      await prisma.emissionFactor.create({
        data: {
          type: type.toUpperCase() as EmissionType,
          category: category,
          emissionFactor: factor.emisyon_faktoru,
          unit: factor.emisyon_birimi,
          price: factor.fiyat ? parseFloat(factor.fiyat) : null,
          priceUnit: factor.birim_fiyat || null,
          scope: scope
        }
      })
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })