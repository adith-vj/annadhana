import express from "express";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.get("/me", authenticate, async (req, res) => {
  res.json({ message: "Authenticated!", user: req.user });
});

export default router;
