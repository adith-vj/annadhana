import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import authRoutes from "./routes/auth.js";       
import donationRoutes from "./routes/donations.js";
dotenv.config()
const app=express()
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Express backend is running!");
});
app.use("/api/profile", profileRoutes);
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});