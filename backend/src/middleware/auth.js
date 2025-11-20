import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify using your Supabase JWT Secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⚠️ CRITICAL FIX FOR SUPABASE TOKENS:
    // Supabase stores the UUID in 'sub'. We map it to 'id' for your app.
    req.user = {
      ...decoded,
      id: decoded.sub, // Map 'sub' -> 'id'
      role: decoded.user_metadata?.role || decoded.role || 'donor' 
      // Fallback: sometimes role is in metadata, sometimes top level. 
      // You might need to fetch the real role from DB if it's not in the token.
    };

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

export default authenticate;