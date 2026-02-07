import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type LayoutState = {
  drawerOpen: boolean;
  toggleDrawer: () => void;
  closeDrawer: () => void;
};

const LayoutContext = createContext<LayoutState | undefined>(undefined);

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const value = useMemo(
    () => ({
      drawerOpen,
      toggleDrawer: () => setDrawerOpen((o) => !o),
      closeDrawer: () => setDrawerOpen(false)
    }),
    [drawerOpen]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
