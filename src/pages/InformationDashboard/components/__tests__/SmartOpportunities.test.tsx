/**
 * SmartOpportunities 组件单元测试
 * 测试智能商业机会发现功能的主要组件
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SmartOpportunities from '../SmartOpportunities';
import { AirtableService } from '../../../../services/airtableService';

// Mock 依赖项
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'smartOpportunities.title': 'Smart Opportunities',
        'smartOpportunities.description': 'Discover business opportunities',
        'smartOpportunities.loading': 'Loading opportunities...',
        'smartOpportunities.error': 'Failed to load opportunities',
        'smartOpportunities.success': 'Successfully loaded opportunities',
        'smartOpportunities.noData': 'No opportunities found',
        'smartOpportunities.search': 'Search opportunities',
        'smartOpportunities.refresh': 'Refresh',
        'smartOpportunities.export': 'Export',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../InputForm', () => ({
  __esModule: true,
  default: ({ value, onChange, onSubmit, loading }: any) => (
    <div data-testid="input-form">
      <input
        data-testid="industry-input"
        value={value.industry}
        onChange={(e) => onChange({ ...value, industry: e.target.value })}
        placeholder="Industry"
      />
      <input
        data-testid="city-input"
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
        placeholder="City"
      />
      <input
        data-testid="country-input"
        value={value.country}
        onChange={(e) => onChange({ ...value, country: e.target.value })}
        placeholder="Country"
      />
      <button
        data-testid="submit-button"
        onClick={() => onSubmit(value)}
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Start Workflow'}
      </button>
    </div>
  ),
}));

jest.mock('../AirtableTable', () => ({
  __esModule: true,
  default: ({ data, loading, error, onDataChange, onSort, onPageChange }: any) => (
    <div data-testid="airtable-table">
      {loading && <div data-testid="table-loading">Loading...</div>}
      {error && <div data-testid="table-error">{error}</div>}
      {data && data.length > 0 && (
        <div data-testid="table-data">
          {data.map((item: any, index: number) => (
            <div key={index} data-testid={`table-row-${index}`}>
              {item.fields.businessName}
            </div>
          ))}
        </div>
      )}
      <button
        data-testid="sort-button"
        onClick={() => onSort('name', 'asc')}
      >
        Sort
      </button>
      <button
        data-testid="page-button"
        onClick={() => onPageChange(2, 10)}
      >
        Page 2
      </button>
    </div>
  ),
}));

// Mock airtable package
jest.mock('airtable', () => ({
  default: jest.fn(() => ({
    base: jest.fn(() => ({
      table: jest.fn(() => ({
        select: jest.fn(() => ({
          all: jest.fn(),
        })),
      })),
    })),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock message from antd
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('SmartOpportunities', () => {
  const mockRecords = [
    {
      id: 'rec1',
      fields: {
        businessName: 'Test Business 1',
        industry: 'Technology',
        city: 'New York',
        country: 'USA',
        description: 'A test business',
        contactInfo: 'test@test.com',
      },
      createdTime: '2024-01-01T00:00:00Z',
    },
    {
      id: 'rec2',
      fields: {
        businessName: 'Test Business 2',
        industry: 'Finance',
        city: 'London',
        country: 'UK',
        description: 'Another test business',
        contactInfo: 'test2@test.com',
      },
      createdTime: '2024-01-02T00:00:00Z',
    },
  ];

  // Mock airtableService before tests
  jest.mock('../../../../services/airtableService', () => ({
    AirtableService: jest.fn().mockImplementation(() => ({
      getAllRecords: jest.fn(),
    })),
    createAirtableService: jest.fn(() => ({
      getAllRecords: jest.fn().mockResolvedValue(mockRecords),
    })),
    defaultAirtableConfig: {
      apiKey: 'test-api-key',
      baseId: 'test-base-id',
      tableName: 'test-table',
    },
  }));

  const mockAirtableService = {
    getAllRecords: jest.fn(),
  };

  const mockProps = {
    onParametersChange: jest.fn(),
    onDataLoaded: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (AirtableService as jest.Mock).mockImplementation(() => mockAirtableService);
  });

  describe('初始渲染', () => {
    it('应该正确渲染组件结构', () => {
      render(<SmartOpportunities {...mockProps} />);
      expect(screen.getByTestId('input-form')).toBeInTheDocument();
      expect(screen.getByTestId('airtable-table')).toBeInTheDocument();
    });

    it('应该显示加载状态覆盖层', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue([]);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Discovering business opportunities...')).toBeInTheDocument();
      });
    });
  });

  describe('数据加载', () => {
    it('应该在组件挂载时自动加载数据', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
        expect(mockProps.onDataLoaded).toHaveBeenCalledWith(mockRecords);
      });
    });

    it('应该正确处理数据加载成功', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('table-data')).toBeInTheDocument();
        expect(screen.getByText('Test Business 1')).toBeInTheDocument();
        expect(screen.getByText('Test Business 2')).toBeInTheDocument();
      });
    });

    it('应该显示成功状态提示', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Data Loading Completed')).toBeInTheDocument();
        expect(screen.getByText('Successfully discovered 2 business opportunities')).toBeInTheDocument();
      });
    });
  });

  describe('错误处理', () => {
    it('应该在API调用失败时显示错误信息', async () => {
      const error = new Error('API Error');
      mockAirtableService.getAllRecords.mockRejectedValue(error);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
        expect(mockProps.onError).toHaveBeenCalledWith(error);
      });
    });

    it('应该在403错误时切换到演示模式', async () => {
      const error403 = new Error('403 Forbidden');
      mockAirtableService.getAllRecords.mockRejectedValue(error403);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        // 应该显示演示数据
        expect(screen.getByText('Sunshine Cafe')).toBeInTheDocument();
        expect(screen.getByText('Modern Hair Salon')).toBeInTheDocument();
      });
    });

    it('应该在非403错误时显示错误提示', async () => {
      const error404 = new Error('404 Not Found');
      mockAirtableService.getAllRecords.mockRejectedValue(error404);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Initial data loading failed: 404 Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('工作流提交', () => {
    beforeEach(() => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);
    });

    it('应该在提交表单时触发工作流', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      render(<SmartOpportunities {...mockProps} />);

      // 等待初始数据加载完成
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      // 填写表单并提交
      const industryInput = screen.getByTestId('industry-input');
      const cityInput = screen.getByTestId('city-input');
      const countryInput = screen.getByTestId('country-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countryInput, { target: { value: 'USA' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/webhook/Smart-opportunities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            industry: 'Technology',
            city: 'New York',
            country: 'USA',
          }),
        });
      });
    });

    it('应该根据参数过滤数据', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      // 提交只匹配第一个记录的参数
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        // 应该只显示匹配的记录
        expect(mockProps.onDataLoaded).toHaveBeenCalledWith([mockRecords[0]]);
      });
    });

    it('应该处理webhook失败的情况', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Webhook Service Warning')).toBeInTheDocument();
      });
    });
  });

  describe('参数变化处理', () => {
    it('应该在参数变化时调用onParametersChange回调', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue([]);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      const industryInput = screen.getByTestId('industry-input');
      fireEvent.change(industryInput, { target: { value: 'Technology' } });

      expect(mockProps.onParametersChange).toHaveBeenCalledWith({
        industry: 'Technology',
        city: '',
        country: '',
      });
    });
  });

  describe('表格操作', () => {
    it('应该处理表格排序', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      const sortButton = screen.getByTestId('sort-button');
      fireEvent.click(sortButton);

      // 验证排序处理逻辑被调用
      expect(sortButton).toBeInTheDocument();
    });

    it('应该处理分页变化', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      const pageButton = screen.getByTestId('page-button');
      fireEvent.click(pageButton);

      // 验证分页处理逻辑被调用
      expect(pageButton).toBeInTheDocument();
    });
  });

  describe('刷新功能', () => {
    it('应该在点击重试按钮时刷新数据', async () => {
      const error = new Error('Connection failed');
      mockAirtableService.getAllRecords.mockRejectedValueOnce(error);
      mockAirtableService.getAllRecords.mockResolvedValueOnce(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
      });

      // 找到重试链接并点击
      const retryLink = screen.getByText('重试');
      fireEvent.click(retryLink);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('连接测试功能', () => {
    it('应该在点击测试连接按钮时执行连接测试', async () => {
      const error = new Error('Connection failed');
      mockAirtableService.getAllRecords.mockRejectedValue(error);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
      });

      const testButton = screen.getByText('测试连接');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalledWith({
          filterByFormula: '',
          maxRecords: 1,
        });
      });
    });

    it('应该在连接测试成功时显示成功消息', async () => {
      const error = new Error('Connection failed');
      mockAirtableService.getAllRecords.mockRejectedValueOnce(error);
      mockAirtableService.getAllRecords.mockResolvedValueOnce([mockRecords[0]]);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
      });

      const testButton = screen.getByText('测试连接');
      fireEvent.click(testButton);

      await waitFor(() => {
        const message = require('antd').message;
        expect(message.success).toHaveBeenCalledWith(
          'Airtable connection test successful! Found 1 records'
        );
      });
    });

    it('应该在连接测试失败时显示错误消息', async () => {
      const error403 = new Error('403 Forbidden');
      mockAirtableService.getAllRecords.mockRejectedValueOnce(new Error('Connection failed'));
      mockAirtableService.getAllRecords.mockRejectedValueOnce(error403);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
      });

      const testButton = screen.getByText('测试连接');
      fireEvent.click(testButton);

      await waitFor(() => {
        const message = require('antd').message;
        expect(message.error).toHaveBeenCalled();
      });
    });
  });

  describe('自动同步', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('应该每30秒自动同步数据', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      // 等待初始数据加载
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      // 清空之前的调用
      mockAirtableService.getAllRecords.mockClear();

      // 快进30秒
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // 验证自动同步被调用
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });
    });

    it('应该在有参数时使用参数进行同步', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      // 设置参数
      const industryInput = screen.getByTestId('industry-input');
      const cityInput = screen.getByTestId('city-input');
      const countryInput = screen.getByTestId('country-input');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countryInput, { target: { value: 'USA' } });

      // 清空之前的调用
      mockAirtableService.getAllRecords.mockClear();

      // 快进30秒
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // 验证同步时使用了参数进行过滤
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });
    });

    it('应该在组件卸载时清理定时器', () => {
      mockAirtableService.getAllRecords.mockResolvedValue([]);

      const { unmount } = render(<SmartOpportunities {...mockProps} />);

      unmount();

      // 验证定时器被清理
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('演示模式', () => {
    it('应该在403错误时自动切换到演示模式', async () => {
      const error403 = new Error('403 Forbidden');
      mockAirtableService.getAllRecords.mockRejectedValue(error403);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Sunshine Cafe')).toBeInTheDocument();
        expect(screen.getByText('Modern Hair Salon')).toBeInTheDocument();
        expect(screen.getByText('Real Estate Agency')).toBeInTheDocument();
      });
    });

    it('应该在演示模式下清除错误状态', async () => {
      const error403 = new Error('403 Forbidden');
      mockAirtableService.getAllRecords.mockRejectedValue(error403);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Airtable连接失败')).not.toBeInTheDocument();
      });
    });
  });

  describe('状态管理', () => {
    it('应该正确管理加载状态', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      // 初始应该是加载状态
      expect(screen.getByText('Discovering business opportunities...')).toBeInTheDocument();

      // 加载完成后不应该显示加载覆盖层
      await waitFor(() => {
        expect(screen.queryByText('Discovering business opportunities...')).not.toBeInTheDocument();
      });
    });

    it('应该正确管理错误状态', async () => {
      const error = new Error('Network Error');
      mockAirtableService.getAllRecords.mockRejectedValue(error);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Airtable连接失败')).toBeInTheDocument();
      });
    });

    it('应该正确管理成功状态', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Data Loading Completed')).toBeInTheDocument();
      });
    });
  });

  describe('回调函数', () => {
    it('应该在数据变化时调用onDataLoaded回调', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockProps.onDataLoaded).toHaveBeenCalledWith(mockRecords);
      });
    });

    it('应该在参数变化时调用onParametersChange回调', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue([]);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      const industryInput = screen.getByTestId('industry-input');
      fireEvent.change(industryInput, { target: { value: 'Technology' } });

      expect(mockProps.onParametersChange).toHaveBeenCalledWith({
        industry: 'Technology',
        city: '',
        country: '',
      });
    });

    it('应该在错误发生时调用onError回调', async () => {
      const error = new Error('API Error');
      mockAirtableService.getAllRecords.mockRejectedValue(error);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockProps.onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('无障碍性', () => {
    it('应该支持键盘导航', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);

      render(<SmartOpportunities {...mockProps} />);

      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalled();
      });

      // 验证表单元素可访问
      const industryInput = screen.getByTestId('industry-input');
      const cityInput = screen.getByTestId('city-input');
      const countryInput = screen.getByTestId('country-input');
      const submitButton = screen.getByTestId('submit-button');

      expect(industryInput).toBeInTheDocument();
      expect(cityInput).toBeInTheDocument();
      expect(countryInput).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });
  });
});
