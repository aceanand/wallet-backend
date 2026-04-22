const express = require('express');
const cors = require('cors');
const departmentsRouter = require('./routes/departments');
require('dotenv').config();

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/departments', departmentsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Departmental Expense Wallet API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      departments: '/api/departments',
      transactions: '/api/departments/:id/transactions',
      pay: '/api/departments/:id/pay'
    }
  });
});

module.exports = app;
