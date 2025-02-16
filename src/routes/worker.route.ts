import { Router } from 'express'
import { 
  createWorker, 
  getWorkers, 
  getWorkerById, 
  updateWorker, 
  deleteWorker 
} from '../controllers/worker.controller'
import { authenticateJWT } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', authenticateJWT, createWorker) // create a new worker
router.get('/', authenticateJWT, getWorkers) // get all workers by company id
router.get('/:id', authenticateJWT, getWorkerById) // get a worker by id
router.put('/:id', authenticateJWT, updateWorker) // update a worker by id
router.delete('/:id', authenticateJWT, deleteWorker) // delete a worker by id

export default router 