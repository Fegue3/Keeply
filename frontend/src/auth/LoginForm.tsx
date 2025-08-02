import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import UserPool from './UserPool';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();
  const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0]?.toUpperCase() || '';
};  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!validateForm()) return;

    setIsLoading(true);

    const user = new CognitoUser({
      Username: formData.email,
      Pool: UserPool
    });

    const authDetails = new AuthenticationDetails({
      Username: formData.email,
      Password: formData.password
    });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const accessToken = session.getAccessToken().getJwtToken();
        const idToken = session.getIdToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const sub = session.getIdToken().decodePayload()['sub'];

        // Obter os atributos do utilizador
        user.getUserAttributes((err, attributes) => {
          if (err || !attributes) {
            console.error('Failed to load attributes:', err);
          }

          const attrMap: Record<string, string> = {};
          attributes?.forEach(attr => {
            attrMap[attr.getName()] = attr.getValue();
          });

          const tokenData = {
            accessToken,
            idToken,
            refreshToken,
            sub,
            name: attrMap.name || '',
            initials: getInitials(attrMap.name || ''),
            picture: attrMap['custom:picture'] || ''
          };

          localStorage.setItem('keeply_token', JSON.stringify(tokenData));

          setTimeout(() => navigate('/'), 1000);
        });
      },
      onFailure: (err) => {
        setIsLoading(false);
        setAuthError(err.message || 'Login failed');
      }
    });
  };

  return (
    <div className="keeply-form-container">
      <div className="keeply-form-header">
        <h2 className="keeply-form-title">Welcome back</h2>
        <p className="keeply-form-subtitle">Sign in to access your inventory</p>
      </div>

      <form className="keeply-form" onSubmit={handleSubmit}>
        <div className="keeply-form-group">
          <label htmlFor="email" className="keeply-label">Email</label>
          <div className="keeply-input-container">
            <Mail className="keeply-input-icon" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`keeply-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          {errors.email && <span className="keeply-error-message">{errors.email}</span>}
        </div>

        <div className="keeply-form-group">
          <label htmlFor="password" className="keeply-label">Password</label>
          <div className="keeply-input-container">
            <Lock className="keeply-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`keeply-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              disabled={isLoading}
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="keeply-password-toggle"
              disabled={isLoading}
            >
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          {errors.password && <span className="keeply-error-message">{errors.password}</span>}
        </div>

        {authError && (
          <div className="keeply-error-message" style={{ marginBottom: '1rem' }}>
            {authError}
          </div>
        )}

        <button 
          type="submit" 
          className="keeply-button"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Log in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to={`/login/forgot-password`} state={{ email: formData.email }} className="keeply-link">
            Forgot your password?
          </Link>
        </div>
      </form>

      <div className="keeply-form-footer">
        <p className="keeply-form-switch">
          Don't have an account?{' '}
          <Link to="/register" className="keeply-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
