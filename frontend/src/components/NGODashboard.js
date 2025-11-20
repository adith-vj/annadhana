import React, { useState, useEffect } from "react";

function NGODashboard({ user, token, apiUrl, onLogout }) {
  const [donations, setDonations] = useState([]);
  const [myDonations, setMyDonations] = useState([]);
  const [filters, setFilters] = useState({
    location: "",
    status: "posted",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDonations();
    fetchMyDonations();

    const interval = setInterval(() => {
      fetchDonations();
      fetchMyDonations();
    }, 10000);

    return () => clearInterval(interval);
  }, [filters]);

  const fetchDonations = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.location) params.append("location", filters.location);

      const response = await fetch(`${apiUrl}/donations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) setDonations(data);
    } catch (err) {
      console.error("Error fetching donations:", err);
    }
  };

  const fetchMyDonations = async () => {
    try {
      const response = await fetch(`${apiUrl}/donations/my/donations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) setMyDonations(data);
    } catch (err) {
      console.error("Error fetching my donations:", err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const acceptDonation = async (donationId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/donations/${donationId}/accept`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchDonations();
        fetchMyDonations();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to accept donation");
      }
    } catch (err) {
      console.error("Error accepting donation:", err);
      alert("Failed to accept donation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>NGO Dashboard</h2>
      <p>Welcome, {user.name}</p>

      <button onClick={onLogout}>Logout</button>

      <hr />

      <h3>Available Donations</h3>

      {/* Filters */}
      <label>Status: </label>
      <select name="status" value={filters.status} onChange={handleFilterChange}>
        <option value="posted">Posted</option>
        <option value="accepted">Accepted</option>
        <option value="completed">Completed</option>
        <option value="">All</option>
      </select>

      <hr />

      {donations.length === 0 ? (
        <p>No donations available.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ marginTop: "10px" }}>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Food Type</th>
              <th>Quantity</th>
              <th>Pickup Deadline</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {donations.map((donation) => (
              <tr key={donation.id}>
                <td>{donation.donor_name}</td>
                <td>{donation.food_type}</td>
                <td>{donation.quantity}</td>
                <td>{new Date(donation.pickup_deadline).toLocaleString()}</td>
                <td>{donation.location}</td>
                <td>{donation.status.toUpperCase()}</td>
                <td>
                  {donation.status === "posted" && (
                    <button
                      onClick={() => acceptDonation(donation.id)}
                      disabled={loading}
                    >
                      {loading ? "Accepting..." : "Accept"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      <h3>My Accepted Donations</h3>

      {myDonations.length === 0 ? (
        <p>You haven’t accepted any donations yet.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ marginTop: "10px" }}>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Food Type</th>
              <th>Quantity</th>
              <th>Pickup Deadline</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {myDonations.map((donation) => (
              <tr key={donation.id}>
                <td>{donation.donor_name}</td>
                <td>{donation.food_type}</td>
                <td>{donation.quantity}</td>
                <td>{new Date(donation.pickup_deadline).toLocaleString()}</td>
                <td>{donation.location}</td>
                <td>{donation.status.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default NGODashboard;
