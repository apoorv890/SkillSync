import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { DashboardContextType } from '../types';
import { apiClient } from '../lib/api';

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider = ({ children }: DashboardProviderProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    // Bumping refreshTrigger alone re-runs useApi's effect, but apiClient.get still
    // serves from its own response cache unless that cache is cleared too — without
    // this, pages kept showing stale data (e.g. a deleted job) until a manual reload.
    apiClient.clearCache();
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <DashboardContext.Provider
      value={{ refreshTrigger, triggerRefresh, triggerDashboardRefresh: triggerRefresh }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardRefresh = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardRefresh must be used within DashboardProvider');
  }
  return context;
};
