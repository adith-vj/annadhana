import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// -----------------------------------------------------
// 1. CREATE DONATION (Donor Only)
// Expects: { food_type, quantity, pickup_deadline, latitude, longitude }
// -----------------------------------------------------
// routes/donations.js

// ... imports remain the same ...

// -----------------------------------------------------
// 1. CREATE DONATION (Donor Only)
// -----------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
  const { food_type, quantity, pickup_deadline, latitude, longitude } = req.body;
  const user_id = req.user.id; // Get UUID from token

  try {
    // 1. FETCH REAL ROLE FROM DB (Fixes the 'authenticated' issue)
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const realRole = userCheck.rows[0].role; // This will be 'donor' or 'ngo'

    // 2. Verify Role (Case Insensitive)
    if (realRole.toLowerCase() !== 'donor') {
      return res.status(403).json({ error: `Access denied. Your role is: ${realRole}` });
    }

    // 3. Insert Donation
    const query = `
      INSERT INTO donations 
      (donor_id, description, quantity, expires_at, location, status) 
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'available') 
      RETURNING id, description as food_type, quantity, expires_at as pickup_deadline, status, created_at
    `;

    const result = await pool.query(query, [
      user_id, 
      food_type, 
      quantity, 
      pickup_deadline, 
      longitude, 
      latitude
    ]);

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ... rest of the file ...

// -----------------------------------------------------
// 2. GET NEARBY DONATIONS (NGO Feed)
// Expects Query Params: ?lat=12.9&long=77.5&radius=5000
// -----------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  const { lat, long, radius = 5000 } = req.query; // Default radius 5km

  // If lat/long missing (first load or error), return empty or all
  if (!lat || !long) {
    return res.json([]); 
  }

  try {
    const query = `
      SELECT 
        d.id, 
        d.description as food_type, 
        d.quantity, 
        d.expires_at as pickup_deadline, 
        d.status, 
        d.created_at,
        
        /* EXTRACT COORDINATES FOR MAP */
        ST_X(d.location::geometry) as longitude,
        ST_Y(d.location::geometry) as latitude,

        u.full_name as donor_name
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.status = 'available'
      AND d.expires_at > NOW() 
      AND ST_DWithin(
        d.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326),
        $3
      )
      ORDER BY d.created_at DESC
    `;

    const result = await pool.query(query, [parseFloat(long), parseFloat(lat), radius]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -----------------------------------------------------
// 3. ACCEPT DONATION (NGO Only)
// -----------------------------------------------------
router.put('/:id/accept', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // 1. FETCH REAL ROLE FROM DB (The Fix)
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const realRole = userCheck.rows[0].role;

    // 2. Verify Role is NGO
    if (realRole.toLowerCase() !== 'ngo') {
      return res.status(403).json({ error: 'Only NGOs can accept donations' });
    }

    // 3. Check if donation exists and is available
    const check = await pool.query('SELECT status FROM donations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Donation not found' });
    }
    
    if (check.rows[0].status !== 'available') {
      return res.status(400).json({ error: 'Donation is already claimed or collected' });
    }

    // 4. Update to 'claimed' and set 'claimed_by'
    const result = await pool.query(
      `UPDATE donations 
       SET status = 'claimed', claimed_by = $1 
       WHERE id = $2 
       RETURNING id, status, claimed_by`,
      [user_id, id]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Accept donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// -----------------------------------------------------
// 4. UPDATE STATUS (e.g., Mark as Collected)
// -----------------------------------------------------
// -----------------------------------------------------
// 4. UPDATE STATUS (Mark as Collected)
// -----------------------------------------------------
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting 'collected'
  const user_id = req.user.id;

  try {
    // 1. Validate Input
    if (status !== 'collected') {
       return res.status(400).json({ error: 'Invalid status update' });
    }

    // 2. Verify that the logged-in user is the one who claimed it
    // We add "AND claimed_by = $3" to ensure no one else can close this ticket.
    const result = await pool.query(
      `UPDATE donations 
       SET status = $1 
       WHERE id = $2 AND claimed_by = $3 
       RETURNING *`,
      [status, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Action failed. You may not be the owner of this claim.' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// -----------------------------------------------------
// 5. GET MY DONATIONS (Donor & NGO History)
// -----------------------------------------------------
router.get('/my', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    // 1. FETCH REAL ROLE (Fixes the 'authenticated' bug)
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [user_id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const realRole = userCheck.rows[0].role;

    let query;
    // 2. DECIDE QUERY BASED ON REAL ROLE
    if (realRole === 'donor') {
      // For Donors: Show items they posted
      query = `
        SELECT d.id, d.description as food_type, d.quantity, d.expires_at as pickup_deadline, 
        
        /* DYNAMIC STATUS CHECK */
        CASE 
            WHEN d.expires_at < NOW() AND d.status = 'available' THEN 'expired'
            ELSE d.status 
        END as status,

        u.full_name as accepted_by_name
        FROM donations d
        LEFT JOIN users u ON d.claimed_by = u.id
        WHERE d.donor_id = $1
        ORDER BY d.created_at DESC
      `;
    } 
    else {
      // For NGOs: Show items they claimed
      query = `
        SELECT d.id, d.description as food_type, d.quantity, d.expires_at as pickup_deadline, d.status,
               u.full_name as donor_name
        FROM donations d
        JOIN users u ON d.donor_id = u.id
        WHERE d.claimed_by = $1
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

// -----------------------------------------------------
// 6. DELETE DONATION (Clear Expired/Available)
// -----------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // 1. Check ownership & status before deleting
    const checkQuery = 'SELECT donor_id, status FROM donations WHERE id = $1';
    const check = await pool.query(checkQuery, [id]);

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const donation = check.rows[0];

    // 2. Verify Owner
    if (donation.donor_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own donations' });
    }

    // 3. Safety Block: Don't delete if NGO already claimed it
    if (['claimed', 'collected'].includes(donation.status)) {
      return res.status(400).json({ error: 'Cannot delete. An NGO has already claimed this!' });
    }

    // 4. Hard Delete
    await pool.query('DELETE FROM donations WHERE id = $1', [id]);
    res.json({ success: true, message: 'Donation removed' });

  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;