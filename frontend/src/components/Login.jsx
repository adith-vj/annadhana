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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      const token = data.session.access_token;

      const response = await fetch(`${apiUrl}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = await response.json();

      if (!response.ok) {
        throw new Error(userData.error || "Authentication failed");
      }

      onLogin(userData.user || data.user, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>Welcome Back</h1>
      <p>Login to continue saving food.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? <span className="loading"></span> : "Login"}
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Don't have an account?{" "}
        <span className="link" onClick={onSwitchToSignup}>
          Sign up here
        </span>
      </p>
    </div>
  );
}

export default Login;