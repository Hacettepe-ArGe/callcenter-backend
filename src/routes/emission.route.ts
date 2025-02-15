import { Router, Response, NextFunction } from 'express'
import { calculateEmission, getEmissionFactors, getTotalEmissions } from '../controllers/emission.controller'
import { AuthRequest, authenticateJWT } from '../middlewares/auth.middleware'
import { validateEmissionCalculation, validateScope } from '../middlewares/emission.middleware'

const router = Router()

router.post('/calculate', 
  calculateEmission
)

router.get('/factors/:scope',
  getEmissionFactors
)

router.get('/total/:companyId', getTotalEmissions)

export default router