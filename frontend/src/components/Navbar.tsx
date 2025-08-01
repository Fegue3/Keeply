import React, { useState } from 'react';
import { Home, Package, Settings, Plus, Menu, X, User, LogOut } from 'lucide-react';
import './Navbar.css';

interface NavbarProps {
  isLoggedIn?: boolean;
  userName?: string;
  userInitials?: string;
  onSignIn?: () => void;
  onRegister?: () => void;
  onAddItem?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn = false,
  userName = "John Doe",
  userInitials = "JD",
  onSignIn,
  onRegister,
  onAddItem,
  onProfile,
  onSettings,
  onLogout
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleDropdownItemClick = (action?: () => void) => {
    setIsDropdownOpen(false);
    if (action) action();
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <a href="/" className="navbar-logo">
            Keeply
          </a>
        </div>

        <div className="navbar-center">
          <a href="/" className="navbar-link active">
            <Home size={18} />
            Dashboard
          </a>
          <a href="/items" className="navbar-link">
            <Package size={18} />
            Items
          </a>
          <a href="/settings" className="navbar-link">
            <Settings size={18} />
            Settings
          </a>
        </div>

        <div className="navbar-right">
          {isLoggedIn ? (
            <>
              <button className="btn-primary" onClick={onAddItem}>
                <Plus size={16} />
                Add Item
              </button>
              <div className="user-menu">
                <button className="user-avatar" onClick={toggleDropdown}>
                  {userInitials}
                </button>
                <div className={`dropdown ${isDropdownOpen ? 'open' : ''}`}>
                  <a 
                    href="#" 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDropdownItemClick(onProfile);
                    }}
                  >
                    <User size={16} />
                    Profile
                  </a>
                  <a 
                    href="#" 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDropdownItemClick(onSettings);
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </a>
                  <div className="dropdown-separator"></div>
                  <a 
                    href="#" 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDropdownItemClick(onLogout);
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              <a href="/signin" className="btn-secondary" onClick={onSignIn}>
                Sign In
              </a>
              <a href="/register" className="btn-primary" onClick={onRegister}>
                Register
              </a>
            </>
          )}
        </div>

        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-links">
          <a href="/" className="navbar-link active" onClick={closeMobileMenu}>
            <Home size={18} />
            Dashboard
          </a>
          <a href="/items" className="navbar-link" onClick={closeMobileMenu}>
            <Package size={18} />
            Items
          </a>
          <a href="/settings" className="navbar-link" onClick={closeMobileMenu}>
            <Settings size={18} />
            Settings
          </a>
        </div>

        {isLoggedIn ? (
          <div className="mobile-user-info">
            <div className="mobile-user-profile">
              <div className="user-avatar">{userInitials}</div>
              <span>{userName}</span>
            </div>
            <div className="mobile-actions">
              <button className="btn-primary" onClick={() => { onAddItem?.(); closeMobileMenu(); }}>
                <Plus size={16} />
                Add Item
              </button>
              <a 
                href="#" 
                className="navbar-link"
                onClick={(e) => {
                  e.preventDefault();
                  onProfile?.();
                  closeMobileMenu();
                }}
              >
                <User size={18} />
                Profile
              </a>
              <a 
                href="#" 
                className="navbar-link"
                onClick={(e) => {
                  e.preventDefault();
                  onLogout?.();
                  closeMobileMenu();
                }}
              >
                <LogOut size={18} />
                Logout
              </a>
            </div>
          </div>
        ) : (
          <div className="mobile-actions">
            <a href="/signin" className="btn-secondary" onClick={() => { onSignIn?.(); closeMobileMenu(); }}>
              Sign In
            </a>
            <a href="/register" className="btn-primary" onClick={() => { onRegister?.(); closeMobileMenu(); }}>
              Register
            </a>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;