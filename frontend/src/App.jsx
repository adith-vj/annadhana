import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import DonorDashboard from './components/DonorDashboard.jsx';
import NGODashboard from './components/NGODashboard.jsx';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [view, setView] = useState('login'); // login, signup, dashboard
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Check if user already logged in
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setView('dashboard');
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  return (
    <>
      {view === 'login' && (
        <Login
          onLogin={handleLogin}
          onSwitchToSignup={() => setView('signup')}
          apiUrl={API_URL}
        />
      )}

      {view === 'signup' && (
        <Signup
          onSignup={handleLogin}
          onSwitchToLogin={() => setView('login')}
          apiUrl={API_URL}
        />
      )}

      {view === 'dashboard' && user && (
        <>
          {user.role === 'donor' ? (
            <DonorDashboard user={user} token={token} onLogout={handleLogout} />
          ) : (
            <NGODashboard user={user} token={token} onLogout={handleLogout} />
          )}
        </>
      )}
    </>
  );
}

export default App;
