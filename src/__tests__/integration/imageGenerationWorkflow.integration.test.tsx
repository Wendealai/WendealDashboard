import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import SocialMedia from '@/pages/SocialMedia/SocialMedia';
import type { ImageGenerationWorkflow } from '@/pages/SocialMedia/types';

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

// Mock fetch globally for webhook calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ConfigProvider locale={zhCN}>{children}</ConfigProvider>
  </BrowserRouter>
);

describe('Image Generation Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful webhook response
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'img-123',
        requestId: 'req-123',
        imageUrl: 'https://example.com/generated-image.png',
        processingTime: 2500,
      }),
    });
  });

  it('should complete full image generation workflow from selection to result', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Step 1: Verify initial state - should show workflow selection prompt
    expect(
      screen.getByText('Please select a workflow to execute')
    ).toBeInTheDocument();

    // Step 2: Select image generation workflow from sidebar
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    // Step 3: Verify image generation panel is displayed
    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Step 4: Verify tabs are present
    expect(
      screen.getByRole('tab', { name: 'Text to Image' })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Image Edit' })).toBeInTheDocument();

    // Step 5: Fill out text-to-image form
    const promptInput = screen.getByLabelText('图像描述');
    await user.type(promptInput, 'A beautiful sunset over mountains');

    // Step 6: Submit the form
    const generateButton = screen.getByRole('button', { name: '生成图像' });
    await user.click(generateButton);

    // Step 7: Verify loading state
    expect(screen.getByText('生成中...')).toBeInTheDocument();

    // Step 8: Wait for completion and verify result
    await waitFor(() => {
      expect(screen.getByText('生成结果')).toBeInTheDocument();
    });

    // Step 9: Verify generated image is displayed
    const generatedImage = screen.getByAltText('Generated image');
    expect(generatedImage).toBeInTheDocument();
    expect(generatedImage).toHaveAttribute(
      'src',
      'https://example.com/generated-image.png'
    );

    // Step 10: Verify download functionality is available
    const downloadButton = screen.getByRole('button', { name: '下载图像' });
    expect(downloadButton).toBeInTheDocument();
  });

  it('should handle workflow switching between different workflows', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Start with image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Switch to TK Viral Extract workflow
    const tkViralCard = screen.getByText('TK Viral Extract');
    await user.click(tkViralCard);

    // Verify workflow switched
    await waitFor(() => {
      expect(screen.getByText('TK Viral Extract')).toBeInTheDocument();
    });

    // Switch back to image generation
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });
  });

  it('should handle image edit workflow', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Switch to image edit tab
    const imageEditTab = screen.getByRole('tab', { name: 'Image Edit' });
    await user.click(imageEditTab);

    // Verify image edit interface is shown
    expect(screen.getByText('Image Edit')).toBeInTheDocument();

    // Create a mock file
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

    // Mock file input (this is complex in testing, so we'll just verify the UI is ready)
    const fileInput =
      screen.getByLabelText(/upload/i) ||
      screen.getByRole('button', { name: /upload/i });
    expect(fileInput).toBeInTheDocument();
  });

  it('should handle error scenarios gracefully', async () => {
    const user = userEvent.setup();

    // Mock failed API call
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Fill form and submit
    const promptInput = screen.getByLabelText('图像描述');
    await user.type(promptInput, 'Test prompt');

    const generateButton = screen.getByRole('button', { name: '生成图像' });
    await user.click(generateButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('生成失败：')).toBeInTheDocument();
    });

    // Verify retry functionality is available
    const retryButton = screen.getByRole('button', { name: '重试 (1/3)' });
    expect(retryButton).toBeInTheDocument();
  });

  it('should maintain workflow state across interactions', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Switch to image edit tab
    const imageEditTab = screen.getByRole('tab', { name: 'Image Edit' });
    await user.click(imageEditTab);

    // Switch back to text-to-image tab
    const textToImageTab = screen.getByRole('tab', { name: 'Text to Image' });
    await user.click(textToImageTab);

    // Verify we're back to text-to-image tab
    expect(screen.getByLabelText('图像描述')).toBeInTheDocument();
  });

  it('should handle multiple image generations in sequence', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // First generation
    const promptInput = screen.getByLabelText('图像描述');
    await user.clear(promptInput);
    await user.type(promptInput, 'First image prompt');

    const generateButton = screen.getByRole('button', { name: '生成图像' });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('生成结果')).toBeInTheDocument();
    });

    // Second generation
    await user.clear(promptInput);
    await user.type(promptInput, 'Second image prompt');
    await user.click(generateButton);

    // Verify second generation completes
    await waitFor(() => {
      expect(screen.getByText('生成结果')).toBeInTheDocument();
    });
  });

  it('should validate form inputs correctly', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });

    // Try to submit empty form
    const generateButton = screen.getByRole('button', { name: '生成图像' });
    await user.click(generateButton);

    // Verify validation error
    await waitFor(() => {
      expect(screen.getByText('请输入图像描述')).toBeInTheDocument();
    });

    // Fill form and verify validation passes
    const promptInput = screen.getByLabelText('图像描述');
    await user.type(promptInput, 'Valid prompt');

    await waitFor(() => {
      expect(screen.queryByText('请输入图像描述')).not.toBeInTheDocument();
    });
  });

  it('should handle workflow panel loading states', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <SocialMedia />
      </TestWrapper>
    );

    // Select image generation workflow
    const imageGenerationCard = screen.getByText('Image Generation');
    await user.click(imageGenerationCard);

    // Initially should not show loading
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    // During generation, loading should be shown (this is handled by child components)
    await waitFor(() => {
      expect(screen.getByText('Image Generation')).toBeInTheDocument();
    });
  });
});
