import { configureStore } from '@reduxjs/toolkit';
import authReducer, { selectUser } from './slices/authSlice';
import sparkeryDispatchReducer from './slices/sparkeryDispatchSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sparkeryDispatch: sparkeryDispatchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { __REDUX_STORE__?: typeof store }).__REDUX_STORE__ = store;
}

export { selectUser };