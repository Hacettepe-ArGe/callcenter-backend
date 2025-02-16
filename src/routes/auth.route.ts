// src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login, changePassword, changeUsername } from '../controllers/auth.controller';
import { AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

router.post('/change-password', changePassword);

router.post('/change-username', changeUsername);
export default router;