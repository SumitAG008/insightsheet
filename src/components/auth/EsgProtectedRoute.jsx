import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { backendApi } from '@/api/backendClient';

export default function EsgProtectedRoute({ children, allowlist }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAllowed, setIsAllowed] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsAllowed(false);
        return;
      }

      const user = await backendApi.auth.me();
      const email = String(user?.email || '').toLowerCase().trim();
      setIsAuthenticated(!!email);
      setIsAllowed(Array.isArray(allowlist) && allowlist.map((e) => String(e).toLowerCase().trim()).includes(email));
    } catch {
      backendApi.auth.logout();
      setIsAuthenticated(false);
      setIsAllowed(false);
    }
  };

  if (isAuthenticated === null || isAllowed === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

EsgProtectedRoute.propTypes = {
  children: PropTypes.node,
  allowlist: PropTypes.arrayOf(PropTypes.string),
};
