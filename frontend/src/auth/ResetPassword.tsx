// src/auth/ResetPassword.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CognitoUser } from 'amazon-cognito-identity-js';
import UserPool from './UserPool';
import './LoginForm.css';
import { Eye, EyeOff, Lock } from 'lucide-react';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = location.state?.email;
    const savedCode = location.state?.code;

    if (savedEmail && savedCode) {
      setEmail(savedEmail);
      setCode(savedCode);
    } else {
      navigate('/login');
    }
  }, [location.state, navigate]);

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword || !repeatPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword !== repeatPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const user = new CognitoUser({ Username: email, Pool: UserPool });

    user.confirmPassword(code, newPassword, {
      onSuccess: () => {
        setMessage('Password reset successful! Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      },
      onFailure: (err) => {
        setError(err.message || 'Error resetting password.');
        setLoading(false);
      },
    });
  };

  return (
    <div className="keeply-form-container">
      <h2 className="keeply-form-title">Choose a new password</h2>
      <p className="keeply-form-subtitle" style={{ marginBottom: '1rem' }}>
        Please enter and confirm your new password.
      </p>

      <form className="keeply-form" onSubmit={handleResetPassword}>
        <input type="hidden" value={email} />
        <input type="hidden" value={code} />

        <div className="keeply-form-group">
          <label className="keeply-label">New Password</label>
          <div className="keeply-input-container">
            <Lock className="keeply-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="keeply-input"
              placeholder="Enter new password"
              required
              style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="keeply-password-toggle"
              disabled={loading}
            >
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>

        <div className="keeply-form-group">
          <label className="keeply-label">Repeat Password</label>
          <div className="keeply-input-container">
            <Lock className="keeply-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              className="keeply-input"
              placeholder="Repeat new password"
              required
              style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="keeply-password-toggle"
              disabled={loading}
            >
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>

        {error && <p className="keeply-error-message">{error}</p>}
        {message && <p className="keeply-success-message">{message}</p>}

        <button type="submit" className="keeply-button" disabled={loading}>
          {loading ? 'Resetting...' : 'Confirm new password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
