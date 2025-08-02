import React, { useState } from 'react';
import { Link, useNavigate} from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import './SignupForm.css';
import './LoginForm.css';
import UserPool from './UserPool';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    family_name: '',
    email: '',
    password: '',
    birthdate: '',
    gender: '',
    role: 'member'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.family_name.trim()) newErrors.family_name = 'Family name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.birthdate) newErrors.birthdate = 'Birthdate is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const extractInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setSuccessMessage('');

    const initials = extractInitials(formData.name);

    const attributeList = [
      new CognitoUserAttribute({ Name: 'name', Value: formData.name }),
      new CognitoUserAttribute({ Name: 'family_name', Value: formData.family_name }),
      new CognitoUserAttribute({ Name: 'email', Value: formData.email }),
      new CognitoUserAttribute({ Name: 'birthdate', Value: formData.birthdate }),
      new CognitoUserAttribute({ Name: 'gender', Value: formData.gender }),
      new CognitoUserAttribute({ Name: 'custom:initials', Value: initials }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: formData.role })
    ];

    UserPool.signUp(formData.email, formData.password, attributeList, [], (err) => {
      setIsLoading(false);
      if (err) {
        setErrors({ email: err.message || 'Signup failed' });
        return;
      }
      setSuccessMessage('Account created! Check your email to confirm.');
    });
    setTimeout(() => {
    navigate('/register/confirm', { state: { email: formData.email } }); // passa o email
  }, 1500); 
  };

  return (
    <div className="keeply-form-container">
      <div className="keeply-form-header">
        <h2 className="keeply-form-title">Create your account</h2>
        <p className="keeply-form-subtitle">Start organizing your family's belongings</p>
      </div>

      {successMessage && <div className="keeply-success-message">{successMessage}</div>}

      <form className="keeply-form" onSubmit={handleSubmit}>
        <InputField label="Username" name="name" value={formData.name} icon={<User />} onChange={handleInputChange} error={errors.name} disabled={isLoading} />
        <InputField label="Family Name" name="family_name" value={formData.family_name} icon={<User />} onChange={handleInputChange} error={errors.family_name} disabled={isLoading} />
        <InputField label="Email" name="email" value={formData.email} icon={<Mail />} onChange={handleInputChange} error={errors.email} disabled={isLoading} />

        <div className="keeply-form-group">
          <label htmlFor="password" className="keeply-label">Password</label>
          <div className="keeply-input-container">
            <Lock className="keeply-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`keeply-input ${errors.password ? 'error' : ''}`}
              placeholder="Create a password"
              disabled={isLoading}
              style={{ paddingRight: '3rem' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="keeply-password-toggle" disabled={isLoading}>
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          {errors.password && <span className="keeply-error-message">{errors.password}</span>}
        </div>

        <InputField label="Birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleInputChange} error={errors.birthdate} disabled={isLoading} />

        <div className="keeply-form-group">
          <label htmlFor="gender" className="keeply-label">Gender</label>
          <div className="keeply-input-container">
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={`keeply-input ${errors.gender ? 'error' : ''}`}
              disabled={isLoading}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          {errors.gender && <span className="keeply-error-message">{errors.gender}</span>}
        </div>

        <button type="submit" className="keeply-button" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="keeply-form-footer">
        <p className="keeply-form-switch">
          Already have an account? <Link to="/login" className="keeply-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

const InputField = ({ label, name, value, icon, onChange, error, type = 'text', disabled = false }: any) => (
  <div className="keeply-form-group">
    <label htmlFor={name} className="keeply-label">{label}</label>
    <div className="keeply-input-container">
      {icon && <span className="keeply-input-icon">{icon}</span>}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`keeply-input ${error ? 'error' : ''}`}
        placeholder={`Enter your ${label.toLowerCase()}`}
        disabled={disabled}
      />
    </div>
    {error && <span className="keeply-error-message">{error}</span>}
  </div>
);

export default SignupForm;
