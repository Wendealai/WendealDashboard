/**
 * Smart Opportunities 集成测试
 * 测试完整的Smart Opportunities工作流
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SmartOpportunities from '../../pages/InformationDashboard/components/SmartOpportunities';
import { AirtableService } from '../../services/airtableService';
import type { AirtableRecord } from '../../types/smartOpportunities';

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
        'inputForm.title': 'Workflow Parameters',
        'inputForm.industry': 'Industry',
        'inputForm.city': 'City',
        'inputForm.country': 'Country',
        'inputForm.submit': 'Start Workflow',
        'inputForm.loading': 'Processing...',
        'inputForm.industryRequired': 'Please enter industry',
        'inputForm.cityRequired': 'Please enter city',
        'inputForm.countryRequired': 'Please select country',
        'airtableTable.title': 'Smart Opportunities Data',
        'airtableTable.loading': 'Loading data...',
        'airtableTable.error': 'Failed to load data',
        'airtableTable.noData': 'No data available',
        'airtableTable.refresh': 'Refresh',
        'airtableTable.export': 'Export',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock Airtable service
jest.mock('../../services/airtableService', () => ({
  AirtableService: {
    getInstance: jest.fn(() => ({
      getAllRecords: jest.fn(),
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
    })),
  },
}));

describe('Smart Opportunities Integration', () => {
  let queryClient: QueryClient;
  let mockAirtableService: any;
  let user: ReturnType<typeof userEvent.setup>;

  const mockRecords: AirtableRecord[] = [
    {
      id: 'rec1',
      fields: {
        'Company Name': 'TechCorp Inc.',
        'Industry': 'Technology',
        'Location': 'San Francisco, CA',
        'Description': 'Leading tech company',
        'Contact Person': 'John Doe',
        'Website': 'https://techcorp.com',
        'Email': 'john@techcorp.com',
        'Phone': '+1-555-0123',
      },
      createdTime: '2024-01-01T00:00:00Z',
    },
    {
      id: 'rec2',
      fields: {
        'Company Name': 'GreenEnergy Ltd.',
        'Industry': 'Energy',
        'Location': 'Austin, TX',
        'Description': 'Renewable energy solutions',
        'Contact Person': 'Jane Smith',
        'Website': 'https://greenenergy.com',
        'Email': 'jane@greenenergy.com',
        'Phone': '+1-555-0456',
      },
      createdTime: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockAirtableService = AirtableService.getInstance();
    user = userEvent.setup();

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockAirtableService.getAllRecords.mockResolvedValue(mockRecords);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('完整工作流测试', () => {
    it('应该完成完整的Smart Opportunities工作流', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('Smart Opportunities')).toBeInTheDocument();
      });

      // 验证初始状态 - 应该显示输入表单
      expect(screen.getByText('Workflow Parameters')).toBeInTheDocument();
      expect(screen.getByLabelText('Industry')).toBeInTheDocument();
      expect(screen.getByLabelText('City')).toBeInTheDocument();
      expect(screen.getByLabelText('Country')).toBeInTheDocument();

      // 填写表单
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      // 提交表单
      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证表单提交后的状态
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalledWith({
          industry: 'Technology',
          city: 'San Francisco',
          country: 'United States',
        });
      });

      // 等待数据加载完成
      await waitFor(() => {
        expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
      });

      // 验证数据显示
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('GreenEnergy Ltd.')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Energy')).toBeInTheDocument();
    });

    it('应该处理加载状态', async () => {
      // Mock 延迟响应
      mockAirtableService.getAllRecords.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRecords), 100))
      );

      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 快速填写并提交表单
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证加载状态
      expect(screen.getByText('Loading data...')).toBeInTheDocument();

      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
      });
    });

    it('应该处理错误状态', async () => {
      // Mock 错误响应
      const error = new Error('Network error');
      mockAirtableService.getAllRecords.mockRejectedValue(error);

      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 填写并提交表单
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证错误处理
      await waitFor(() => {
        expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      });
    });

    it('应该支持刷新功能', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 完成初始工作流
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
      });

      // 测试刷新功能
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // 验证重新调用了API
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalledTimes(2);
      });
    });

    it('应该支持导出功能', async () => {
      // Mock export 函数
      const mockExport = jest.fn();
      const originalConsole = global.console;
      global.console.table = mockExport;

      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 完成工作流并显示数据
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
      });

      // 测试导出功能
      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // 验证导出被调用
      expect(mockExport).toHaveBeenCalled();

      // 恢复console
      global.console = originalConsole;
    });
  });

  describe('表单验证测试', () => {
    it('应该验证必填字段', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 尝试提交空表单
      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证错误消息
      expect(screen.getByText('Please enter industry')).toBeInTheDocument();
      expect(screen.getByText('Please enter city')).toBeInTheDocument();
      expect(screen.getByText('Please select country')).toBeInTheDocument();
    });

    it('应该在修复验证错误后允许提交', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 提交空表单
      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证显示错误
      expect(screen.getByText('Please enter industry')).toBeInTheDocument();

      // 填写字段
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      // 重新提交
      await user.click(submitButton);

      // 验证API被调用
      await waitFor(() => {
        expect(mockAirtableService.getAllRecords).toHaveBeenCalledWith({
          industry: 'Technology',
          city: 'San Francisco',
          country: 'United States',
        });
      });
    });
  });

  describe('数据处理测试', () => {
    it('应该正确处理API响应', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 完成表单提交
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证数据正确显示
      await waitFor(() => {
        expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
        expect(screen.getByText('GreenEnergy Ltd.')).toBeInTheDocument();
      });

      // 验证联系信息显示
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@greenenergy.com')).toBeInTheDocument();
    });

    it('应该处理空数据响应', async () => {
      mockAirtableService.getAllRecords.mockResolvedValue([]);

      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 完成表单提交
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证空状态显示
      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('组件集成测试', () => {
    it('应该正确集成InputForm和AirtableTable组件', async () => {
      render(
        <TestWrapper>
          <SmartOpportunities />
        </TestWrapper>
      );

      // 验证两个主要组件都存在
      expect(screen.getByText('Workflow Parameters')).toBeInTheDocument();

      // 完成工作流
      const industryInput = screen.getByLabelText('Industry');
      const cityInput = screen.getByLabelText('City');
      const countryInput = screen.getByLabelText('Country');

      await user.type(industryInput, 'Technology');
      await user.type(cityInput, 'San Francisco');
      await user.type(countryInput, 'United States');

      const submitButton = screen.getByRole('button', { name: 'Start Workflow' });
      await user.click(submitButton);

      // 验证两个组件之间的数据流
      await waitFor(() => {
        expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
        expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
      });
    });
  });
});




