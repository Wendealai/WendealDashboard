import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import HomePage from '../index';

// Simple test wrapper
const customRender = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ConfigProvider>{ui}</ConfigProvider>
    </BrowserRouter>
  );
};

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('HomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders welcome message', () => {
    customRender(<HomePage />);

    expect(screen.getByText('欢迎使用 Wendeal Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/这是您的数据管理和分析中心/)).toBeInTheDocument();
  });

  it('renders quick action cards', () => {
    customRender(<HomePage />);

    expect(screen.getByText('仪表板')).toBeInTheDocument();
    expect(screen.getByText('数据分析')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  it('renders quick actions section title', () => {
    customRender(<HomePage />);

    expect(screen.getByText('快捷操作')).toBeInTheDocument();
  });

  it('renders getting started section', () => {
    customRender(<HomePage />);

    expect(screen.getByText('开始使用')).toBeInTheDocument();
    expect(screen.getByText(/如果您是第一次使用本系统/)).toBeInTheDocument();
  });

  it('navigates to dashboard when dashboard card is clicked', async () => {
    customRender(<HomePage />);

    const dashboardCard = screen.getByText('仪表板').closest('.ant-card');
    expect(dashboardCard).toBeInTheDocument();

    if (dashboardCard) {
      fireEvent.click(dashboardCard);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    }
  });

  it('navigates to dashboard when "前往仪表板" button is clicked', async () => {
    customRender(<HomePage />);

    const dashboardButton = screen.getByText('前往仪表板');
    fireEvent.click(dashboardButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to help when "查看帮助文档" button is clicked', async () => {
    customRender(<HomePage />);

    const helpButton = screen.getByText('查看帮助文档');
    fireEvent.click(helpButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/help');
    });
  });

  it('renders with correct accessibility attributes', () => {
    customRender(<HomePage />);

    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders all quick action descriptions', () => {
    customRender(<HomePage />);

    expect(screen.getByText('查看数据概览和关键指标')).toBeInTheDocument();
    expect(screen.getByText('深入分析业务数据')).toBeInTheDocument();
    expect(screen.getByText('管理用户账户和权限')).toBeInTheDocument();
    expect(screen.getByText('配置系统参数和选项')).toBeInTheDocument();
  });
});
