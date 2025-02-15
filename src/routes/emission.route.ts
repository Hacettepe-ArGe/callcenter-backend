import { Router } from 'express'
import { calculateEmission, getEmissionFactors } from '../controllers/emission.controller'
import { authenticateJWT } from '../middlewares/auth.middleware'

const router = Router()

router.post('/calculate', (req, res, next) => {
  calculateEmission(req, res)
  return
})
router.get('/factors/:scope', (req, res, next) => {
  getEmissionFactors(req, res)
  return
})

export default router