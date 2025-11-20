import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/db.js'; // ✅ now using Supabase client

const router = express.Router();

// 🔹 Signup
router.post('/signup', async (req, res) => {
  const { name, email, password, role, location } = req.body;

  try {
    // 1️⃣ Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Insert new user
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          role,
          location,
        },
      ])
      .select('id, name, email, role, location') // return inserted user fields
      .single();

    if (insertError) throw insertError;

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { id: insertedUser.id, email: insertedUser.email, role: insertedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: insertedUser, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🔹 Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
