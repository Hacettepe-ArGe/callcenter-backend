// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await registerUser(email, password, name);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ 
      message: 'User and company created successfully', 
      data: userWithoutPassword 
    });
  } catch (err: any) {
    // Handle specific error cases
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginUser(email, password);
    res.status(200).json({ message: 'Login successful', token, user });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};