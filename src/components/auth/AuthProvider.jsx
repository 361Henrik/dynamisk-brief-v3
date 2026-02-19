import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    // If no token, enter preview mode with a mock user
    if (!appParams.token) {
      setUser({ name: 'Preview-bruker', email: 'preview@example.com', role: 'admin', isActive: true });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    base44.auth.logout('/');
  };

  const isAdmin = user?.role === 'admin';
  const isFagperson = user?.role === 'fagperson';
  const isActive = user?.isActive !== false; // Default to true if not set

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAdmin,
      isFagperson,
      isActive,
      logout,
      refreshUser: loadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
