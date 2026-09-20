import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, check if a token already exists and restore the session
  useEffect(() => {
    const storedUser = localStorage.getItem('earnshield_user');
    const storedToken = localStorage.getItem('earnshield_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, ...userData } = response.data;

    localStorage.setItem('earnshield_token', token);
    localStorage.setItem('earnshield_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const signup = async (name, email, password, zone) => {
    const response = await api.post('/auth/signup', { name, email, password, zone });
    const { token, ...userData } = response.data;

    localStorage.setItem('earnshield_token', token);
    localStorage.setItem('earnshield_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('earnshield_token');
    localStorage.removeItem('earnshield_user');
    setUser(null);
  };

  const value = { user, loading, login, signup, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};