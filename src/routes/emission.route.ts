import { Router } from 'express'
import { getFieldTypes, deleteEmission, deleteUserEmission, getEmission, getEmissionFactors, getTotalEmissions, getUserEmission, postEmission, postUserEmission, updateEmission, updateUserEmission } from '../controllers/emission.controller'
import { authenticateJWT } from '../middlewares/auth.middleware'

const router = Router()

router.get('/emission', authenticateJWT, getEmission) // get all emissions
router.post('/emission', authenticateJWT, postEmission) // create a new emission
router.put('/emission', authenticateJWT, updateEmission) // update an emission
router.delete('/emission', authenticateJWT, deleteEmission) // delete an emission

router.get('/emission/:id', authenticateJWT, getUserEmission) // get an emission by worker id
router.put('/emission/:id', authenticateJWT, updateUserEmission) // update an emission by worker id
router.delete('/emission/:id', authenticateJWT, deleteUserEmission) // delete an emission by worker id
router.post('/emission/:id', authenticateJWT, postUserEmission) // create a new emission by worker id
router.use('/factors/:scope', authenticateJWT, getEmissionFactors) // get emission factors by scope

router.use('/total/:companyId', authenticateJWT, getTotalEmissions) // get all emissions by company id
router.get('/types', authenticateJWT, getFieldTypes) // get all emission types
export default router