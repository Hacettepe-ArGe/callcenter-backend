// src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validateToken } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/validate
router.get('/validate', validateToken, (req, res) => {
  res.status(200).json({ 
    valid: true, 
    user: (req as AuthRequest).user 
  });
});

export default router;