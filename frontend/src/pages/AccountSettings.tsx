import { useState, useEffect } from 'react';
import { User, Users, Calendar, Info } from 'lucide-react';
import './AccountSettings.css';
import UserPool from '../auth/UserPool';
import { CognitoUserAttribute, CognitoUserSession } from 'amazon-cognito-identity-js';
import EmailChangeWidget from '../components/EmailChangeWidget';
import UserAvatar from "../components/UserAvatar";
import AvatarEditor from "../components/AvatarEditor";

type FamilyResponse = {
  id: string;
  name: string;
  plan?: string;
  membersCount: number;
  myRole: string;
};

// ✅ URL da API (env + fallback com stage)
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "https://kupja6ps8e.execute-api.eu-north-1.amazonaws.com";

const AccountSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    birthdate: '',
    gender: '',
    familyRole: '', // role do user dentro da família (vinda da API)
    plan: 'free',   // plano da família (vindo da API; default free)
  });

  const [family, setFamily] = useState<FamilyResponse | null>(null);
  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showEmailWidget, setShowEmailWidget] = useState(false);
  const [avatarBust, setAvatarBust] = useState<number>(0);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0]?.toUpperCase() || '';
  };

  // 🔹 Carregar atributos do Cognito e família por utilizador (/families/by-user)
  useEffect(() => {
    const user = UserPool.getCurrentUser();
    if (!user) return;

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return;

      user.getUserAttributes((getErr: any, attributes) => {
        if (getErr || !attributes) return;

        const attr: Record<string, string> = {};
        attributes.forEach(a => (attr[a.getName()] = a.getValue()));

        const fullName = attr.name || '';
        const userInitials = getInitials(fullName);

        setFormData(prev => ({
          ...prev,
          name: fullName,
          lastName: attr.family_name || '',
          email: attr.email || '',
          birthdate: attr.birthdate || '',
          gender: attr.gender || '',
        }));

        setInitials(userInitials);
        setLoading(false);

        // 👉 chama a API para descobrir a família do utilizador autenticado
        const idToken = session.getIdToken().getJwtToken();
        console.debug('[Keeply] API_BASE_URL:', API_BASE_URL);

        fetch(`${API_BASE_URL}/families/by-user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
            Accept: 'application/json',
          },
        })
          .then(async r => {
            if (!r.ok) {
              console.error('[Keeply] GET /families/by-user falhou:', r.status, await r.text());
              throw new Error(`HTTP ${r.status}`);
            }
            return r.json();
          })
          .then((data: FamilyResponse) => {
            console.debug('[Keeply] family(by-user) data:', data);
            setFamily(data);
            setFormData(prev => ({
              ...prev,
              familyRole: data.myRole || 'member',
              plan: (data.plan || 'free').toLowerCase(),
            }));
          })
          .catch(e => console.error('[Keeply] erro no fetch /families/by-user:', e));
      });
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 🔒 Guardar apenas info pessoal (não muda role/plan)
  const handleSave = () => {
    const userObj = UserPool.getCurrentUser();
    if (!userObj) return;

    setSaving(true);

    const attributeList = [
      new CognitoUserAttribute({ Name: 'name', Value: formData.name }),
      new CognitoUserAttribute({ Name: 'family_name', Value: formData.lastName }),
      new CognitoUserAttribute({ Name: 'birthdate', Value: formData.birthdate }),
      new CognitoUserAttribute({ Name: 'gender', Value: formData.gender }),
      new CognitoUserAttribute({ Name: 'custom:initials', Value: getInitials(formData.name) }),
    ];

    userObj.updateAttributes(attributeList, (updErr: any) => {
      setSaving(false);
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

          {/* Personal */}
          <div className="form-section">
            <h2 className="section-title"><User size={20}/> Personal Information</h2>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label">Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input"/>
              </div>
              <div className="form-field">
                <label className="form-label">Family Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="form-input"/>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">Email Address</label>
                <div className="field-with-action">
                  <div className="email-display">{formData.email}</div>
                  <button type="button" className="change-link" onClick={() => setShowEmailWidget(true)} aria-haspopup="dialog" aria-expanded={showEmailWidget}>
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid form-grid-two-column">
              <div className="form-field">
                <label className="form-label"><Calendar size={16}/> Date of Birth</label>
                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange} className="form-input"/>
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

          {/* Family & Role (read-only) */}
          <div className="form-section">
            <h2 className="section-title"><Users size={20}/> Family & Role</h2>

            <div className="info-box">
              <span className="info-label">Family Name</span>
              <span className="info-value">{family?.name ?? '—'}</span>
            </div>

            <div className="info-box">
              <span className="info-label">Members</span>
              <span className="info-value">{family?.membersCount ?? 0}</span>
            </div>

            <div className="info-box">
              <span className="info-label">Your Role in this Family</span>
              <span className="role-badge active">{(family?.myRole || formData.familyRole || 'member').toUpperCase()}</span>
            </div>
          </div>

          {/* Additional */}
          <div className="form-section">
            <h2 className="section-title"><Info size={20}/> Additional Information</h2>

            <div className="info-box">
              <span className="info-label">Your Initials</span>
              <span className="info-value">{initials}</span>
            </div>

            <div className="info-box">
              <span className="info-label">Current Role (Plan)</span>
              <span className="role-badge active">{(family?.plan || formData.plan || 'free').toUpperCase()}</span>
            </div>
          </div>

          <div className="save-section">
            <button onClick={handleSave} className="keeply-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
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
