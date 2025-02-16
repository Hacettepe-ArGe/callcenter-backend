// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthPayload {
  companyId: number;
}

export const registerUser = async (email: string, password: string, name: string) => {
  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create a new company
  const company = await prisma.company.create({
    data: {
      name: name,
      email: email,
      password: hashedPassword,
      totalCarbon: 0,
    },
  });

  return company;
};

export const loginUser = async (email: string, password: string) => {
  // Find company by email
  const company = await prisma.company.findUnique({ 
    where: { email }
  });
  
  if (!company) {
    throw new Error('Invalid credentials');
  }

  // Compare passwords
  const isValid = await bcrypt.compare(password, company.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Create JWT token
  const token = jwt.sign(
    { 
      companyId: company.id 
    } as AuthPayload, 
    JWT_SECRET, 
    { expiresIn: '1d' }
  );

  // Remove password from response
  const { password: _, ...companyWithoutPassword } = company;

  return { token, user: companyWithoutPassword };
};

export const changePasswordUser = async (email: string, oldPassword: string, newPassword: string) => {
  const company = await prisma.company.findUnique({ where: { email } });
  if (!company) {
    throw new Error('Company not found');
  }

  // Compare old password
  const isValid = await bcrypt.compare(oldPassword, company.password);
  if (!isValid) {
    throw new Error('Invalid old password');
  }

  // Hash new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update company password
  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: { password: hashedPassword }
  });

  return updatedCompany;
};


export const changeUsernameUser = async (email: string, newUsername: string) => {
  const company = await prisma.company.findUnique({ where: { email } });
  if (!company) {
    throw new Error('Company not found');
  }

  const updatedCompany = await prisma.company.update({
    where: { id: company.id },
    data: { name: newUsername }
  });

  return updatedCompany;
};