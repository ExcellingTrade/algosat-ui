"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect during initial loading
    if (isLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedPage = pathname.startsWith('/dashboard');

    // If user is not authenticated and trying to access protected pages
    if (!isAuthenticated && isProtectedPage) {
      console.log('RouteGuard: Redirecting to login - user not authenticated');
      router.push('/login');
      return;
    }

    // If user is authenticated and trying to access auth pages
    if (isAuthenticated && isAuthPage) {
      console.log('RouteGuard: Redirecting to dashboard - user already authenticated');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading during authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--muted-foreground)]">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
