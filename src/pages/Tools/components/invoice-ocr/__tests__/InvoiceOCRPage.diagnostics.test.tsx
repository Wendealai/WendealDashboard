import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import InvoiceOCRPage from '../../InvoiceOCRPage';
import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';
import { invoiceOCRService } from '@/services/invoiceOCRService';
import { n8nWebhookService } from '@/services/n8nWebhookService';

const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks', () => ({
  useMessage: () => mockMessage,
}));

jest.mock('@/hooks/useErrorModal', () => ({
  useErrorModal: () => ({
    isVisible: false,
    errorInfo: null,
    showError: jest.fn(),
    hideError: jest.fn(),
  }),
}));

jest.mock('@/components/common/ErrorModal', () => () => null);

jest.mock('../InvoiceOCRSettings', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-settings'>mock-settings</div>,
}));

jest.mock('../InvoiceOCRResults', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-results'>mock-results</div>,
}));

jest.mock('../InvoiceFileUpload', () => ({
  __esModule: true,
  default: ({ onOCRProcess, onOCRCompleted }: any) => (
    <button
      onClick={() => {
        const file = new File(['demo'], 'invoice.pdf', {
          type: 'application/pdf',
        });
        onOCRProcess?.([file]);
        onOCRCompleted?.({
          executionId: 'exec-1',
          traceId: 'trace-1',
          hasBusinessData: false,
        });
      }}
    >
      mock-complete
    </button>
  ),
}));

jest.mock('@/config/invoiceOcrConfig', () => ({
  getInvoiceOcrConfig: jest.fn(),
}));

jest.mock('@/services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getResultsListWithRetry: jest.fn(),
    getStats: jest.fn(),
    testResultSyncConnection: jest.fn(),
    testSupabaseConnection: jest.fn(),
  },
}));

jest.mock('@/services/n8nWebhookService', () => ({
  n8nWebhookService: {
    testWebhookConnectionDetailed: jest.fn(),
  },
}));

jest.mock('@/services/invoiceOcrTelemetry', () => ({
  trackInvoiceOcrEvent: jest.fn(),
}));

describe('InvoiceOCRPage diagnostics', () => {
  const mockConfig = getInvoiceOcrConfig as jest.MockedFunction<
    typeof getInvoiceOcrConfig
  >;
  const mockInvoiceService = invoiceOCRService as jest.Mocked<
    typeof invoiceOCRService
  >;
  const mockWebhookService = n8nWebhookService as jest.Mocked<
    typeof n8nWebhookService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.mockReturnValue({
      workflowId: 'wf-test',
      webhookUrl: 'https://example.com/webhook',
      resultPollingIntervalMs: 80,
      resultPollingHiddenIntervalMs: 80,
      resultPollingTimeoutMs: 300,
      resultPollingFailureThreshold: 3,
      postSuccessRediagnoseDelayMs: 120000,
      debug: false,
    });
    mockInvoiceService.getResultsListWithRetry.mockResolvedValue([]);
    mockInvoiceService.getStats.mockResolvedValue({
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalAmount: 0,
      averageProcessingTime: 0,
    });
    mockInvoiceService.testResultSyncConnection.mockResolvedValue({
      reachable: true,
      checkedAt: '2026-02-25T00:00:00.000Z',
      latencyMs: 18,
      resultCount: 0,
      totalCount: 0,
    });
    mockInvoiceService.testSupabaseConnection.mockResolvedValue({
      reachable: true,
      configured: true,
      checkedAt: '2026-02-25T00:00:00.000Z',
      latencyMs: 22,
      httpStatus: 200,
      statusText: 'OK',
    });
    mockWebhookService.testWebhookConnectionDetailed.mockResolvedValue({
      reachable: true,
      checkedAt: '2026-02-25T00:00:00.000Z',
      latencyMs: 20,
      status: 200,
      statusText: 'OK',
      requestUrl: 'https://example.com/webhook',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders diagnostics center and supports rerun', async () => {
    render(<InvoiceOCRPage />);

    await waitFor(() => {
      expect(
        mockWebhookService.testWebhookConnectionDetailed
      ).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '诊断中心' }));
    expect(screen.getByText('Invoice OCR 诊断中心')).toBeInTheDocument();
    expect(screen.getByText('最近诊断历史（最多 50 条）')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新诊断' }));
    await waitFor(() => {
      expect(
        mockWebhookService.testWebhookConnectionDetailed
      ).toHaveBeenCalledTimes(2);
    });
  });

  it('triggers silent full diagnostics after polling timeout', async () => {
    jest.useFakeTimers();
    mockConfig.mockReturnValue({
      workflowId: 'wf-timeout',
      webhookUrl: 'https://example.com/webhook',
      resultPollingIntervalMs: 50,
      resultPollingHiddenIntervalMs: 50,
      resultPollingTimeoutMs: 180,
      resultPollingFailureThreshold: 3,
      postSuccessRediagnoseDelayMs: 120000,
      debug: false,
    });

    render(<InvoiceOCRPage />);
    await waitFor(() => {
      expect(
        mockWebhookService.testWebhookConnectionDetailed
      ).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'mock-complete' }));

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        mockWebhookService.testWebhookConnectionDetailed.mock.calls.length
      ).toBeGreaterThanOrEqual(2);
    });
  });
});
