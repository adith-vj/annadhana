import React, { useState, useEffect } from "react";

function DonorDashboard({ user, token, apiUrl, onLogout }) {
  const [donations, setDonations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    food_type: "",
    quantity: "",
    pickup_deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await fetch(`${apiUrl}/donations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDonations(data);
      }
    } catch (err) {
      console.error("Error fetching donations:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`${apiUrl}/donations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...formData, latitude, longitude }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed");

          setFormData({ food_type: "", quantity: "", pickup_deadline: "" });
          setShowForm(false);
          fetchDonations();
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Donor Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Hello, {user.name || 'Donor'}</span>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '20px' }}>
        {showForm ? "Cancel" : "+ Create New Donation"}
      </button>

      {showForm && (
        <div className="card auth-container" style={{ margin: '0 auto 30px', float: 'none' }}>
          <h2>Post Food</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="food_type"
              placeholder="Food Item (e.g. Rice & Curry)"
              value={formData.food_type}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="quantity"
              placeholder="Quantity (e.g. 5kg)"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
            <label style={{ fontSize: '14px', color: '#666' }}>Pickup Deadline</label>
            <input
              type="datetime-local"
              name="pickup_deadline"
              value={formData.pickup_deadline}
              onChange={handleChange}
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Posting..." : "Post Donation"}
            </button>
          </form>
        </div>
      )}

      <h2>My Donations</h2>
      {donations.length === 0 ? (
        <div className="empty-state">
          <p>You haven't posted any donations yet.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Food Item</th>
              <th>Quantity</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id}>
                <td>{d.food_type}</td>
                <td>{d.quantity}</td>
                <td>{new Date(d.pickup_deadline).toLocaleString()}</td>
                <td>
                  <span className={`badge badge-${d.status}`}>
                    {d.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DonorDashboard;