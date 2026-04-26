import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import './Navbar.css';

export const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="navbar-logo">✏️ SyncDocs</span>
        </div>

        <div className="navbar-user">
          {user && (
            <>
              <img
                src={user.avatar}
                alt={user.name}
                className="user-avatar"
                title={user.name}
              />
              <span className="user-name">{user.name}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
