const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all departments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get transactions for a department
router.get('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM transactions WHERE department_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Process payment - CRITICAL: Uses database-level locking for concurrency control
router.post('/:id/pay', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { amount, description, userName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await client.query('BEGIN');

    // CRITICAL: SELECT FOR UPDATE locks the row until transaction completes
    // This prevents concurrent transactions from reading stale balance
    const deptResult = await client.query(
      'SELECT id, name, balance FROM departments WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (deptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Department not found' });
    }

    const department = deptResult.rows[0];
    const newBalance = parseFloat(department.balance) - parseFloat(amount);

    // Check if sufficient funds
    if (newBalance < 0) {
      // Record failed transaction
      await client.query(
        `INSERT INTO transactions (department_id, amount, description, user_name, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, amount, description, userName, 'FAILED']
      );
      
      await client.query('COMMIT');
      return res.status(400).json({ 
        error: 'Insufficient funds',
        currentBalance: department.balance,
        requestedAmount: amount
      });
    }

    // Update department balance
    await client.query(
      'UPDATE departments SET balance = $1 WHERE id = $2',
      [newBalance, id]
    );

    // Record successful transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions (department_id, amount, description, user_name, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, amount, description, userName, 'SUCCESS']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      transaction: transactionResult.rows[0],
      newBalance: newBalance
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  } finally {
    client.release();
  }
});

// Reset department balance (for testing)
router.post('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    
    await pool.query(
      'UPDATE departments SET balance = $1 WHERE id = $2',
      [balance || 50000, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Clear transactions for a department (for testing)
router.delete('/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'DELETE FROM transactions WHERE department_id = $1',
      [id]
    );
    
    res.json({ success: true, message: 'Transactions cleared' });
  } catch (error) {
    console.error('Clear transactions error:', error);
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

module.exports = router;
