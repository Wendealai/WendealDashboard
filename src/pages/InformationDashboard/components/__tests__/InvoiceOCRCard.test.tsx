import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import InvoiceOCRCard from '../InvoiceOCRCard';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.settings': '设置',
        'invoiceOCR.subtitle': '智能发票识别与数据提取',
        'invoiceOCR.results.processed': '已处理',
        'invoiceOCR.results.accuracy': '准确率',
        'invoiceOCR.status.lastUpdated': '最后更新',
      };
      return translations[key] || key;
    },
  }),
}));

/**
 * 渲染组件的辅助函数
 */
const renderInvoiceOCRCard = (props = {}) => {
  const defaultProps = {
    processedCount: 150,
    successRate: 95.5,
    lastUpdated: new Date('2024-01-15T10:30:00Z'),
  };

  return renderWithProviders(
    <BrowserRouter>
      <InvoiceOCRCard {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('InvoiceOCRCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 测试组件基本渲染
   */
  it('renders correctly with default props', () => {
    renderInvoiceOCRCard();

    expect(screen.getByText('Invoice OCR')).toBeInTheDocument();
    expect(screen.getByText('智能发票识别与数据提取')).toBeInTheDocument();
    expect(screen.getByText('150 已处理')).toBeInTheDocument();
    expect(screen.getByText('95.5% 准确率')).toBeInTheDocument();
  });

  /**
   * 测试选中状态
   */
  it('displays selected state correctly', () => {
    const { container } = renderInvoiceOCRCard({ selected: true });

    const card = container.querySelector('.ant-card');
    expect(card).toHaveStyle('border-color: #1890ff');
  });

  /**
   * 测试加载状态
   */
  it('displays loading state correctly', () => {
    renderInvoiceOCRCard({ loading: true });

    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
  });

  /**
   * 测试错误状态
   */
  it('displays error message when error prop is provided', () => {
    const errorMessage = '处理失败：网络连接错误';
    renderInvoiceOCRCard({ error: errorMessage });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  /**
   * 测试卡片点击事件
   */
  it('calls onClick when card is clicked', () => {
    const mockOnClick = jest.fn();
    const { container } = renderInvoiceOCRCard({ onClick: mockOnClick });

    const card = container.querySelector('.ant-card');
    fireEvent.click(card!);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  /**
   * 测试默认导航行为
   */
  it('navigates to information-dashboard page when clicked without onClick prop', () => {
    const { container } = renderInvoiceOCRCard();

    const card = container.querySelector('.ant-card');
    fireEvent.click(card!);

    expect(mockNavigate).toHaveBeenCalledWith('/information-dashboard');
  });

  /**
   * 测试触发按钮
   */
  it('calls onTrigger when trigger button is clicked', () => {
    const mockOnTrigger = jest.fn();
    renderInvoiceOCRCard({ onTrigger: mockOnTrigger });

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    expect(mockOnTrigger).toHaveBeenCalledTimes(1);
  });

  /**
   * 测试设置按钮
   */
  it('calls onSettings when settings button is clicked', () => {
    const mockOnSettings = jest.fn();
    renderInvoiceOCRCard({ onSettings: mockOnSettings });

    const settingsButton = screen.getByLabelText('设置');
    fireEvent.click(settingsButton);

    expect(mockOnSettings).toHaveBeenCalledTimes(1);
  });

  /**
   * 测试不同尺寸
   */
  it('renders correctly with small size', () => {
    renderInvoiceOCRCard({ size: 'small' });

    expect(screen.getByText('Invoice OCR')).toBeInTheDocument();
    // 小尺寸下字体应该更小
    const subtitle = screen.getByText('智能发票识别与数据提取');
    expect(subtitle).toHaveStyle('font-size: 11px');
  });

  /**
   * 测试隐藏操作按钮
   */
  it('hides action buttons when showActions is false', () => {
    renderInvoiceOCRCard({ showActions: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * 测试最后更新时间显示
   */
  it('displays last updated time correctly', () => {
    const lastUpdated = new Date('2024-01-15T10:30:00Z');
    renderInvoiceOCRCard({ lastUpdated });

    expect(screen.getByText(/最后更新/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  /**
   * 测试进度状态
   */
  it('displays progress status when provided', () => {
    renderInvoiceOCRCard({ progressStatus: '正在处理中...' });

    expect(screen.getByText('正在处理中...')).toBeInTheDocument();
  });

  /**
   * 测试自定义样式类名
   */
  it('applies custom className', () => {
    const { container } = renderInvoiceOCRCard({ className: 'custom-card' });

    expect(container.querySelector('.custom-card')).toBeInTheDocument();
  });

  /**
   * 测试事件冒泡阻止
   */
  it('prevents event bubbling when trigger button is clicked', () => {
    const mockOnClick = jest.fn();
    const mockOnTrigger = jest.fn();

    renderInvoiceOCRCard({
      onClick: mockOnClick,
      onTrigger: mockOnTrigger,
    });

    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);

    expect(mockOnTrigger).toHaveBeenCalledTimes(1);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  /**
   * 测试无障碍性
   */
  it('has proper accessibility attributes', () => {
    renderInvoiceOCRCard();

    const card = screen.getByRole('button', { name: /Invoice OCR/ });
    expect(card).toBeInTheDocument();

    const settingsButton = screen.getByLabelText('设置');
    expect(settingsButton).toBeInTheDocument();
  });
});
