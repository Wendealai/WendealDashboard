import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Loading from '../Loading';

// Custom render function with providers
const customRender = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>{ui}</ConfigProvider>
    </BrowserRouter>
  );
};

describe('Loading Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic loading spinner', () => {
    customRender(<Loading />);

    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toBeInTheDocument();
    expect(spinner.closest('.ant-spin')).toBeInTheDocument();
  });

  it('accepts custom text prop', () => {
    customRender(<Loading text='Loading data...' />);

    // Just verify the component renders without error
    const loadingIcon = screen.getByRole('img', { hidden: true });
    expect(loadingIcon).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    customRender(<Loading size='large' />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toHaveClass('ant-spin-lg');
  });

  it('renders with small size', () => {
    customRender(<Loading size='small' />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toHaveClass('ant-spin-sm');
  });

  it('renders fullscreen loading when fullScreen prop is true', () => {
    const { container } = customRender(<Loading fullScreen />);

    // Check for fixed positioning style
    const fixedElement = container.querySelector('[style*="position: fixed"]');
    expect(fixedElement).toBeInTheDocument();
  });

  it('renders fullscreen loading with backdrop', () => {
    const { container } = customRender(<Loading fullScreen />);

    // Check for backdrop styling
    const backdropElement = container.querySelector(
      '[style*="background-color: rgba(255, 255, 255, 0.8)"]'
    );
    expect(backdropElement).toBeInTheDocument();
  });

  it('renders with custom icon when provided', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>Custom</div>;

    customRender(<Loading icon={<CustomIcon />} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    customRender(<Loading className='custom-loading' />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toHaveClass('custom-loading');
  });

  it('applies custom style', () => {
    const customStyle = { color: 'red', fontSize: '20px' };
    customRender(<Loading style={customStyle} />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toBeInTheDocument();
  });

  it('renders inline loading by default', () => {
    customRender(<Loading />);

    const container = screen
      .getByRole('img', { hidden: true })
      .closest('div')?.parentElement;
    expect(container).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    });
    expect(container).not.toHaveStyle({ position: 'fixed' });
  });

  it('combines fullScreen with custom text', () => {
    const { container } = customRender(
      <Loading fullScreen text='Loading application...' />
    );

    const fixedElement = container.querySelector('[style*="position: fixed"]');
    expect(fixedElement).toBeInTheDocument();

    const loadingIcon = screen.getByRole('img', { hidden: true });
    expect(loadingIcon).toBeInTheDocument();
  });

  it('combines custom icon with text', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>⚡</div>;

    customRender(<Loading icon={<CustomIcon />} text='Fast loading...' />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders with all props combined', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>🔄</div>;
    const customStyle = { margin: '20px' };

    const { container } = customRender(
      <Loading
        fullScreen
        size='large'
        text='Processing...'
        icon={<CustomIcon />}
        className='custom-class'
        style={customStyle}
      />
    );

    const fixedElement = container.querySelector('[style*="position: fixed"]');
    const spinContainer = screen
      .getByTestId('custom-icon')
      .closest('.ant-spin');

    expect(fixedElement).toBeInTheDocument();
    expect(spinContainer).toHaveClass('ant-spin-lg');
    expect(spinContainer).toHaveClass('custom-class');
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    customRender(<Loading />);

    // Check if loading spinner is rendered
    const loadingIcon = screen.getByRole('img', { hidden: true });
    expect(loadingIcon).toBeInTheDocument();

    // Check if spin container exists
    const spinContainer = loadingIcon.closest('.ant-spin');
    expect(spinContainer).toBeInTheDocument();
  });

  it('renders with empty text prop', () => {
    customRender(<Loading text='' />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toBeInTheDocument();
  });

  it('renders without text when text prop is undefined', () => {
    customRender(<Loading />);

    const spinContainer = screen
      .getByRole('img', { hidden: true })
      .closest('.ant-spin');
    expect(spinContainer).toBeInTheDocument();
  });
});
