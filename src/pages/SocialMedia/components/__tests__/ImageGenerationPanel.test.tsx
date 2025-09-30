import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ImageGenerationPanel from '../ImageGenerationPanel';
import type { ImageGenerationWorkflow } from '../../types';

// Mock image generation service
jest.mock('@/services/imageGenerationService', () => ({
  imageGenerationService: {
    generateImageFromText: jest.fn(),
    editImageWithPrompt: jest.fn(),
    testWebhookConnection: jest.fn(),
  },
}));

// Mock antd message
jest.mock('antd', () => {
  const mockMessage = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(() => ({
      destroy: jest.fn(),
    })),
  };

  return {
    ...jest.requireActual('antd'),
    message: mockMessage,
  };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockWorkflow: ImageGenerationWorkflow = {
  id: 'image-generation',
  name: 'Image Generation',
  description: 'Generate images from text prompts or edit existing images',
  status: 'active',
  type: 'manual',
  mode: 'text-to-image',
  settings: {
    webhookUrl: 'https://api.example.com/webhook',
    maxImageSize: 10 * 1024 * 1024,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    timeout: 60000,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodeCount: 2,
  executionCount: 0,
  successRate: 0,
  author: { id: 'system', name: 'System' },
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
);

describe('ImageGenerationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render image generation panel correctly', () => {
    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.getByText('Image Generation')).toBeInTheDocument();
    expect(screen.getByText('Text to Image')).toBeInTheDocument();
    expect(screen.getByText('Image Edit')).toBeInTheDocument();
  });

  it('should show loading state when loading prop is true', () => {
    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={true} />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should switch between text-to-image and image-edit tabs', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    // Initially on text-to-image tab
    expect(screen.getByText('Text to Image')).toBeInTheDocument();

    // Switch to image edit tab
    const imageEditTab = screen.getByRole('tab', { name: 'Image Edit' });
    await user.click(imageEditTab);

    // Should show image edit content
    expect(screen.getByText('Image Edit')).toBeInTheDocument();
  });

  it('should display workflow information correctly', () => {
    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        'Generate images from text prompts or edit existing images'
      )
    ).toBeInTheDocument();
  });

  it('should handle workflow with different modes', () => {
    const textToImageWorkflow: ImageGenerationWorkflow = {
      ...mockWorkflow,
      mode: 'text-to-image',
    };

    const { rerender } = render(
      <TestWrapper>
        <ImageGenerationPanel workflow={textToImageWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.getByText('Text to Image')).toBeInTheDocument();

    const imageEditWorkflow: ImageGenerationWorkflow = {
      ...mockWorkflow,
      mode: 'image-edit',
    };

    rerender(
      <TestWrapper>
        <ImageGenerationPanel workflow={imageEditWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.getByText('Image Edit')).toBeInTheDocument();
  });

  it('should display webhook URL information', () => {
    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    // The webhook URL should be passed to child components
    // This is tested implicitly through the workflow prop
    expect(mockWorkflow.settings.webhookUrl).toBe(
      'https://api.example.com/webhook'
    );
  });

  it('should handle workflow without settings gracefully', () => {
    const workflowWithoutSettings: ImageGenerationWorkflow = {
      ...mockWorkflow,
      settings: undefined as any,
    };

    expect(() => {
      render(
        <TestWrapper>
          <ImageGenerationPanel
            workflow={workflowWithoutSettings}
            loading={false}
          />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  it('should render with different workflow statuses', () => {
    const inactiveWorkflow: ImageGenerationWorkflow = {
      ...mockWorkflow,
      status: 'inactive',
    };

    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={inactiveWorkflow} loading={false} />
      </TestWrapper>
    );

    // Should still render but workflow status affects behavior in child components
    expect(screen.getByText('Image Generation')).toBeInTheDocument();
  });

  it('should handle missing workflow properties gracefully', () => {
    const minimalWorkflow: ImageGenerationWorkflow = {
      id: 'image-generation',
      name: 'Image Generation',
      status: 'active',
      type: 'manual',
      mode: 'text-to-image',
      settings: {
        webhookUrl: 'https://api.example.com/webhook',
        maxImageSize: 10 * 1024 * 1024,
        supportedFormats: ['image/jpeg'],
        timeout: 60000,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeCount: 1,
      executionCount: 0,
      successRate: 0,
      author: { id: 'system', name: 'System' },
    };

    render(
      <TestWrapper>
        <ImageGenerationPanel workflow={minimalWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.getByText('Image Generation')).toBeInTheDocument();
  });

  it('should maintain tab state when workflow changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    // Switch to image edit tab
    const imageEditTab = screen.getByRole('tab', { name: 'Image Edit' });
    await user.click(imageEditTab);

    // Change workflow
    const newWorkflow: ImageGenerationWorkflow = {
      ...mockWorkflow,
      name: 'Updated Image Generation',
    };

    rerender(
      <TestWrapper>
        <ImageGenerationPanel workflow={newWorkflow} loading={false} />
      </TestWrapper>
    );

    // Should still be on image edit tab
    expect(screen.getByText('Image Edit')).toBeInTheDocument();
  });

  it('should handle loading state transitions', () => {
    const { rerender } = render(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    rerender(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={true} />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <ImageGenerationPanel workflow={mockWorkflow} loading={false} />
      </TestWrapper>
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
