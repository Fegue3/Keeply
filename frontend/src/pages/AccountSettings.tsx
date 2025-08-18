import { useState, useEffect } from 'react';
import { User, Users, Calendar, Info } from 'lucide-react';
import './AccountSettings.css';
import UserPool from '../auth/UserPool';
import { CognitoUserAttribute, CognitoUserSession } from 'amazon-cognito-identity-js';
import EmailChangeWidget from '../components/EmailChangeWidget';
import UserAvatar from "../components/UserAvatar";
import AvatarEditor from "../components/AvatarEditor";

const AccountSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    birthdate: '',
    gender: '',
    role: ''
  });

  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [showEmailWidget, setShowEmailWidget] = useState(false);
  const [avatarBust, setAvatarBust] = useState<number>(0);

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

        user.getUserAttributes((getErr: any, attributes) => {
          if (getErr || !attributes) return;
          const userData: Record<string, string> = {};
          attributes.forEach(attr => {
            userData[attr.getName()] = attr.getValue();
          });

          const fullName = userData.name || '';
          const userInitials = getInitials(fullName);

          setFormData({
            name: fullName,
            lastName: userData.family_name || '',
            email: userData.email || '',
            birthdate: userData.birthdate || '',
            gender: userData.gender || '',
            role: userData['custom:role'] || ''
          });

          setInitials(userInitials);
          setLoading(false);
        });
      });
    }
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const user = UserPool.getCurrentUser();
    if (!user) return;

    const attributeList = [
      new CognitoUserAttribute({ Name: 'name', Value: formData.name }),
      new CognitoUserAttribute({ Name: 'family_name', Value: formData.lastName }),
      new CognitoUserAttribute({ Name: 'birthdate', Value: formData.birthdate }),
      new CognitoUserAttribute({ Name: 'gender', Value: formData.gender }),
      new CognitoUserAttribute({ Name: 'custom:role', Value: formData.role }),
      new CognitoUserAttribute({ Name: 'custom:initials', Value: getInitials(formData.name) })
    ];

    const userObj = UserPool.getCurrentUser();
    if (!userObj) return;

    userObj.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return;

      userObj.updateAttributes(attributeList, (updErr: any) => {
        if (updErr) {
          console.error('Update failed', updErr);
        } else {
          setSuccess('Changes saved successfully!');
          const updatedInitials = getInitials(formData.name);
          setInitials(updatedInitials);

          localStorage.setItem('keeply_user_name', formData.name);
          localStorage.setItem('keeply_user_initials', updatedInitials);

          window.dispatchEvent(new CustomEvent('keeply:userUpdated', {
            detail: { name: formData.name, initials: updatedInitials }
          }));

          setTimeout(() => setSuccess(''), 3000);
        }
      });
    });
  };

  if (loading) return <div className="keeply-container">Loading...</div>;

  return (
    <div className="settings-container">
      <div className="keeply-container-account">
        <main className="settings-main">
          <div className="settings-header">
            <h1 className="settings-title">Account Settings</h1>
            <p className="settings-subtitle">Manage your personal information and profile settings</p>
          </div>

          <div className="profile-picture-section">
  <div className="profile-picture" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
    <UserAvatar size={120} initials={initials} cacheBust={avatarBust} />
    <AvatarEditor onChanged={() => setAvatarBust(Date.now())} />
  </div>
</div>

          <div className="form-section">
            <h2 className="section-title">
              <User size={20} /> Personal Information
            </h2>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Family Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Email Address</label>
                <div className="field-with-action">
                  <div className="email-display">{formData.email}</div>
                  <button
                    type="button"
                    className="change-link"
                    onClick={() => setShowEmailWidget(true)}
                    aria-haspopup="dialog"
                    aria-expanded={showEmailWidget}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">
                  <Calendar size={16} /> Date of Birth
                </label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-select"
                >
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

      {showEmailWidget && (
        <EmailChangeWidget
          currentEmail={formData.email}
          onClose={() => setShowEmailWidget(false)}
          onSuccess={(newEmail: string) => {
            setFormData(prev => ({ ...prev, email: newEmail }));
            setShowEmailWidget(false);
          }}
        />
      )}
    </div>
  );
};

export default AccountSettings;
