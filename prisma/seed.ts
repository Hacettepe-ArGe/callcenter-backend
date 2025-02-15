import { PrismaClient, EmissionType, EmissionScope } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.emission.deleteMany()
  await prisma.worker.deleteMany()
  await prisma.monthlyEmission.deleteMany()
  await prisma.yearlyEmissionBreakdown.deleteMany()
  await prisma.company.deleteMany()
  await prisma.emissionFactor.deleteMany()

  // First seed emission factors from JSON
  const emissionData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../emisyonlar.json'), 'utf-8')
  )
  await seedEmissionFactors(emissionData.sirket, EmissionScope.SIRKET)
  await seedEmissionFactors(emissionData.calisan, EmissionScope.CALISAN)

  // Create a company
  const hashedPassword = await bcrypt.hash('password123', 10)
  const company = await prisma.company.create({
    data: {
      name: 'Tech Innovators Ltd',
      email: 'admin@techinnovators.com',
      password: hashedPassword,
    }
  })

  // Create workers with different roles
  const workers = await Promise.all([
    prisma.worker.create({
      data: {
        name: 'Ahmet Yılmaz',
        department: 'Yazılım',
        companyId: company.id
      }
    }),
    prisma.worker.create({
      data: {
        name: 'Ayşe Demir',
        department: 'Satış',
        companyId: company.id
      }
    }),
    prisma.worker.create({
      data: {
        name: 'Mehmet Kaya',
        department: 'Yönetim',
        companyId: company.id
      }
    })
  ])

  // Create emissions for all months of the current year
  const currentYear = new Date().getFullYear()
  
  for (let month = 1; month <= 12; month++) {
    const date = new Date(currentYear, month - 1, 15) // 15th of each month
    const seasonalFactor = getSeasionalFactor(month - 1)
    
    // Company utility emissions
    await prisma.emission.create({
      data: {
        type: 'FATURA',
        category: 'elektrik',
        amount: 2000 * seasonalFactor.electricity * 10,
        unit: 'KWH',
        carbonValue: 2000 * seasonalFactor.electricity * 0.7 * 10,
        cost: 2000 * seasonalFactor.electricity * 5.54 * 10,
        date,
        scope: 'SIRKET',
        source: 'Electricity',
        companyId: company.id
      }
    })

    // Natural gas usage (higher in winter for heating)
    await prisma.emission.create({
      data: {
        type: 'FATURA',
        category: 'dogalgaz',
        amount: 500 * seasonalFactor.gas * 10,
        unit: 'M3',
        carbonValue: 500 * seasonalFactor.gas * 2 * 10,
        cost: 500 * seasonalFactor.gas * 8 * 10,
        date,
        scope: 'SIRKET',
        source: 'Natural Gas',
        companyId: company.id
      }
    })

    // Water usage (relatively constant)
    await prisma.emission.create({
      data: {
        type: 'FATURA',
        category: 'su',
        amount: 100 + Math.random() * 20,
        unit: 'M3',
        carbonValue: (100 + Math.random() * 20) * 0.34 * 10,
        cost: (100 + Math.random() * 20) * 20 * 10,
        date,
        scope: 'SIRKET',
        source: 'Water',
        companyId: company.id
      }
    })

    // Worker emissions
    for (const worker of workers) {
      // Car travel
      await prisma.emission.create({
        data: {
          type: 'ULASIM',
          category: 'dizel_otomobil',
          amount: 800 + Math.random() * 200,
          unit: 'KM',
          carbonValue: (800 + Math.random() * 200) * 0.171,
          date,
          scope: 'CALISAN',
          source: 'Vehicle',
          workerId: worker.id,
          companyId: company.id
        }
      })

      // Paper usage
      if (worker.department === 'Satış') {
        await prisma.emission.create({
          data: {
            type: 'KG_GIRDILI',
            category: 'kagit',
            amount: 5 + Math.random() * 2,
            unit: 'KG',
            carbonValue: (5 + Math.random() * 2) * 1.2,
            date,
            scope: 'CALISAN',
            source: 'Paper',
            workerId: worker.id,
            companyId: company.id
          }
        })
      }

      // Air travel for management
      if (worker.department === 'Yönetim' && Math.random() > 0.7) {
        await prisma.emission.create({
          data: {
            type: 'SAAT_GIRDILI',
            category: 'ucak',
            amount: 4 + Math.random() * 2,
            unit: 'SAAT',
            carbonValue: (4 + Math.random() * 2) * 90,
            date,
            scope: 'CALISAN',
            source: 'Air Travel',
            workerId: worker.id,
            companyId: company.id
          }
        })
      }
    }

    // Calculate and store monthly totals
    const monthlyTotals = {
      electricity: 2000 * seasonalFactor.electricity * 0.7 * 10,
      naturalGas: 500 * seasonalFactor.gas * 2 * 10,
      vehicles: workers.length * (800 + Math.random() * 200) * 0.171,
      waste: (100 + Math.random() * 20) * 0.34 * 10,
      other: (5 + Math.random() * 2) * 1.2 * 10
    }

    // Create yearly breakdown record for each month
    await prisma.yearlyEmissionBreakdown.create({
      data: {
        companyId: company.id,
        year: currentYear,
        month: month,
        electricity: monthlyTotals.electricity,
        naturalGas: monthlyTotals.naturalGas,
        vehicles: monthlyTotals.vehicles,
        waste: monthlyTotals.waste,
        other: monthlyTotals.other,
        total: Object.values(monthlyTotals).reduce((a, b) => a + b, 0)
      }
    })

    // Also update the corresponding emissions to match
    await prisma.emission.create({
      data: {
        type: 'FATURA',
        category: 'elektrik',
        amount: 2000 * seasonalFactor.electricity * 10,
        unit: 'KWH',
        carbonValue: monthlyTotals.electricity,
        cost: 2000 * seasonalFactor.electricity * 5.54 * 10,
        date,
        scope: 'SIRKET',
        source: 'Electricity',
        companyId: company.id
      }
    })

    await prisma.emission.create({
      data: {
        type: 'FATURA',
        category: 'dogalgaz',
        amount: 500 * seasonalFactor.gas * 10,
        unit: 'M3',
        carbonValue: monthlyTotals.naturalGas,
        cost: 500 * seasonalFactor.gas * 8 * 10,
        date,
        scope: 'SIRKET',
        source: 'Natural Gas',
        companyId: company.id
      }
    })
  }

  console.log('Seed data created successfully!')
}

// Helper function for more pronounced seasonal variations
function getSeasionalFactor(month: number) {
  return {
    electricity: 1 + Math.cos((month - 6) * Math.PI / 6) * 0.5,  // Higher variation
    gas: 1 - Math.cos((month - 6) * Math.PI / 6) * 0.7,         // Higher variation
  }
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