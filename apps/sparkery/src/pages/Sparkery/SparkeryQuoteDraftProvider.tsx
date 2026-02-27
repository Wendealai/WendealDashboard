import React, { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { QuoteDraftContext, type QuoteDraftData } from './quoteDraftContext';

interface SparkeryQuoteDraftProviderProps {
  children?: React.ReactNode;
}

const TAB_TO_PATH: Record<string, string> = {
  'quote-calculator': '/sparkery/quote-calculator',
  'cleaning-inspection': '/sparkery/cleaning-inspection',
  'china-procurement': '/sparkery/china-procurement',
  'quote-form-en': '/sparkery/quote-form-en',
  'quote-form-cn': '/sparkery/quote-form-cn',
  'quote-submissions': '/sparkery/quote-submissions',
  'dispatch-dashboard': '/sparkery/dispatch',
  'dispatch-recurring-templates': '/sparkery/recurring',
  'dispatch-finance': '/sparkery/finance',
};

const resolveTabByPath = (pathname: string): string => {
  const matchedEntry = Object.entries(TAB_TO_PATH)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, path]) => pathname.startsWith(path));
  return matchedEntry?.[0] || 'quote-calculator';
};

const SparkeryQuoteDraftProvider: React.FC<SparkeryQuoteDraftProviderProps> = ({
  children,
}) => {
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(
    () => resolveTabByPath(location.pathname),
    [location.pathname]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      const targetPath = TAB_TO_PATH[tab];
      if (!targetPath) {
        return;
      }
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    },
    [location.pathname, navigate]
  );

  return (
    <QuoteDraftContext.Provider
      value={{ draftData, setDraftData, activeTab, setActiveTab }}
    >
      {children || <Outlet />}
    </QuoteDraftContext.Provider>
  );
};

export default SparkeryQuoteDraftProvider;
