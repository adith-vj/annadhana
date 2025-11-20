import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Import Routes
import authRoutes from "./routes/auth.js";       
import donationRoutes from "./routes/donations.js";

// Import Middleware
import authMiddleware from "./middleware/auth.js";

dotenv.config();
const app = express();

console.log("Supabase url:", process.env.SUPABASE_URL);
console.log("Supabase anon key:", process.env.SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// PUBLIC ROUTES (no authentication needed)
app.use('/api/auth', authRoutes);

// PROTECTED ROUTES (authentication required)
app.use('/api/donations', authMiddleware, donationRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Express backend is running!");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});