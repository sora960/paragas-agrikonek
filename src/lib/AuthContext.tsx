
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useCustomAuth } from '@/hooks/useAuth';

// Re-export the context and provider
export const AuthContext = createContext<ReturnType<typeof useCustomAuth> | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useCustomAuth();
  
  return <AuthContext.Provider value={auth}>{!auth.loading && children}</AuthContext.Provider>;
}

// Re-export the hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
