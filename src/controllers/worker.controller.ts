import { Request, Response } from 'express'
import { WorkerService } from '../services/worker.service'
import { AuthRequest } from '../middlewares/auth.middleware'

const workerService = new WorkerService()

export const createWorker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { name, department } = req.body
    if (!name || !department) {
      res.status(400).json({ error: 'Name and department are required' })
      return
    }

    const worker = await workerService.createWorker(companyId, { name, department })
    res.status(201).json(worker)
  } catch (error) {
    console.error('Create worker error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getWorkers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const workers = await workerService.getWorkers(companyId)
    res.json(workers)
  } catch (error) {
    console.error('Get workers error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getWorkerById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const workerId = parseInt(req.params.id)
    const worker = await workerService.getWorkerById(workerId, companyId)
    
    if (!worker) {
      res.status(404).json({ error: 'Worker not found' })
      return
    }

    res.json(worker)
  } catch (error) {
    console.error('Get worker error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateWorker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const workerId = parseInt(req.params.id)
    const { name, department } = req.body

    const worker = await workerService.updateWorker(workerId, companyId, { name, department })
    res.json(worker)
  } catch (error) {
    console.error('Update worker error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const deleteWorker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const workerId = parseInt(req.params.id)
    await workerService.deleteWorker(workerId, companyId)
    res.status(204).send()
  } catch (error) {
    console.error('Delete worker error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 