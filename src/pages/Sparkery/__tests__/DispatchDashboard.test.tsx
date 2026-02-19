import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DispatchDashboard from '../DispatchDashboard';
import sparkeryDispatchReducer from '../../../store/slices/sparkeryDispatchSlice';

const createTestStore = () =>
  configureStore({
    reducer: {
      sparkeryDispatch: sparkeryDispatchReducer,
    },
  });

describe('DispatchDashboard', () => {
  it('renders dispatch dashboard title', () => {
    render(
      <Provider store={createTestStore()}>
        <DispatchDashboard />
      </Provider>
    );

    expect(screen.getByText('Sparkery Dispatch Dashboard')).toBeTruthy();
  });

  it('shows create job button', () => {
    render(
      <Provider store={createTestStore()}>
        <DispatchDashboard />
      </Provider>
    );

    expect(screen.getByRole('button', { name: 'Create Job' })).toBeTruthy();
  });
});
