import React, { useState, useEffect } from 'react';
import { Home, Package, Settings, Plus, Menu, X, User, LogOut } from 'lucide-react';
import './Navbar.css';
import UserPool from '../auth/UserPool';
import { getAuthToken, isAuthenticated } from '../utils/auth';

const Navbar: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();

    if (token && isAuthenticated()) {
      setIsLoggedIn(true);
      setUserName(token.name || 'User');
      setUserInitials(token.initials || (token.name?.[0]?.toUpperCase() || 'U'));
    }

    const currentUser = UserPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (err || !session?.isValid()) return;

        currentUser.getUserAttributes((err, attributes) => {
          if (err || !attributes) return;

          const attrMap: Record<string, string> = {};
          attributes.forEach(attr => {
            attrMap[attr.getName()] = attr.getValue();
          });

          setUserName(attrMap.name || 'User');
          setUserInitials(
            attrMap['custom:initials'] ||
            (attrMap.name ? attrMap.name[0]?.toUpperCase() : 'U')
          );

          setIsLoggedIn(true);
        });
      });
    }
  }, []);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const logout = () => {
    localStorage.removeItem('keeply_token');
    const currentUser = UserPool.getCurrentUser();
    if (currentUser) currentUser.signOut();

    setIsLoggedIn(false);
    setUserName('');
    setUserInitials('');
    window.location.href = '/login';
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <a href="/" className="navbar-logo">Keeply</a>
        </div>

        <div className="navbar-center">
          <a href="/" className="navbar-link active"><Home size={18} /> Dashboard</a>
          <a href="/items" className="navbar-link"><Package size={18} /> Items</a>
          <a href="/settings" className="navbar-link"><Settings size={18} /> Settings</a>
        </div>

        <div className="navbar-right">
          {isLoggedIn ? (
            <>
              <a href="/add" className="btn-primary">
                <Plus size={16} /> Add Item
              </a>
              <div className="user-menu">
                <button className="user-avatar" onClick={toggleDropdown}>
                  {userInitials}
                </button>
                <div className={`dropdown ${isDropdownOpen ? 'open' : ''}`}>
                  <a href="/profile" className="dropdown-item"><User size={16} /> Profile</a>
                  <a href="/settings" className="dropdown-item"><Settings size={16} /> Settings</a>
                  <div className="dropdown-separator"></div>
                  <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="dropdown-item">
                    <LogOut size={16} /> Logout
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              <a href="/login" className="btn-secondary">Sign In</a>
              <a href="/register" className="btn-primary">Register</a>
            </>
          )}
        </div>

        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMobileMenu}
          style={{
            position: 'fixed',
            top: '72px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1400,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-links">
          <a href="/" className="navbar-link active" onClick={closeMobileMenu}><Home size={18} /> Dashboard</a>
          <a href="/items" className="navbar-link" onClick={closeMobileMenu}><Package size={18} /> Items</a>
          <a href="/settings" className="navbar-link" onClick={closeMobileMenu}><Settings size={18} /> Settings</a>
        </div>

        {isLoggedIn ? (
          <div className="mobile-user-info">
            <div className="mobile-user-profile">
              <div className="user-avatar">{userInitials}</div>
              <span>{userName}</span>
            </div>
            <div className="mobile-actions">
              <a href="/add" className="btn-primary" onClick={closeMobileMenu}><Plus size={16} /> Add Item</a>
              <a href="/profile" className="navbar-link" onClick={closeMobileMenu}><User size={18} /> Profile</a>
              <a href="#" className="navbar-link" onClick={(e) => { e.preventDefault(); logout(); closeMobileMenu(); }}>
                <LogOut size={18} /> Logout
              </a>
            </div>
          </div>
        ) : (
          <div className="mobile-actions">
            <a href="/login" className="btn-secondary" onClick={closeMobileMenu}>Sign In</a>
            <a href="/register" className="btn-primary" onClick={closeMobileMenu}>Register</a>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
