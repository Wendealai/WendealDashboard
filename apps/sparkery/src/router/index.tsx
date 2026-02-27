import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const SparkeryPage = lazy(() => import('@/pages/Sparkery'));
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
const BondCleanQuoteFormEN = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteFormEN')
);
const BondCleanQuoteFormCN = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteFormCN')
);
const CleaningInspectionPage = lazy(() => import('@/pages/CleaningInspection'));

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

const AppRouter = () => {
  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route path='/' element={<Navigate to='/sparkery' replace />} />
        <Route path='/sparkery' element={<SparkeryPage />} />
        <Route path='/sparkery/dispatch' element={<DispatchDashboard />} />
        <Route
          path='/sparkery/recurring'
          element={<DispatchRecurringTemplatesPage />}
        />
        <Route path='/sparkery/finance' element={<DispatchFinanceDashboard />} />

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