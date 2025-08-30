import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

// 创建一个最简单的 reducer
const simpleReducer = (state = { value: 'test' }, action: any) => {
  return state;
};

// 创建一个简单的测试组件
const SimpleComponent = () => {
  const value = useSelector((state: any) => state.simple.value);
  return <div data-testid='simple-value'>{value}</div>;
};

// 创建一个简单的测试包装器
const SimpleWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const store = configureStore({
    reducer: {
      simple: simpleReducer,
    },
  });

  return <Provider store={store}>{children}</Provider>;
};

describe('Simple Redux Test', () => {
  it('should render simple component with redux', () => {
    render(
      <SimpleWrapper>
        <SimpleComponent />
      </SimpleWrapper>
    );

    expect(screen.getByTestId('simple-value')).toHaveTextContent('test');
  });
});
