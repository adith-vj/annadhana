import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
// Create donation (Donor only)
router.post('/', authMiddleware, async (req, res) => {
  const { food_type, quantity, pickup_deadline, location } = req.body;
  const donor_id = req.user.id;

  if (req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Only donors can create donations' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO donations (donor_id, food_type, quantity, pickup_deadline, location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [donor_id, food_type, quantity, pickup_deadline, location]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all donations
router.get('/', authMiddleware, async (req, res) => {
  const { status, location } = req.query;

  try {
    let query = `
      SELECT d.*, u.name as donor_name, u.location as donor_location
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (location) {
      query += ` AND d.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get donation by ID
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT d.*, u.name as donor_name, u.location as donor_location
       FROM donations d
       JOIN users u ON d.donor_id = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept donation (NGO only)
router.put('/:id/accept', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const ngo_id = req.user.id;

  if (req.user.role !== 'ngo') {
    return res.status(403).json({ error: 'Only NGOs can accept donations' });
  }

  try {
    // Check if donation exists and is posted
    const donationCheck = await pool.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );

    if (donationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (donationCheck.rows[0].status !== 'posted') {
      return res.status(400).json({ error: 'Donation is not available' });
    }

    // Accept donation
    const result = await pool.query(
      'UPDATE donations SET status = $1, accepted_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['accepted', ngo_id, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Accept donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update donation status (Donor can mark as completed)
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user_id = req.user.id;

  try {
    // Check if donation exists
    const donationCheck = await pool.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );

    if (donationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const donation = donationCheck.rows[0];

    // Only donor can mark as completed
    if (status === 'completed' && donation.donor_id !== user_id) {
      return res.status(403).json({ error: 'Only the donor can mark as completed' });
    }

    // Update status
    const result = await pool.query(
      'UPDATE donations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get donations by current user
router.get('/my/donations', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const role = req.user.role;

  try {
    let query;
    if (role === 'donor') {
      query = `
        SELECT d.*, u.name as accepted_by_name
        FROM donations d
        LEFT JOIN users u ON d.accepted_by = u.id
        WHERE d.donor_id = $1
        ORDER BY d.created_at DESC
      `;
    } else {
      query = `
        SELECT d.*, u.name as donor_name, u.location as donor_location
        FROM donations d
        JOIN users u ON d.donor_id = u.id
        WHERE d.accepted_by = $1
        ORDER BY d.created_at DESC
      `;
    }

    const result = await pool.query(query, [user_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
