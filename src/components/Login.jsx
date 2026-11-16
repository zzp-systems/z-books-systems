import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, setToken } from '../api.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await auth.login(username, password);
      setToken(res.token);
      navigate('/');
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>z-books</h1>
        <p className="subtitle">Jang-Jang Bakeshop — Accounting / ARAP</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="arap-login-username">Username</label>
            <input id="arap-login-username" name="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="arap-login-password">Password</label>
            <input id="arap-login-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="muted" style={{ marginTop: '16px', textAlign: 'center' }}>Shared SSO with CRM + WMS</p>
      </div>
    </div>
  );
}
