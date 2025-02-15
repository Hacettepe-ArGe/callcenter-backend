import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
export const validateEmissionCalculation = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { activityData, emissionType } = req.body
    if (!activityData || !emissionType) {
      return res.status(400).json({
        success: false,
        message: 'Activity data and emission type are required'
      })
    }

    if (typeof activityData !== 'number' || activityData <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Activity data must be a positive number'
      })
    }

    // Emission type validation
    const validEmissionTypes = ['electricity', 'fuel', 'waste', 'water']
    if (!validEmissionTypes.includes(emissionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid emission type. Must be one of: ${validEmissionTypes.join(', ')}`
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const validateScope = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { scope } = req.params

    const validScopes = ['scope1', 'scope2', 'scope3']
    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scope. Must be one of: ${validScopes.join(', ')}`
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}
