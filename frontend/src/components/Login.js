import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function Login({ onLogin, onSwitchToSignup, apiUrl }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔐 Step 1: Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      const token = data.session.access_token;

      // 🛰 Step 2: Send token to backend to access protected routes
      const response = await fetch(`${apiUrl}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = await response.json();

      if (!response.ok) {
        throw new Error(userData.error || "Authentication failed");
      }

      // ✅ Success: notify parent
      onLogin(userData.user || data.user, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES OBJECT (same as before) ---
  const styles = {
    container: {
      maxWidth: "400px",
      margin: "50px auto",
      padding: "30px",
      backgroundColor: "#ffffff",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      fontFamily: "Arial, sans-serif",
    },
    header: {
      textAlign: "center",
      color: "#333",
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      padding: "12px",
      marginBottom: "15px",
      border: "1px solid #ddd",
      borderRadius: "5px",
      boxSizing: "border-box",
    },
    button: {
      width: "100%",
      padding: "12px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold",
    },
    linkText: {
      textAlign: "center",
      marginTop: "15px",
      fontSize: "14px",
    },
    linkButton: {
      background: "none",
      border: "none",
      color: "#007bff",
      cursor: "pointer",
      textDecoration: "underline",
      fontSize: "14px",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={styles.linkText}>
        Don't have an account?{" "}
        <button style={styles.linkButton} onClick={onSwitchToSignup}>
          Sign up here
        </button>
      </p>
    </div>
  );
}

export default Login;
