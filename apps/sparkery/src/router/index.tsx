import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import RequireAuth from '@/components/auth/RequireAuth';
import SparkerySaasLayout from '@/layouts/SparkerySaasLayout';
import SparkeryQuoteDraftProvider from '@/pages/Sparkery/SparkeryQuoteDraftProvider';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  initializeAuthSession,
  selectAuth,
} from '@/store/slices/authSlice';

const BrisbaneQuoteCalculator = lazy(
  () => import('@/pages/Sparkery/BrisbaneQuoteCalculator')
);
const CleaningInspectionAdmin = lazy(
  () => import('@/pages/Sparkery/CleaningInspectionAdmin')
);
const ChinaProcurementReport = lazy(
  () => import('@/pages/Sparkery/ChinaProcurementReport')
);
const DispatchDashboard = lazy(() => import('@/pages/Sparkery/DispatchDashboard'));
const DispatchRecurringTemplatesPage = lazy(
  () => import('@/pages/Sparkery/DispatchRecurringTemplatesPage')
);
const DispatchFinanceDashboard = lazy(
  () => import('@/pages/Sparkery/DispatchFinanceDashboard')
);
const DispatchLocationReport = lazy(
  () => import('@/pages/Sparkery/DispatchLocationReport')
);
const DispatchWeekPlan = lazy(() => import('@/pages/Sparkery/DispatchWeekPlan'));
const DispatchEmployeeTasksPage = lazy(
  () => import('@/pages/Sparkery/DispatchEmployeeTasksPage')
);
const UserManagementPage = lazy(
  () => import('@/pages/Sparkery/UserManagementPage')
);
const BondCleanQuoteFormEN = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteFormEN')
);
const BondCleanQuoteFormCN = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteFormCN')
);
const BondCleanQuoteSubmissions = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteSubmissions')
);
const ContentCreatorPage = lazy(
  () => import('@/pages/Sparkery/ContentCreatorPage')
);
const CleaningInspectionPage = lazy(() => import('@/pages/CleaningInspection'));
const LoginPage = lazy(() => import('@/pages/Auth/LoginPage'));

const loading = (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Spin size='large' />
  </div>
);

const NotFound = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      fontSize: 18,
      color: '#5f6b7a',
    }}
  >
    Page not found
  </div>
);

const resolveSparkeryLandingPath = (role: string | undefined): string => {
  switch ((role || '').toLowerCase()) {
    case 'admin':
    case 'manager':
      return '/sparkery/dispatch';
    case 'employee':
      return '/sparkery/cleaning-inspection';
    case 'guest':
      return '/sparkery/quote-form-en';
    case 'user':
    default:
      return '/sparkery/quote-calculator';
  }
};

const RootRedirect = () => {
  const auth = useAppSelector(selectAuth);
  if (auth.isInitializing) {
    return loading;
  }
  return (
    <Navigate
      to={
        auth.isAuthenticated
          ? resolveSparkeryLandingPath(auth.user?.role)
          : '/login'
      }
      replace
    />
  );
};

const SparkeryLandingRedirect = () => {
  const auth = useAppSelector(selectAuth);
  if (auth.isInitializing) {
    return loading;
  }
  return (
    <Navigate
      to={resolveSparkeryLandingPath(auth.user?.role)}
      replace
    />
  );
};

const AppRouter = () => {
  const dispatch = useAppDispatch();
  const bootstrapDoneRef = useRef(false);

  useEffect(() => {
    if (bootstrapDoneRef.current) {
      return;
    }
    bootstrapDoneRef.current = true;
    void dispatch(initializeAuthSession());
  }, [dispatch]);

  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route path='/' element={<RootRedirect />} />
        <Route path='/login' element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<SparkeryQuoteDraftProvider />}>
            <Route element={<SparkerySaasLayout />}>
              <Route
                path='/sparkery'
                element={<SparkeryLandingRedirect />}
              />
              <Route
                path='/sparkery/quote-calculator'
                element={<BrisbaneQuoteCalculator />}
              />
              <Route
                path='/sparkery/cleaning-inspection'
                element={<CleaningInspectionAdmin />}
              />
              <Route
                path='/sparkery/china-procurement'
                element={<ChinaProcurementReport />}
              />
              <Route
                path='/sparkery/quote-form-en'
                element={<BondCleanQuoteFormEN />}
              />
              <Route
                path='/sparkery/quote-form-cn'
                element={<BondCleanQuoteFormCN />}
              />
              <Route
                path='/sparkery/quote-submissions'
                element={<BondCleanQuoteSubmissions />}
              />
              <Route path='/sparkery/dispatch' element={<DispatchDashboard />} />
              <Route
                path='/sparkery/recurring'
                element={<DispatchRecurringTemplatesPage />}
              />
              <Route
                path='/sparkery/finance'
                element={<DispatchFinanceDashboard />}
              />
              <Route
                path='/sparkery/users'
                element={<UserManagementPage />}
              />
              <Route
                path='/sparkery/content-creator'
                element={<ContentCreatorPage />}
              />
            </Route>
          </Route>
        </Route>

        <Route path='/bond-clean-quote' element={<BondCleanQuoteFormEN />} />
        <Route path='/bond-clean-quote-cn' element={<BondCleanQuoteFormCN />} />
        <Route path='/cleaning-inspection' element={<CleaningInspectionPage />} />
        <Route
          path='/dispatch-location-report'
          element={<DispatchLocationReport />}
        />
        <Route path='/dispatch-week-plan' element={<DispatchWeekPlan />} />
        <Route
          path='/dispatch-employee-tasks'
          element={<DispatchEmployeeTasksPage />}
        />

        <Route path='*' element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
