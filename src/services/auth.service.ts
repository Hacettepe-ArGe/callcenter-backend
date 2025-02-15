// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthPayload {
  userId: number;
}

export const registerUser = async (email: string, password: string, inviteCode: string) => {
  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in database
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  return user;
};

export const loginUser = async (email: string, password: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Compare passwords
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Create JWT token
  const token = jwt.sign({ userId: user.id } as AuthPayload, JWT_SECRET, {
    expiresIn: '1d',
  });

  return { token, user };
};
