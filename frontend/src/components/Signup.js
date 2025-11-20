import React, { useState } from "react";
import { supabase } from "../config/supabase"; // make sure this file exists

function Signup({ onSignup, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1️⃣ Get user location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;

      // 2️⃣ Create Supabase Auth user
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (signupError) throw signupError;

      const user = signupData.user;

      // 3️⃣ Insert profile data into `users` table
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        full_name: formData.name,
        email: formData.email,
        role: formData.role,
        location: `SRID=4326;POINT(${longitude} ${latitude})`,
      });

      if (insertError) throw insertError;

      alert("Signup successful!");
      onSignup(user);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

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
    radioGroup: {
      margin: "15px 0",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
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
      <h2 style={styles.header}>Sign Up</h2>

      <form onSubmit={handleSubmit}>
        <input
          style={styles.input}
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          style={styles.input}
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          style={styles.input}
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div style={styles.radioGroup}>
          <label>
            <input
              type="radio"
              name="role"
              value="donor"
              checked={formData.role === "donor"}
              onChange={handleChange}
              style={{ marginRight: "5px" }}
            />
            Donor
          </label>

          <label>
            <input
              type="radio"
              name="role"
              value="ngo"
              checked={formData.role === "ngo"}
              onChange={handleChange}
              style={{ marginRight: "5px" }}
            />
            NGO
          </label>
        </div>

        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Signing up..." : "Create Account"}
        </button>
      </form>

      <p style={styles.linkText}>
        Already have an account?{" "}
        <button style={styles.linkButton} onClick={onSwitchToLogin}>
          Login here
        </button>
      </p>
    </div>
  );
}

export default Signup;
