/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

export type Role = 'ADMIN' | 'VETERINARIAN' | 'VOLUNTEER' | 'ADOPTER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  role: Role;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredAuth(): Pick<AuthContextType, 'user' | 'token'> {
  const storedToken = localStorage.getItem('rescue_pet_token');
  const storedUser = localStorage.getItem('rescue_pet_user');

  if (!storedToken || !storedUser) {
    return { user: null, token: null };
  }

  try {
    return { user: JSON.parse(storedUser) as User, token: storedToken };
  } catch {
    localStorage.removeItem('rescue_pet_token');
    localStorage.removeItem('rescue_pet_user');
    return { user: null, token: null };
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storedAuth = getStoredAuth();
  const [user, setUser] = useState<User | null>(storedAuth.user);
  const [token, setToken] = useState<string | null>(storedAuth.token);
  const [isLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('rescue_pet_token', newToken);
    localStorage.setItem('rescue_pet_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem('rescue_pet_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rescue_pet_token');
    localStorage.removeItem('rescue_pet_user');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const isAuthenticated = !!token && !!user;
  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated, login, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
