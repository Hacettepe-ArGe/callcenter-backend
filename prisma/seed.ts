import { PrismaClient, EmissionType, EmissionScope } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const emissionData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../emisyonlar.json'), 'utf-8')
  )
  await seedEmissionFactors(emissionData.sirket, EmissionScope.SIRKET)
  await seedEmissionFactors(emissionData.calisan, EmissionScope.CALISAN)
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