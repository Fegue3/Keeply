import { useState, useEffect } from 'react';
import { User, Users, Camera, Calendar, Info } from 'lucide-react';
import './AccountSettings.css';
import UserPool from '../auth/UserPool';
import { CognitoUserAttribute, CognitoUserSession } from 'amazon-cognito-identity-js';

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

  const roles = [
    { label: 'Parent', value: 'parent' },
    { label: 'Child', value: 'child' },
    { label: 'Guardian', value: 'guardian' },
    { label: 'Admin', value: 'admin' },
    { label: 'Member', value: 'member' }
  ];

  useEffect(() => {
    const user = UserPool.getCurrentUser();
    if (user) {
      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) return;

        user.getUserAttributes((err: any | null, attributes: CognitoUserAttribute[] | undefined) => {
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

          const initials = getInitials(userData.name || '');
          setInitials(initials);
          setLoading(false);
        });
      });
    }
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase();
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

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return;

      user.updateAttributes(attributeList, (err: any | null) => {
        if (err) {
          console.error('Update failed', err);
        } else {
          setSuccess('Changes saved successfully!');

          const updatedInitials = getInitials(formData.firstName);
          setInitials(updatedInitials);

          // 🔐 Gravar em localStorage
          localStorage.setItem('keeply_user_name', formData.firstName);
          localStorage.setItem('keeply_user_initials', updatedInitials);
          // localStorage.setItem('keeply_user_photo', ''); // futuro

          // 📣 Notificar a Navbar
          window.dispatchEvent(new CustomEvent('keeply:userUpdated', {
            detail: {
              name: formData.firstName,
              initials: updatedInitials,
              // photoUrl: '' // se usares imagem
            }
          }));

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
            <h2 className="section-title">
              <User size={20} /> Personal Information
            </h2>

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
                <div className="field-with-action">
                  <div className="email-display">{formData.email}</div>
                  <a href="#" className="change-link">Change</a>
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">
                  <Calendar size={16} /> Date of Birth
                </label>
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
            <h2 className="section-title">
              <Users size={20} /> Family & Role
            </h2>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Role in Family</label>
                <div className="info-box-row">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      className={`role-badge ${formData.role === role.value ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                    >
                      {role.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="section-title">
              <Info size={20} /> Additional Information
            </h2>

            <div className="info-box">
              <span className="info-label">Your Initials</span>
              <span className="info-value">{initials}</span>
            </div>

            <div className="info-box">
              <span className="info-label">Current Role</span>
              <span className="role-badge active">{formData.role.toUpperCase()}</span>
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
