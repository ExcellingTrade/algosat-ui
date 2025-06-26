"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, LoginRequest, LoginResponse } from '@/lib/api';

interface User {
  user_id: number;
  username: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated on app start
    const checkAuth = async () => {
      console.log('AuthContext: Checking initial authentication...');
      try {
        if (apiClient.isAuthenticated()) {
          console.log('AuthContext: Token found, validating...');
          
          // Check for 1 hour of inactivity instead of 2-hour total session
          const lastActivityTime = localStorage.getItem('last_activity_time');
          const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
          
          if (lastActivityTime && Date.now() - parseInt(lastActivityTime) > oneHourInMs) {
            console.log('AuthContext: Session expired due to 1 hour of inactivity, logging out');
            await logout();
            return;
          }
          
          // Try to get system status to validate token
          const systemStatus = await apiClient.getSystemStatus();
          console.log('AuthContext: Token is valid, system status:', systemStatus);
          
          // Get user info from token or set a basic user object
          const storedUserInfo = localStorage.getItem('user_info');
          let user;
          if (storedUserInfo) {
            user = JSON.parse(storedUserInfo);
          } else {
            // Fallback user object
            user = {
              user_id: 1,
              username: 'authenticated_user',
              email: 'user@example.com'
            };
          }
          setUser(user);
          console.log('AuthContext: User set from existing token:', user);
        } else {
          console.log('AuthContext: No token found');
        }
      } catch (error) {
        console.error('AuthContext: Token validation failed:', error);
        // Token is invalid, clear it
        await apiClient.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('AuthContext: Initial auth check completed');
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setError(null);
      setIsLoading(true);
      console.log('AuthContext: Starting login process...');
      const response: LoginResponse = await apiClient.login(credentials);
      console.log('AuthContext: Login response received:', { 
        hasToken: !!response.access_token, 
        userInfo: response.user_info,
        tokenType: response.token_type,
        expiresIn: response.expires_in 
      });
      
      // Store user info in localStorage for persistence
      if (response.user_info) {
        localStorage.setItem('user_info', JSON.stringify(response.user_info));
      }
      
      setUser(response.user_info);
      console.log('AuthContext: User state updated, isAuthenticated should be:', !!response.user_info);
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
      console.log('AuthContext: Login process completed');
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user info from localStorage
      localStorage.removeItem('user_info');
      localStorage.removeItem('initial_login_time');
      localStorage.removeItem('last_activity_time');
      setUser(null);
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
