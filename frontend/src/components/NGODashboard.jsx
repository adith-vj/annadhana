import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// --- FIX LEAFLET DEFAULT ICON ISSUE ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

function NGODashboard({ user, token, apiUrl, onLogout }) {
  const [feed, setFeed] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    fetchNearbyFeed();
    fetchMyClaims();
  }, []);

  const fetchNearbyFeed = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `${apiUrl}/donations?lat=${latitude}&long=${longitude}&radius=5000`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await response.json();
          if (response.ok) setFeed(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationError("Please enable location access.");
        setLoading(false);
      }
    );
  };

  const fetchMyClaims = async () => {
    const res = await fetch(`${apiUrl}/donations/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setMyClaims(data);
  };

  const handleClaim = async (id) => {
    if (!window.confirm("Claim this food?")) return;
    const res = await fetch(`${apiUrl}/donations/${id}/accept`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchNearbyFeed();
      fetchMyClaims();
    }
  };
  const handleStatusUpdate = async (id, newStatus) => {
    if (!window.confirm("Confirm you have collected this food?")) return;

    try {
      const res = await fetch(`${apiUrl}/donations/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchMyClaims(); // Refresh the list to show "COLLECTED"
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>NGO Feed</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span>{user.name}</span>
           <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div className="info-box">
        <h3>Nearby Food (5km Radius)</h3>
        <p>This list updates based on your current GPS location.</p>
      </div>

      {locationError && <div className="error">{locationError}</div>}
      
      {loading ? <div className="loading" style={{margin: '20px'}}></div> : (
        <>
          {feed.length === 0 ? (
             <div className="empty-state"><p>No food available nearby right now.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Food</th>
                  <th>Qty</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((item) => (
                  <tr key={item.id}>
                    <td>{item.donor_name}</td>
                    <td>{item.food_type}</td>
                    <td>{item.quantity}</td>
                    <td>{new Date(item.pickup_deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td>
                      <button onClick={() => handleClaim(item.id)}>Claim</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <h2 style={{ marginTop: '40px' }}>My Claimed History</h2>
      {myClaims.length === 0 ? (
        <p style={{ color: '#666' }}>No history yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Food</th>
              <th>Donor</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {myClaims.map((item) => (
              <tr key={item.id}>
                <td>{item.food_type}</td>
                <td>{item.donor_name}</td>
                <td>
                  <span className={`badge badge-${item.status}`}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {/* Only show button if it's just claimed, not yet collected */}
                  {item.status === 'claimed' && (
                    <button 
                      className="secondary" 
                      style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                      onClick={() => handleStatusUpdate(item.id, 'collected')}
                    >
                      Mark Collected
                    </button>
                  )}
                  {item.status === 'collected' && <span>✅ Done</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default NGODashboard;