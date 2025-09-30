import { imageGenerationService } from '../imageGenerationService';
import type { ImageGenerationResponse } from '@/pages/SocialMedia/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout
const mockTimeout = jest.fn();
global.AbortSignal = {
  timeout: mockTimeout,
} as any;

describe('ImageGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeout.mockReturnValue('mock-signal');
  });

  describe('generateImageFromText', () => {
    const validPrompt = 'A beautiful sunset over mountains';
    const validWebhookUrl = 'https://api.example.com/webhook';

    it('should generate image successfully', async () => {
      const mockResponse = {
        id: 'img-123',
        requestId: 'req-123',
        imageUrl: 'https://example.com/generated-image.png',
        processingTime: 2500,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await imageGenerationService.generateImageFromText(
        validPrompt,
        validWebhookUrl
      );

      expect(mockFetch).toHaveBeenCalledWith(validWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          prompt: validPrompt,
          mode: 'text-to-image',
          timestamp: expect.any(String),
          source: 'wendeal-dashboard',
          version: '1.0',
        }),
        signal: 'mock-signal',
      });

      expect(result).toEqual({
        id: 'img-123',
        requestId: 'req-123',
        imageUrl: 'https://example.com/generated-image.png',
        prompt: validPrompt,
        processingTime: 2500,
        createdAt: expect.any(String),
        errorMessage: undefined,
      });
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error'),
      });

      await expect(
        imageGenerationService.generateImageFromText(
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('图像生成失败: 500 Internal Server Error');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(
        imageGenerationService.generateImageFromText(
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('无法连接到图像生成服务，请检查网络连接');
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(
        imageGenerationService.generateImageFromText(
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('图像生成超时，请稍后重试');
    });

    it('should validate prompt - empty prompt', async () => {
      await expect(
        imageGenerationService.generateImageFromText('', validWebhookUrl)
      ).rejects.toThrow('提示词不能为空且长度应在1-1000字符之间');
    });

    it('should validate prompt - too long prompt', async () => {
      const longPrompt = 'a'.repeat(1001);
      await expect(
        imageGenerationService.generateImageFromText(
          longPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('提示词不能为空且长度应在1-1000字符之间');
    });

    it('should validate webhook URL - invalid URL', async () => {
      await expect(
        imageGenerationService.generateImageFromText(validPrompt, 'invalid-url')
      ).rejects.toThrow('无效的webhook URL');
    });

    it('should handle missing imageUrl in response', async () => {
      const mockResponse = {
        id: 'img-123',
        requestId: 'req-123',
        // missing imageUrl
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await expect(
        imageGenerationService.generateImageFromText(
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('响应中未包含生成的图像URL');
    });
  });

  describe('editImageWithPrompt', () => {
    const validPrompt = 'Add a sunset background';
    const validWebhookUrl = 'https://api.example.com/webhook';
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

    it('should edit image successfully', async () => {
      const mockResponse = {
        id: 'edit-123',
        requestId: 'req-123',
        imageUrl: 'https://example.com/edited-image.png',
        processingTime: 3000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await imageGenerationService.editImageWithPrompt(
        mockFile,
        validPrompt,
        validWebhookUrl
      );

      expect(mockFetch).toHaveBeenCalledWith(validWebhookUrl, {
        method: 'POST',
        body: expect.any(FormData),
        headers: {
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: 'mock-signal',
      });

      expect(result).toEqual({
        id: 'edit-123',
        requestId: 'req-123',
        imageUrl: 'https://example.com/edited-image.png',
        prompt: validPrompt,
        processingTime: 3000,
        createdAt: expect.any(String),
        errorMessage: undefined,
      });
    });

    it('should validate image file - no file provided', async () => {
      await expect(
        imageGenerationService.editImageWithPrompt(
          null as any,
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('请选择要编辑的图像文件');
    });

    it('should validate image file - file too large', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });

      await expect(
        imageGenerationService.editImageWithPrompt(
          largeFile,
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('图像文件过大，最大支持 10 MB');
    });

    it('should validate image file - unsupported format', async () => {
      const invalidFile = new File(['test'], 'test.txt', {
        type: 'text/plain',
      });

      await expect(
        imageGenerationService.editImageWithPrompt(
          invalidFile,
          validPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('不支持的图像格式: text/plain');
    });

    it('should validate edit prompt - empty prompt', async () => {
      await expect(
        imageGenerationService.editImageWithPrompt(
          mockFile,
          '',
          validWebhookUrl
        )
      ).rejects.toThrow('编辑提示词不能为空且长度应在1-500字符之间');
    });

    it('should validate edit prompt - too long prompt', async () => {
      const longPrompt = 'a'.repeat(501);
      await expect(
        imageGenerationService.editImageWithPrompt(
          mockFile,
          longPrompt,
          validWebhookUrl
        )
      ).rejects.toThrow('编辑提示词不能为空且长度应在1-500字符之间');
    });
  });

  describe('testWebhookConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
      });

      const result = await imageGenerationService.testWebhookConnection(
        'https://api.example.com/webhook'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/health', {
        method: 'GET',
        headers: {
          'User-Agent': 'WendealDashboard/1.0',
        },
        signal: expect.any(Object),
      });
    });

    it('should return false for invalid URL', async () => {
      const result =
        await imageGenerationService.testWebhookConnection('invalid-url');

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return false for network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await imageGenerationService.testWebhookConnection(
        'https://api.example.com/webhook'
      );

      expect(result).toBe(false);
    });

    it('should return false for 5xx status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 500,
      });

      const result = await imageGenerationService.testWebhookConnection(
        'https://api.example.com/webhook'
      );

      expect(result).toBe(false);
    });

    it('should return true for 4xx status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
      });

      const result = await imageGenerationService.testWebhookConnection(
        'https://api.example.com/webhook'
      );

      expect(result).toBe(true);
    });
  });

  describe('private methods', () => {
    describe('isValidPrompt', () => {
      it('should validate prompt correctly', () => {
        // Access private method through type assertion
        const service = imageGenerationService as any;

        expect(service.isValidPrompt('valid prompt')).toBe(true);
        expect(service.isValidPrompt('')).toBe(false);
        expect(service.isValidPrompt('   ')).toBe(false);
        expect(service.isValidPrompt('a'.repeat(1001))).toBe(false);
      });
    });

    describe('isValidWebhookUrl', () => {
      it('should validate webhook URL correctly', () => {
        const service = imageGenerationService as any;

        expect(service.isValidWebhookUrl('https://api.example.com')).toBe(true);
        expect(service.isValidWebhookUrl('http://api.example.com')).toBe(true);
        expect(service.isValidWebhookUrl('ftp://api.example.com')).toBe(false);
        expect(service.isValidWebhookUrl('invalid-url')).toBe(false);
      });
    });

    describe('validateImageFile', () => {
      it('should validate image file correctly', () => {
        const service = imageGenerationService as any;

        const validFile = new File(['test'], 'test.png', { type: 'image/png' });
        expect(() => service.validateImageFile(validFile)).not.toThrow();

        expect(() => service.validateImageFile(null)).toThrow(
          '请选择要编辑的图像文件'
        );

        const largeFile = new File(
          ['x'.repeat(11 * 1024 * 1024)],
          'large.png',
          { type: 'image/png' }
        );
        expect(() => service.validateImageFile(largeFile)).toThrow();

        const invalidFile = new File(['test'], 'test.txt', {
          type: 'text/plain',
        });
        expect(() => service.validateImageFile(invalidFile)).toThrow();
      });
    });

    describe('formatFileSize', () => {
      it('should format file sizes correctly', () => {
        const service = imageGenerationService as any;

        expect(service.formatFileSize(0)).toBe('0 Bytes');
        expect(service.formatFileSize(1024)).toBe('1.00 KB');
        expect(service.formatFileSize(1024 * 1024)).toBe('1.00 MB');
        expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      });
    });
  });
});
