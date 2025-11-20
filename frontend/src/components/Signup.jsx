import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function Signup({ onSignup, onSwitchToLogin, apiUrl }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor", // Default role
    location: "",  // We will auto-detect this later if needed
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Create User in your Postgres Table (Backend)
      // We send the 'role' here so the backend knows if they are Donor/NGO
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          uuid: data.user.id // Link Supabase ID to your DB
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Signup failed");

      // Login immediately after signup
      onSignup(result.user, data.session?.access_token);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>Create Account</h1>
      <p>Join the community to reduce food waste.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name / NGO Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password (min 6 chars)"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', color: '#555' }}>I am a:</label>
          <select 
            name="role" 
            value={formData.role} 
            onChange={handleChange}
            style={{ flex: 1 }}
          >
            <option value="donor">Food Donor</option>
            <option value="ngo">NGO / Volunteer</option>
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <p style={{ marginTop: '20px' }}>
        Already have an account?{" "}
        <span className="link" onClick={onSwitchToLogin}>
          Login here
        </span>
      </p>
    </div>
  );
}

export default Signup;