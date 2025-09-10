/**
 * InputForm 组件单元测试
 * 测试Smart Opportunities参数输入表单组件
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InputForm from '../InputForm';
import type { WorkflowParameters } from '../../../../types/smartOpportunities';

// Mock 依赖项
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'inputForm.title': 'Workflow Parameters',
        'inputForm.industry': 'Industry',
        'inputForm.city': 'City',
        'inputForm.country': 'Country',
        'inputForm.submit': 'Start Workflow',
        'inputForm.loading': 'Processing...',
        'inputForm.industryRequired': 'Please enter industry',
        'inputForm.cityRequired': 'Please enter city',
        'inputForm.countryRequired': 'Please select country',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock message from antd
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
  },
}));

describe('InputForm', () => {
  const mockProps = {
    value: {
      industry: '',
      city: '',
      country: '',
    },
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    loading: false,
    disabled: false,
  };

  const filledValue: WorkflowParameters = {
    industry: 'Technology',
    city: 'New York',
    country: 'United States',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始渲染', () => {
    it('应该正确渲染表单结构', () => {
      render(<InputForm {...mockProps} />);

      expect(screen.getByText('Workflow Parameters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., New York, London, Sydney')).toBeInTheDocument();
      expect(screen.getByText('Select Country')).toBeInTheDocument();
      expect(screen.getByText('Start Workflow')).toBeInTheDocument();
    });

    it('应该显示必填字段的星号', () => {
      render(<InputForm {...mockProps} />);
      const requiredStars = screen.getAllByText('*');
      expect(requiredStars).toHaveLength(3); // Industry, City, Country 都是必填的
    });

    it('应该正确显示初始值', () => {
      const propsWithValue = {
        ...mockProps,
        value: filledValue,
      };

      render(<InputForm {...propsWithValue} />);

      const industryInput = screen.getByDisplayValue('Technology');
      const cityInput = screen.getByDisplayValue('New York');
      const countrySelect = screen.getByDisplayValue('United States');

      expect(industryInput).toBeInTheDocument();
      expect(cityInput).toBeInTheDocument();
      expect(countrySelect).toBeInTheDocument();
    });
  });

  describe('表单输入处理', () => {
    it('应该在输入行业时调用onChange', () => {
      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      fireEvent.change(industryInput, { target: { value: 'Technology' } });

      expect(mockProps.onChange).toHaveBeenCalledWith({
        industry: 'Technology',
        city: '',
        country: '',
      });
    });

    it('应该在输入城市时调用onChange', () => {
      render(<InputForm {...mockProps} />);

      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      fireEvent.change(cityInput, { target: { value: 'New York' } });

      expect(mockProps.onChange).toHaveBeenCalledWith({
        industry: '',
        city: 'New York',
        country: '',
      });
    });

    it('应该在选择国家时调用onChange', () => {
      render(<InputForm {...mockProps} />);

      const countrySelect = screen.getByLabelText('Country Selection');
      fireEvent.change(countrySelect, { target: { value: 'United States' } });

      expect(mockProps.onChange).toHaveBeenCalledWith({
        industry: '',
        city: '',
        country: 'United States',
      });
    });

    it('应该处理多个字段的组合输入', () => {
      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });

      expect(mockProps.onChange).toHaveBeenCalledTimes(3);
      expect(mockProps.onChange).toHaveBeenLastCalledWith({
        industry: 'Technology',
        city: 'New York',
        country: 'United States',
      });
    });
  });

  describe('表单验证', () => {
    it('应该验证必填字段', async () => {
      render(<InputForm {...mockProps} />);

      const submitButton = screen.getByText('Start Workflow');
      fireEvent.click(submitButton);

      // 验证必填字段的错误信息
      await waitFor(() => {
        expect(screen.getByText('Please enter industry')).toBeInTheDocument();
        expect(screen.getByText('Please enter city')).toBeInTheDocument();
        expect(screen.getByText('Please select country')).toBeInTheDocument();
      });

      // 验证onSubmit没有被调用
      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });

    it('应该在填写所有必填字段后允许提交', async () => {
      mockProps.onSubmit.mockResolvedValue(undefined);

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          industry: 'Technology',
          city: 'New York',
          country: 'United States',
        });
      });
    });

    it('应该在提交时清理输入值', async () => {
      mockProps.onSubmit.mockResolvedValue(undefined);

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      // 输入带空格的值
      fireEvent.change(industryInput, { target: { value: '  Technology  ' } });
      fireEvent.change(cityInput, { target: { value: '  New York  ' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          industry: 'Technology', // 应该被trim
          city: 'New York', // 应该被trim
          country: 'United States',
        });
      });
    });
  });

  describe('提交处理', () => {
    it('应该在提交时显示加载状态', async () => {
      mockProps.onSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      // 验证按钮显示加载状态
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('应该在提交成功后恢复正常状态', async () => {
      mockProps.onSubmit.mockResolvedValue(undefined);

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Start Workflow')).toBeInTheDocument();
      });
    });

    it('应该在提交失败时显示错误消息', async () => {
      const error = new Error('Submit failed');
      mockProps.onSubmit.mockRejectedValue(error);

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const message = require('antd').message;
        expect(message.error).toHaveBeenCalledWith('提交失败，请重试');
      });
    });
  });

  describe('状态管理', () => {
    it('应该在loading为true时禁用表单', () => {
      const propsWithLoading = { ...mockProps, loading: true };
      render(<InputForm {...propsWithLoading} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Processing...');

      expect(industryInput).toBeDisabled();
      expect(cityInput).toBeDisabled();
      expect(countrySelect).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('应该在disabled为true时禁用表单', () => {
      const propsWithDisabled = { ...mockProps, disabled: true };
      render(<InputForm {...propsWithDisabled} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      expect(industryInput).toBeDisabled();
      expect(cityInput).toBeDisabled();
      expect(countrySelect).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('应该同时处理loading和disabled状态', () => {
      const propsWithBoth = { ...mockProps, loading: true, disabled: true };
      render(<InputForm {...propsWithBoth} />);

      const submitButton = screen.getByText('Processing...');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('国家选择器', () => {
    it('应该显示所有可用的国家选项', () => {
      render(<InputForm {...mockProps} />);

      const countrySelect = screen.getByLabelText('Country Selection');

      expect(countrySelect).toHaveDisplayValue('Select Country');

      // 检查选项是否存在
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(6); // 5个国家 + 1个默认选项

      expect(screen.getByRole('option', { name: 'Australia' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'United States' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'New Zealand' })).toBeInTheDocument();
    });

    it('应该正确处理国家选择', () => {
      render(<InputForm {...mockProps} />);

      const countrySelect = screen.getByLabelText('Country Selection');
      fireEvent.change(countrySelect, { target: { value: 'Australia' } });

      expect(mockProps.onChange).toHaveBeenCalledWith({
        industry: '',
        city: '',
        country: 'Australia',
      });
    });
  });

  describe('表单布局', () => {
    it('应该使用正确的布局样式', () => {
      render(<InputForm {...mockProps} />);
      const form = screen.getByRole('form');
      expect(form).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('应该正确显示表单标签和输入框的对齐', () => {
      render(<InputForm {...mockProps} />);

      // 验证标签和输入框的布局
      const industryLabel = screen.getByText('Industry *');
      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');

      expect(industryLabel).toBeInTheDocument();
      expect(industryInput).toBeInTheDocument();
    });
  });

  describe('无障碍性', () => {
    it('应该为国家选择器提供正确的ARIA标签', () => {
      render(<InputForm {...mockProps} />);
      const countrySelect = screen.getByLabelText('Country Selection');
      expect(countrySelect).toHaveAttribute('aria-label', 'Country Selection');
    });

    it('应该支持键盘导航', () => {
      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      // 验证所有表单元素都可以通过键盘访问
      expect(industryInput).toBeInTheDocument();
      expect(cityInput).toBeInTheDocument();
      expect(countrySelect).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('应该在提交按钮上显示正确的文本', () => {
      render(<InputForm {...mockProps} />);
      const submitButton = screen.getByRole('button', { name: /Start Workflow/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该处理异步提交错误', async () => {
      const networkError = new Error('Network timeout');
      mockProps.onSubmit.mockRejectedValue(networkError);

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const message = require('antd').message;
        expect(message.error).toHaveBeenCalledWith('提交失败，请重试');
      });
    });

    it('应该在提交过程中保持表单状态', async () => {
      mockProps.onSubmit.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 500))
      );

      render(<InputForm {...mockProps} />);

      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      const cityInput = screen.getByPlaceholderText('e.g., New York, London, Sydney');
      const countrySelect = screen.getByLabelText('Country Selection');
      const submitButton = screen.getByText('Start Workflow');

      // 填写表单
      fireEvent.change(industryInput, { target: { value: 'Technology' } });
      fireEvent.change(cityInput, { target: { value: 'New York' } });
      fireEvent.change(countrySelect, { target: { value: 'United States' } });

      // 提交表单
      fireEvent.click(submitButton);

      // 验证表单值在提交过程中保持不变
      expect(industryInput).toHaveValue('Technology');
      expect(cityInput).toHaveValue('New York');
      expect(countrySelect).toHaveValue('United States');
    });
  });

  describe('性能优化', () => {
    it('应该使用useCallback优化回调函数', () => {
      const onChangeSpy = jest.fn();
      const onSubmitSpy = jest.fn();

      const { rerender } = render(
        <InputForm
          {...mockProps}
          onChange={onChangeSpy}
          onSubmit={onSubmitSpy}
        />
      );

      // 重新渲染相同的props
      rerender(
        <InputForm
          {...mockProps}
          onChange={onChangeSpy}
          onSubmit={onSubmitSpy}
        />
      );

      // 验证回调函数的引用没有改变
      const industryInput = screen.getByPlaceholderText('e.g., barber, real estate agency, coffee shop');
      fireEvent.change(industryInput, { target: { value: 'Technology' } });

      expect(onChangeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
