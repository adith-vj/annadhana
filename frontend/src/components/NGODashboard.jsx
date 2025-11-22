import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import RoutingControl from "./RoutingControl";

// --- LEAFLET ICON FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;
// ------------------------

function NGODashboard({ user, token, apiUrl, onLogout }) {
  const [feed, setFeed] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  
  const [userLocation, setUserLocation] = useState(null); 
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [activeRoute, setActiveRoute] = useState(null); // Store destination [lat, long]
  
  // NEW: Radius State (Default 5km)
  const [radius, setRadius] = useState(5); 

  useEffect(() => {
    fetchNearbyFeed();
    fetchMyClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]); // Refetch when radius changes

  const fetchNearbyFeed = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]); 
        try {
          // Convert radius (km) to meters for the backend
          const response = await fetch(
            `${apiUrl}/donations?lat=${latitude}&long=${longitude}&radius=${radius * 1000}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await response.json();
          if (response.ok) setFeed(data);
        } catch (err) {
          console.error("Error fetching feed:", err);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLocationError("Please enable location access to see nearby food.");
        setLoading(false);
      }
    );
  };

  const fetchMyClaims = async () => {
    try {
      const res = await fetch(`${apiUrl}/donations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMyClaims(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleClaim = async (id) => {
    if (!window.confirm("Claim this food?")) return;
    try {
      const res = await fetch(`${apiUrl}/donations/${id}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveRoute(null); // Clear route if we claim it
        fetchNearbyFeed();
        fetchMyClaims();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (error) {
      console.error("Error claiming:", error);
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
      if (res.ok) fetchMyClaims(); 
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleShowRoute = (item) => {
    setViewMode('map');
    setActiveRoute([item.latitude, item.longitude]);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    // Appends Z to force UTC interpretation if missing
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(utcString).toLocaleString([], {
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>NGO Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
           <span>{user.name}</span>
           <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* --- CONTROLS SECTION --- */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
        
        {/* 1. View Toggle Switch */}
        <div 
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            style={{
                position: 'relative', width: '220px', height: '40px',
                backgroundColor: '#e0e0e0', borderRadius: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '0 5px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
            <div style={{
                position: 'absolute',
                left: viewMode === 'list' ? '5px' : '115px',
                width: '100px', height: '32px', backgroundColor: 'white',
                borderRadius: '16px', transition: 'left 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}></div>
            <span style={{ zIndex: 1, width: '50%', textAlign: 'center', fontSize: '0.9rem', fontWeight: viewMode === 'list' ? 'bold' : '500' }}>📋 List</span>
            <span style={{ zIndex: 1, width: '50%', textAlign: 'center', fontSize: '0.9rem', fontWeight: viewMode === 'map' ? 'bold' : '500' }}>🗺️ Map</span>
        </div>

        {/* 2. Radius Slider */}
        <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            backgroundColor: '#fff', padding: '10px 20px', borderRadius: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee'
        }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }}>Search Distance:</label>
            <input 
                type="range" 
                min="1" max="30" 
                value={radius} 
                onChange={(e) => setRadius(e.target.value)}
                style={{ cursor: 'pointer' }}
            />
            <span style={{ minWidth: '60px', fontWeight: 'bold', color: '#27ae60' }}>{radius} km</span>
        </div>

      </div>

      {locationError && <div className="error">{locationError}</div>}

      {loading ? <div className="loading"></div> : (
        <>
          {/* === MAP VIEW === */}
          {viewMode === 'map' && (
            <div className="animate-fade-in">
                <div className="info-box" style={{textAlign: 'center', marginBottom: '15px'}}>
                    <p style={{margin: 0}}>Showing food within <strong>{radius}km</strong>. Click "Path" for directions.</p>
                </div>
                
                {userLocation ? (
                    <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #ddd', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                        />
                        
                        {/* Routing Line */}
                        {activeRoute && (
                            <RoutingControl start={userLocation} end={activeRoute} />
                        )}
                        
                        {/* NGO Location */}
                        <Marker position={userLocation}>
                          <Popup>📍 <strong>Your Location</strong></Popup>
                        </Marker>

                        {/* Food Markers */}
                        {feed.map((item) => (
                        <Marker key={item.id} position={[item.latitude, item.longitude]}>
                            <Popup>
                            <strong>{item.food_type}</strong> <br/>
                            Qty: {item.quantity} <br/>
                            Expires: {formatTime(item.pickup_deadline)}
                            
                            <div style={{marginTop:'8px', display: 'flex', gap: '5px'}}>
                                <button 
                                    style={{ flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: '#27ae60', color: 'white', border:'none', borderRadius:'4px' }}
                                    onClick={() => handleClaim(item.id)}
                                >
                                    Claim
                                </button>
                                <button 
                                    style={{ flex: 1, padding: '6px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', border:'none', borderRadius:'4px' }}
                                    onClick={() => handleShowRoute(item)}
                                >
                                    ↘ Path
                                </button>
                            </div>
                            </Popup>
                        </Marker>
                        ))}
                    </MapContainer>
                    </div>
                ) : (
                    <p style={{textAlign: 'center'}}>Waiting for GPS...</p>
                )}
            </div>
          )}

          {/* === LIST VIEW === */}
          {viewMode === 'list' && (
            <div className="animate-fade-in">
                <div className="info-box">
                     <h3>Nearby Food ({radius}km)</h3>
                </div>

                {feed.length === 0 ? (
                    <div className="empty-state"><p>No food available within {radius}km.</p></div>
                ) : (
                    <table>
                    <thead>
                        <tr>
                        <th>Donor</th>
                        <th>Food</th>
                        <th>Qty</th>
                        <th>Deadline</th>
                        <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feed.map((item) => (
                        <tr key={item.id}>
                            <td>{item.donor_name}</td>
                            <td>{item.food_type}</td>
                            <td>{item.quantity}</td>
                            <td>{formatTime(item.pickup_deadline)}</td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleClaim(item.id)}>Claim</button>
                                <button 
                                    className="secondary"
                                    style={{ padding: '5px 10px', fontSize: '1.1rem' }}
                                    title="Show Path on Map"
                                    onClick={() => handleShowRoute(item)}
                                >
                                    🗺️
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}

                <h2 style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>My Claimed History</h2>
                
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
          )}
        </>
      )}
    </div>
  );
}

export default NGODashboard;