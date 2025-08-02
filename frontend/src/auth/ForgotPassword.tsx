// src/auth/ForgotPassword.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CognitoUser } from 'amazon-cognito-identity-js';
import UserPool from './UserPool';
import './LoginForm.css';
import { Mail, KeyRound } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = () => {
    setLoading(true);
    setMessage('');
    setError('');

    const user = new CognitoUser({ Username: email, Pool: UserPool });

    user.forgotPassword({
      onSuccess: () => {
        setMessage('Recovery code sent. Check your email.');
        setCodeSent(true);
        setLoading(false);
      },
      onFailure: (err) => {
        setError(err.message || 'Error sending code.');
        setLoading(false);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !code) {
      setError('Please fill in all fields.');
      return;
    }

    navigate('/login/reset-password', { state: { email, code } });
  };

  return (
    <div className="keeply-form-container">
      <h2 className="keeply-form-title">Forgot your password?</h2>
      <p className="keeply-form-subtitle">Enter your email and we'll send you a recovery code.</p>

      <form className="keeply-form" onSubmit={handleSubmit}>
        <div className="keeply-form-group">
          <label htmlFor="email">Email</label>
          <div className="keeply-input-container">
            <Mail className="keeply-input-icon" />
            <input
              type="email"
              id="email"
              className="keeply-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{ paddingRight: '6rem' }}
            />
            <button
              type="button"
              onClick={handleSendCode}
              className="keeply-button"
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0 1rem',
                height: '2rem',
                fontSize: '0.85rem'
              }}
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {codeSent && (
          <div className="keeply-form-group">
            <label htmlFor="code">Recovery code</label>
            <div className="keeply-input-container">
              <KeyRound className="keeply-input-icon" />
              <input
                type="text"
                id="code"
                className="keeply-input"
                placeholder="Enter the code from your email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {message && <p className="keeply-success-message">{message}</p>}
        {error && <p className="keeply-error-message">{error}</p>}

        <button
          type="submit"
          className="keeply-button"
          disabled={!email || !codeSent || !code}
          style={{ marginTop: '1rem' }}
        >
          Continue
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
