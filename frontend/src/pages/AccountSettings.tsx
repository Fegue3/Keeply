import { useState, useEffect } from 'react';
import {User, Users, Camera } from 'lucide-react';
import './AccountSettings.css';
import UserPool from '../auth/UserPool';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';

const AccountSettings = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthdate: '',
    gender: '',
    role: ''
  });

  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const user = UserPool.getCurrentUser();
    if (user) {
      user.getSession((err: unknown, session: any) => {
        if (err || !session?.isValid()) return;

        user.getUserAttributes((err: unknown, attributes: CognitoUserAttribute[] | undefined) => {
          if (err || !attributes) return;
          const userData: Record<string, string> = {};
          attributes.forEach(attr => {
            userData[attr.getName()] = attr.getValue();
          });

          setFormData({
            firstName: userData.name || '',
            lastName: userData.family_name || '',
            email: userData.email || '',
            birthdate: userData.birthdate || '',
            gender: userData.gender || '',
            role: userData['custom:role'] || ''
          });

          setInitials(getInitials(userData.name || ''));
          setLoading(false);
        });
      });
    }
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const user = UserPool.getCurrentUser();
    if (!user) return;

    const attributeList = [
      new CognitoUserAttribute({ Name: 'name', Value: formData.firstName }),
      new CognitoUserAttribute({ Name: 'family_name', Value: formData.lastName }),
      new CognitoUserAttribute({ Name: 'birthdate', Value: formData.birthdate }),
      new CognitoUserAttribute({ Name: 'gender', Value: formData.gender }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: formData.role })
    ];

    user.getSession((err: unknown, session: any) => {
      if (err || !session?.isValid()) return;

      user.updateAttributes(attributeList, (err: unknown) => {
        if (err) {
          console.error('Update failed', err);
        } else {
          setSuccess('Changes saved successfully!');
          setInitials(getInitials(formData.firstName));
          setTimeout(() => setSuccess(''), 3000);
        }
      });
    });
  };

  if (loading) return <div className="keeply-container">Loading...</div>;

  return (
    <div className="settings-container">

      <div className="keeply-container">
        <main className="settings-main">
          <div className="settings-header">
            <h1 className="settings-title">Account Settings</h1>
            <p className="settings-subtitle">Manage your personal information and profile settings</p>
          </div>

          <div className="profile-picture-section">
            <div className="profile-picture">
              <div className="profile-avatar">{initials}</div>
              <button className="profile-edit-btn" title="Change profile picture">
                <Camera size={16} />
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title"><User size={20} /> Personal Information</h2>
            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="form-input" />
              </div>
              <div className="form-field">
                <label className="form-label">Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="form-input" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" value={formData.email} className="form-input" readOnly />
              </div>
            </div>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">Date of Birth</label>
                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange} className="form-input" />
              </div>
              <div className="form-field">
                <label className="form-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select">
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title"><Users size={20} /> Family & Role</h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Role in Family</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="form-select">
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="guardian">Guardian</option>
                  <option value="admin">Family Admin</option>
                  <option value="member">Family Member</option>
                </select>
              </div>
            </div>
          </div>

          <div className="save-section">
            <button onClick={handleSave} className="keeply-btn">Save Changes</button>
            {success && <p className="keeply-success-message">{success}</p>}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AccountSettings;
