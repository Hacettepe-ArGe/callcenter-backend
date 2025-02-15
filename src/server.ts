import express from "express";
import dotenv from "dotenv";
import authRoutes from './routes/auth.route';
import emissionRoutes from './routes/emission.route'
import { PrismaClient } from '@prisma/client';
import dashboardRoutes from './routes/dashboard.route';

const prisma = new PrismaClient();

// get current mode
const mode = process.env.NODE_ENV || 'development';

// load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

// Middlewares
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send({
    message: "This is a simple backend for a call center. It is built with Node.js and Express.js. It aims to provide a service to handle carbon footprint of the call center using its workers' data and their fit expenses.",
  });
});

app.use('/api/emissions', emissionRoutes)
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);


// Listen on port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});