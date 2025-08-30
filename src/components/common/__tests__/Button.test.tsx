import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Button from '../Button';

// Simple test wrapper
const customRender = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>{ui}</ConfigProvider>
    </BrowserRouter>
  );
};

describe('Button Component', () => {
  it('renders button with text', () => {
    customRender(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: /click me/i })
    ).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    customRender(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    customRender(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveClass('ant-btn-loading');
  });

  it('shows confirmation dialog when confirm prop is true', () => {
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const mockClick = jest.fn();

    customRender(
      <Button confirm confirmMessage='确定删除吗？' onClick={mockClick}>
        Delete
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockConfirm).toHaveBeenCalledWith('确定删除吗？');
    expect(mockClick).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('prevents action when confirmation is cancelled', () => {
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const mockClick = jest.fn();

    customRender(
      <Button confirm onClick={mockClick}>
        Delete
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('applies custom loading text', () => {
    customRender(
      <Button loading loadingText='Processing...'>
        Submit
      </Button>
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    customRender(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies different button types', () => {
    const { rerender } = customRender(<Button type='primary'>Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('ant-btn-primary');

    rerender(<Button danger>Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('ant-btn-dangerous');
  });

  it('applies different sizes', () => {
    const { rerender } = customRender(<Button size='large'>Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('ant-btn-lg');

    rerender(<Button size='small'>Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('ant-btn-sm');
  });
});
