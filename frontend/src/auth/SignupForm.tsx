import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SignupForm.css';
import './LoginForm.css'; // Shared styles
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
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

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      console.log('Signup attempt:', formData);
      // TODO: Save user / Redirect
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="keeply-form-container">
      <div className="keeply-form-header">
        <h2 className="keeply-form-title">Create your account</h2>
        <p className="keeply-form-subtitle">Start organizing your family's belongings</p>
      </div>

      <form className="keeply-form" onSubmit={handleSubmit}>
        <div className="keeply-form-group">
          <label htmlFor="name" className="keeply-label">Name</label>
          <div className="keeply-input-container">
            <User className="keeply-input-icon" />
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`keeply-input ${errors.name ? 'error' : ''}`}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>
          {errors.name && <span className="keeply-error-message">{errors.name}</span>}
        </div>

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
              placeholder="Create a password"
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="keeply-form-footer">
        <p className="keeply-form-switch">
          Already have an account?{' '}
          <Link to="/login" className="keeply-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
