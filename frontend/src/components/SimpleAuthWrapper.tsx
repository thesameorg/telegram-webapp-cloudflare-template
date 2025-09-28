import React from 'react';
import { useSimpleAuth } from '../hooks/use-simple-auth';
import AuthRequired from './AuthRequired';
import LoadingSpinner from './LoadingSpinner';

interface SimpleAuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Simple auth wrapper that shows loading/auth required/children based on auth state
 */
export default function SimpleAuthWrapper({ children }: SimpleAuthWrapperProps) {
  const { isAuthenticated, isLoading } = useSimpleAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <AuthRequired />;
  }

  return <>{children}</>;
}