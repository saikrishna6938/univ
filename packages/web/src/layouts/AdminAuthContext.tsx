import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminUser } from '../lib/api';

type AdminAuthState = {
  adminUser: AdminUser | null;
  setAdminUser: (user: AdminUser | null) => void;
  logout: () => void;
};

const STORAGE_KEY = 'admin_auth_user';
const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  });

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [adminUser]);

  const value = useMemo(
    () => ({
      adminUser,
      setAdminUser,
      logout: () => setAdminUser(null)
    }),
    [adminUser]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
