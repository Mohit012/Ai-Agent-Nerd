'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authAPI } from '@/lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await axios.get('http://localhost:5000/api/auth/me');
        setUser(res.data);
      }
    } catch (error) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && error.response?.status === 401) {
        try {
          const res = await authAPI.refreshToken(refreshToken);
          localStorage.setItem('token', res.token);
          localStorage.setItem('refreshToken', res.refreshToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${res.token}`;
          const userRes = await axios.get('http://localhost:5000/api/auth/me');
          setUser(userRes.data);
          return;
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } else {
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrToken, passwordOrData, rememberMe = false) => {
    if (typeof emailOrToken === 'object') {
      const userData = emailOrToken;
      axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      setUser(userData);
      return userData;
    }
    
    const res = await axios.post('http://localhost:5000/api/auth/login', { email: emailOrToken, password: passwordOrData, rememberMe });
    localStorage.setItem('token', res.data.token);
    if (res.data.refreshToken) {
      localStorage.setItem('refreshToken', res.data.refreshToken);
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post('http://localhost:5000/api/auth/register/init', { name, email, password });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  useEffect(() => {
    setMounted(true);
    fetchUser();
  }, [fetchUser]);

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
