<h3 align="center">
    <p>Carbon Footprint Tracker</p>
</h3>

A comprehensive solution for companies to track, manage, and reduce their carbon emissions across different scopes and departments.

## Overview

This project is a carbon footprint management system that helps organizations:
- Track emissions across different scopes (Scope 1, 2, and 3)
- Monitor individual worker and department contributions
- Calculate carbon emissions using standardized emission factors
- Generate monthly and annual emission reports
- Manage and analyze emission data for better decision making

## Table of Contents
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Database Schema](#database-schema)

## Features

- **Multi-level Emission Tracking**
  - Company-wide emissions
  - Department-specific tracking
  - Individual worker contributions

- **Comprehensive Calculations**
  - Automated emission calculations using standard factors
  - Support for different emission types and categories
  - Cost tracking for emission-related activities

- **Reporting and Analytics**
  - Monthly emission summaries
  - Historical data tracking
  - Trend analysis and comparisons

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/Hacettepe-ArGe/callcenter-backend.git
```

2. Install dependencies
```bash
npm install
```

3. Set up your environment variables
```bash
cp .env.example .env
```

4. If you have your custom emisyonlar.json file
```bash
npx prisma seed
```

5. Run database migrations
```bash
npx prisma migrate dev
```

6. Build and start the project
```bash
npm run build
npm run start
```
 or Run on dev environment
```bash
npm run dev
```
## Environment Setup

Configure the following environment variables in your `.env` file:

- `DATABASE_URL`: Your PostgreSQL database connection string
- `PORT`: Application port (default: 3000)
- `JWT_SECRET`: Secret key for JWT authentication
- `NODE_ENV`: Environment mode (development/production)

## Database Schema

The system uses a PostgreSQL database with the following main entities:

- **Company**: Organization details and total emissions
- **Worker**: Individual employee information and their emissions
- **Emission**: Individual emission records
- **EmissionFactor**: Standard factors for different emission types

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.