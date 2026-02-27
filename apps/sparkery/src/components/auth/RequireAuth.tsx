import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppSelector } from '@/hooks/redux';
import { selectAuth } from '@/store/slices/authSlice';

interface RequireAuthProps {
  children?: React.ReactNode;
}

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

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const auth = useAppSelector(selectAuth);
  const location = useLocation();

  if (auth.isInitializing) {
    return loading;
  }

  if (!auth.isAuthenticated) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    const target = `/login?redirect=${encodeURIComponent(redirect)}`;
    return <Navigate to={target} replace />;
  }

  return <>{children || <Outlet />}</>;
};

export default RequireAuth;
