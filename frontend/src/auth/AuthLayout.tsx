import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './AuthLayout.css';
import illustrationImage from '../assets/icon.jpg';

const AuthLayout: React.FC = () => {
  return (
    <div className="keeply-container">

      {/* Main Content */}
      <main className="keeply-main">
        {/* Desktop Illustration Section */}
        <div className="keeply-illustration-section">
          <header className="keeply-header">
        <Link to="/" className="keeply-logo keeply-logo-link">
  Keeply
</Link>
      </header>
          <img 
            src={illustrationImage} 
            alt="Keeply - Organize your family's important belongings"
            className="keeply-illustration"
          />
        </div>

        {/* Form Section */}
        <div className="keeply-form-section">
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Mobile Illustration */}
            <img 
              src={illustrationImage} 
              alt="Keeply - Organize your family's important belongings"
              className="keeply-mobile-illustration"
            />
            
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
