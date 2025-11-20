import express from 'express';
import pool from '../config/db.js'; // Use the 'pool' connection for SQL queries
import authenticate from '../middleware/auth.js';

const router = express.Router();

// 🔹 SIGNUP (Syncs Supabase Auth user to your Postgres Table)
router.post('/signup', async (req, res) => {
  // Frontend sends: uuid (from Supabase), name, email, role
  const { uuid, name, email, role } = req.body;

  try {
    // 1. Check if user already exists in your public table
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 2. Insert User
    // NOTE: We use ST_SetSRID(ST_MakePoint(0, 0), 4326) to satisfy the NOT NULL location constraint.
    // The user will update their real location later when they post food.
    const newUser = await pool.query(
      `INSERT INTO users (id, full_name, email, role, location) 
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint(0, 0), 4326)) 
       RETURNING *`,
      [uuid, name, email, role]
    );

    res.status(201).json({ success: true, user: newUser.rows[0] });

  } catch (err) {
    console.error("Signup Error:", err.message);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// 🔹 PROFILE (Used by Login.js to get user role/details)
router.get('/me',authenticate, async (req, res) => {
  // This route is protected by authMiddleware in index.js, so req.user is set
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: user.rows[0] });
  } catch (err) {
    console.error("Profile Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;