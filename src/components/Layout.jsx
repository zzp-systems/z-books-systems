import { Link, useLocation } from 'react-router-dom';
import { clearToken } from '../api.js';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/invoices', label: 'Receivables (AR)', icon: '📥' },
  { path: '/payables', label: 'Payables (AP)', icon: '📤' },
  { path: '/journal', label: 'Journal', icon: '📒' },
  { path: '/chart-of-accounts', label: 'Chart of Accts', icon: '📋' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const handleLogout = () => { clearToken(); window.location.href = '/login'; };
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">z-books<span>Jang-Jang Bakeshop ARAP</span></div>
        <nav>
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''}>
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <nav style={{ marginTop: '40px' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: '#e74c3c' }}>🚪 Logout</a>
        </nav>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
