import supabase from "../config/supabase.js";

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user; // attach user to request
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
};

export default authenticate;
