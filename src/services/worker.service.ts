import prisma from '../config/prisma'
import { Worker } from '@prisma/client'

export class WorkerService {
  async createWorker(companyId: number, data: { name: string; department: string }): Promise<Worker> {
    return prisma.worker.create({
      data: {
        ...data,
        companyId
      }
    })
  }

  async getWorkers(companyId: number): Promise<Worker[]> {
    return prisma.worker.findMany({
      where: { companyId },
      include: {
        emissions: true
      }
    })
  }

  async getWorkerById(id: number, companyId: number): Promise<Worker | null> {
    return prisma.worker.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        emissions: true
      }
    })
  }

  async updateWorker(
    id: number, 
    companyId: number, 
    data: { name?: string; department?: string }
  ): Promise<Worker> {
    return prisma.worker.update({
      where: {
        id,
        companyId
      },
      data
    })
  }

  async deleteWorker(id: number, companyId: number): Promise<void> {
    await prisma.worker.delete({
      where: {
        id,
        companyId
      }
    })
  }
} 