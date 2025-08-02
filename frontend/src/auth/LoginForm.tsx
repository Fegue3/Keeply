import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginForm.css';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Login attempt:', formData);
      // TODO: redirect or save auth token
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
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

        <button 
          type="submit" 
          className="keeply-button"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Log in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="#" className="keeply-link">Forgot your password?</a>
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
