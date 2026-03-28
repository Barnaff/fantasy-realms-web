import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, type User } from 'firebase/auth';
import { auth } from '../src/firebase/config';

const NAV_ITEMS = [
  { to: '/cards', label: 'Cards', icon: '\u{1F0CF}' },
  { to: '/relics', label: 'Relics', icon: '\u{1F48E}' },
  { to: '/events', label: 'Events', icon: '\u{26A1}' },
  { to: '/themes', label: 'Themes', icon: '\u{1F3A8}' },
  { to: '/config', label: 'Config', icon: '\u{2699}\u{FE0F}' },
  { to: '/simulator', label: 'Simulator', icon: '\u{1F9EA}' },
  { to: '/art', label: 'Art Generator', icon: '\u{1F3A8}' },
  { to: '/analytics', label: 'Analytics', icon: '\u{1F4CA}' },
  { to: '/hands', label: 'Hands History', icon: '\u{1F0CF}' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Fantasy Realms</h1>
          <div className="subtitle">Admin Dashboard</div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-email">{user.email}</div>
          <button onClick={() => signOut(auth)}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function LoginScreen() {
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Fantasy Realms Admin</h1>
        <p>Sign in with your Google account to manage game data.</p>
        <button className="login-btn" onClick={handleLogin}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
        {error && <p style={{ color: '#ef4444', marginTop: 16, fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
