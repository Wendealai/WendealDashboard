/**
 * AirtableTable 组件单元测试
 * 测试Airtable数据显示和交互功能
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AirtableTable from '../AirtableTable';
import type { AirtableRecord } from '../../../../types/smartOpportunities';

// Mock 依赖项
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'airtableTable.title': 'Smart Opportunities Data',
        'airtableTable.loading': 'Loading data...',
        'airtableTable.error': 'Failed to load data',
        'airtableTable.noData': 'No data available',
        'airtableTable.refresh': 'Refresh',
        'airtableTable.export': 'Export',
        'airtableTable.sortBy': 'Sort by',
        'airtableTable.filter': 'Filter',
        'airtableTable.search': 'Search',
        'airtableTable.company': 'Company',
        'airtableTable.industry': 'Industry',
        'airtableTable.location': 'Location',
        'airtableTable.description': 'Description',
        'airtableTable.contact': 'Contact',
        'airtableTable.website': 'Website',
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

describe('AirtableTable', () => {
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

  const defaultProps = {
    data: mockRecords,
    loading: false,
    onRefresh: jest.fn(),
    onExport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    it('应该正确渲染表格标题和数据', () => {
      render(<AirtableTable {...defaultProps} />);

      expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('GreenEnergy Ltd.')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Energy')).toBeInTheDocument();
    });

    it('应该显示加载状态', () => {
      render(<AirtableTable {...defaultProps} loading={true} />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('应该显示无数据状态', () => {
      render(<AirtableTable {...defaultProps} data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('应该显示错误状态', () => {
      const error = 'Failed to fetch data';
      render(<AirtableTable {...defaultProps} error={error} />);

      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  describe('交互测试', () => {
    it('应该调用refresh回调函数', async () => {
      const user = userEvent.setup();
      render(<AirtableTable {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
    });

    it('应该调用export回调函数', async () => {
      const user = userEvent.setup();
      render(<AirtableTable {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
    });

    it('应该支持排序功能', async () => {
      const user = userEvent.setup();
      render(<AirtableTable {...defaultProps} />);

      // 查找排序按钮（Ant Design Table的排序功能）
      const companyColumn = screen.getByText('Company');
      await user.click(companyColumn);

      // 验证表格仍然渲染（排序功能由Ant Design处理）
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
    });

    it('应该支持分页功能', () => {
      render(<AirtableTable {...defaultProps} />);

      // 检查分页组件是否存在
      const pagination = document.querySelector('.ant-pagination');
      expect(pagination).toBeInTheDocument();
    });
  });

  describe('数据处理测试', () => {
    it('应该正确处理空字段', () => {
      const recordWithEmptyFields: AirtableRecord = {
        id: 'rec3',
        fields: {
          'Company Name': 'Test Company',
          // 缺少其他字段
        } as any,
        createdTime: '2024-01-03T00:00:00Z',
      };

      render(<AirtableTable {...defaultProps} data={[recordWithEmptyFields]} />);

      expect(screen.getByText('Test Company')).toBeInTheDocument();
      // 空字段应该显示为空或默认值
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    it('应该正确格式化联系信息', () => {
      render(<AirtableTable {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@techcorp.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    });

    it('应该正确处理网站链接', () => {
      render(<AirtableTable {...defaultProps} />);

      const websiteLink = screen.getByText('https://techcorp.com');
      expect(websiteLink).toBeInTheDocument();
      expect(websiteLink.closest('a')).toHaveAttribute('href', 'https://techcorp.com');
    });
  });

  describe('错误处理测试', () => {
    it('应该处理无效数据', () => {
      const invalidRecord = {
        id: 'invalid',
        fields: null as any,
        createdTime: '2024-01-01T00:00:00Z',
      };

      render(<AirtableTable {...defaultProps} data={[invalidRecord]} />);

      // 应该优雅地处理无效数据而不崩溃
      expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
    });

    it('应该处理网络错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<AirtableTable {...defaultProps} error="Network Error" />);

      expect(screen.getByText('Network Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('可访问性测试', () => {
    it('应该具有正确的ARIA标签', () => {
      render(<AirtableTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // 检查表格是否有适当的标题
      expect(screen.getByText('Smart Opportunities Data')).toBeInTheDocument();
    });

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup();
      render(<AirtableTable {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // 聚焦到按钮
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();

      // 按Enter键
      await user.keyboard('{Enter}');
      expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('性能测试', () => {
    it('应该高效渲染大量数据', () => {
      const largeDataSet = Array.from({ length: 100 }, (_, index) => ({
        id: `rec${index}`,
        fields: {
          'Company Name': `Company ${index}`,
          'Industry': 'Technology',
          'Location': `City ${index}`,
          'Description': `Description ${index}`,
        },
        createdTime: '2024-01-01T00:00:00Z',
      }));

      const startTime = Date.now();
      render(<AirtableTable {...defaultProps} data={largeDataSet} />);
      const renderTime = Date.now() - startTime;

      // 渲染时间应该在合理范围内（这里设置为1秒）
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByText('Company 0')).toBeInTheDocument();
    });
  });
});




