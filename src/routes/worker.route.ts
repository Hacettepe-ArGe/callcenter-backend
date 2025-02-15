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

router.post('/', authenticateJWT, createWorker)
router.get('/', authenticateJWT, getWorkers)
router.get('/:id', authenticateJWT, getWorkerById)
router.put('/:id', authenticateJWT, updateWorker)
router.delete('/:id', authenticateJWT, deleteWorker)

export default router 