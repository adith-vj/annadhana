import React, { useState, useEffect } from "react";

function DonorDashboard({ user, token, apiUrl, onLogout }) {
  const [donations, setDonations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    food_type: "",
    quantity: "",
    pickup_deadline: "",
    location: user.location || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDonations();
    const interval = setInterval(fetchDonations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await fetch(`${apiUrl}/donations/my/donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) setDonations(data);
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

    try {
      const response = await fetch(`${apiUrl}/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create donation");
      }

      setFormData({
        food_type: "",
        quantity: "",
        pickup_deadline: "",
        location: user.location || "",
      });

      setShowForm(false);
      fetchDonations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (donationId) => {
    try {
      const response = await fetch(`${apiUrl}/donations/${donationId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.ok) fetchDonations();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Donor Dashboard</h2>
      <p>Welcome, {user.name}</p>

      <button onClick={onLogout}>Logout</button>

      <hr />

      {/* Create donation button */}
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "Create New Donation"}
      </button>

      {/* Donation form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <h3>Post Food Donation</h3>

          <label>Food Type</label>
          <input
            type="text"
            name="food_type"
            value={formData.food_type}
            onChange={handleChange}
            required
          />

          <label>Quantity</label>
          <input
            type="text"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
          />

          <label>Pickup Deadline</label>
          <input
            type="datetime-local"
            name="pickup_deadline"
            value={formData.pickup_deadline}
            onChange={handleChange}
            required
          />

          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Posting..." : "Post Donation"}
          </button>
        </form>
      )}

      <hr />

      <h3>My Donations</h3>

      {donations.length === 0 ? (
        <p>No donations posted yet.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ marginTop: "10px" }}>
          <thead>
            <tr>
              <th>Food Type</th>
              <th>Quantity</th>
              <th>Pickup Deadline</th>
              <th>Location</th>
              <th>Status</th>
              <th>Accepted By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((donation) => (
              <tr key={donation.id}>
                <td>{donation.food_type}</td>
                <td>{donation.quantity}</td>
                <td>{new Date(donation.pickup_deadline).toLocaleString()}</td>
                <td>{donation.location}</td>
                <td>{donation.status.toUpperCase()}</td>
                <td>{donation.accepted_by_name || "-"}</td>
                <td>
                  {donation.status === "accepted" && (
                    <button onClick={() => markAsCompleted(donation.id)}>
                      Mark Completed
                    </button>
                  )}
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
