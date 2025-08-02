import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CognitoUser } from 'amazon-cognito-identity-js';
import UserPool from './UserPool';
import './LoginForm.css';

const ConfirmForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    const user = new CognitoUser({
      Username: email,
      Pool: UserPool
    });

    user.confirmRegistration(code, true, (err) => {
      setLoading(false);
      if (err) {
        setMsg(err.message || 'Confirmation failed.');
      } else {
        setMsg('Email confirmed! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      }
    });
  };

  return (
    <div className="keeply-form-container">
      <h2 className="keeply-form-title">Confirm your email</h2>
      <p className="keeply-form-subtitle" style={{ marginBottom: '1rem' }}>
        We've sent a confirmation code to your email. Please enter it below.
      </p>

      <form onSubmit={handleConfirm} className="keeply-form">
        <input type="hidden" value={email} />

        <div className="keeply-form-group">
          <label>Confirmation Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            className="keeply-input"
            placeholder="Enter the code from your email"
          />
        </div>

        <button type="submit" className="keeply-button" disabled={loading}>
          {loading ? 'Verifying...' : 'Confirm Email'}
        </button>

        {msg && <p className="keeply-success-message">{msg}</p>}
      </form>
    </div>
  );
};

export default ConfirmForm;
