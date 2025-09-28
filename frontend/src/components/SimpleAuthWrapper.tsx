import React from 'react';
import { useSimpleAuth } from '../hooks/use-simple-auth';
import AuthRequired from './AuthRequired';

interface SimpleAuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Simple auth wrapper that shows loading/auth required/children based on auth state
 */
export default function SimpleAuthWrapper({ children }: SimpleAuthWrapperProps) {
  const { isAuthenticated, isLoading } = useSimpleAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthRequired />;
  }

  return <>{children}</>;
}