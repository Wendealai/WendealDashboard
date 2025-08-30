import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Input from '../Input';

// Custom render function with providers
const customRender = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>{ui}</ConfigProvider>
    </BrowserRouter>
  );
};

describe('Input Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic input correctly', () => {
    customRender(<Input placeholder='Enter text' />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    customRender(<Input label='Username' placeholder='Enter username' />);

    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('shows required asterisk when required prop is true', () => {
    customRender(<Input label='Email' required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const mockOnChange = jest.fn();
    customRender(<Input onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(mockOnChange).toHaveBeenCalledWith('test value', expect.any(Object));
  });

  it('displays error message when error prop is provided', () => {
    customRender(<Input error='This field is required' />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('ant-input-status-error');
  });

  it('displays success message when success prop is provided', () => {
    customRender(<Input success='Valid input' />);

    expect(screen.getByText('Valid input')).toBeInTheDocument();
  });

  it('validates input using custom validator', () => {
    const validator = (value: string) => {
      return value.length < 3 ? 'Minimum 3 characters required' : null;
    };

    customRender(<Input validator={validator} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ab' } });

    expect(
      screen.getByText('Minimum 3 characters required')
    ).toBeInTheDocument();
  });

  it('clears validation error when input becomes valid', () => {
    const validator = (value: string) => {
      return value.length < 3 ? 'Minimum 3 characters required' : null;
    };

    customRender(<Input validator={validator} />);

    const input = screen.getByRole('textbox');

    // First enter invalid input
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(
      screen.getByText('Minimum 3 characters required')
    ).toBeInTheDocument();

    // Then enter valid input
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(
      screen.queryByText('Minimum 3 characters required')
    ).not.toBeInTheDocument();
  });

  it('formats input value using formatter', () => {
    const formatter = (value: string) => value.toUpperCase();

    customRender(<Input formatter={formatter} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });

    expect(input.value).toBe('HELLO');
  });

  it('parses formatted value using parser', () => {
    const mockOnChange = jest.fn();
    const formatter = (value: string) => value.toUpperCase();
    const parser = (value: string) => value.toLowerCase();

    customRender(
      <Input formatter={formatter} parser={parser} onChange={mockOnChange} />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'HELLO' } });

    expect(mockOnChange).toHaveBeenCalledWith('hello', expect.any(Object));
  });

  it('debounces onChange calls when debounceDelay is set', async () => {
    const mockOnChange = jest.fn();

    customRender(<Input onChange={mockOnChange} debounceDelay={300} />);

    const input = screen.getByRole('textbox');

    // Type multiple characters quickly
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    // Should not call onChange immediately
    expect(mockOnChange).not.toHaveBeenCalled();

    // Wait for debounce delay
    await waitFor(
      () => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
      },
      { timeout: 400 }
    );

    expect(mockOnChange).toHaveBeenCalledWith('abc', expect.any(Object));
  });

  it('calls onChange immediately when debounceDelay is 0', () => {
    const mockOnChange = jest.fn();

    customRender(<Input onChange={mockOnChange} debounceDelay={0} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockOnChange).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('updates internal value when value prop changes', () => {
    const { rerender } = customRender(<Input value='initial' />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('initial');

    rerender(
      <BrowserRouter>
        <ConfigProvider>
          <Input value='updated' />
        </ConfigProvider>
      </BrowserRouter>
    );

    expect(input.value).toBe('updated');
  });

  it('prioritizes error prop over validation error', () => {
    const validator = () => 'Validation error';

    customRender(<Input validator={validator} error='Prop error' />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByText('Prop error')).toBeInTheDocument();
    expect(screen.queryByText('Validation error')).not.toBeInTheDocument();
  });

  it('applies custom props to underlying input', () => {
    customRender(
      <Input placeholder='Custom placeholder' disabled maxLength={10} />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Custom placeholder');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('maxLength', '10');
  });
});
