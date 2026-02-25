import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import InvoiceOCRResults from '../InvoiceOCRResults';
import { invoiceOCRService } from '@/services/invoiceOCRService';
import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks', () => ({
  useMessage: () => ({
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
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

jest.mock('@/config/invoiceOcrConfig', () => ({
  getInvoiceOcrConfig: jest.fn(),
}));

jest.mock('@/services/invoiceOCRService', () => ({
  invoiceOCRService: {
    getResults: jest.fn(),
    getBatchTasks: jest.fn(),
    getManualCorrection: jest.fn(() => null),
    getManualCorrectionHistory: jest.fn(() => []),
    applySupplierTemplateRule: jest.fn(
      (_: string, data: Record<string, unknown>) => data
    ),
    normalizeCurrencyAndTax: jest.fn((data: Record<string, unknown>) => data),
    inferInvoiceIndustryTags: jest.fn(() => []),
    findPotentialDuplicateResultIds: jest.fn(() => []),
    canPerformManualCorrection: jest.fn(() => ({
      allowed: true,
      role: 'admin',
    })),
    shouldEmitAlert: jest.fn(() => true),
  },
}));

describe('InvoiceOCRResults client health alerts', () => {
  const mockInvoiceService = invoiceOCRService as jest.Mocked<
    typeof invoiceOCRService
  >;
  const mockConfig = getInvoiceOcrConfig as jest.MockedFunction<
    typeof getInvoiceOcrConfig
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.mockReturnValue({
      workflowId: 'wf-test',
      webhookUrl: 'https://example.com/webhook',
      resultPollingIntervalMs: 4000,
      resultPollingHiddenIntervalMs: 12000,
      resultPollingTimeoutMs: 120000,
      resultPollingFailureThreshold: 3,
      postSuccessRediagnoseDelayMs: 30000,
      uploadChunkSize: 10,
      webhookSignatureStrict: false,
      globalQueueConcurrency: 2,
      queueLeaseTimeoutMs: 120000,
      alertQuietWindowMinutes: 10,
      diagnosticsArchiveIntervalMs: 300000,
      manualCorrectionAllowedRoles: ['admin', 'manager'],
      debug: false,
    });
    mockInvoiceService.getResults.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    } as any);
    mockInvoiceService.getBatchTasks.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    } as any);
  });

  it('renders webhook/result-sync/supabase health alerts in completion view', async () => {
    render(
      <InvoiceOCRResults
        workflowId='wf-test'
        processingStatus='completed'
        completedData={{
          executionId: 'exec-1',
          clientHealth: {
            capturedAt: '2026-02-25T00:00:00.000Z',
            webhook: {
              reachable: false,
              checkedAt: '2026-02-25T00:00:00.000Z',
              latencyMs: 33,
              status: 503,
              statusText: 'Service Unavailable',
            },
            resultSync: {
              reachable: false,
              checkedAt: '2026-02-25T00:00:00.000Z',
              latencyMs: 22,
              httpStatus: 500,
            },
            supabase: {
              reachable: false,
              configured: false,
              checkedAt: '2026-02-25T00:00:00.000Z',
              latencyMs: 41,
            },
          },
        }}
      />
    );

    await waitFor(() => {
      expect(mockInvoiceService.getResults).toHaveBeenCalled();
      expect(mockInvoiceService.getBatchTasks).toHaveBeenCalled();
    });

    expect(screen.getByText('客户端诊断：Webhook 异常')).toBeInTheDocument();
    expect(
      screen.getByText('客户端诊断：结果同步接口异常')
    ).toBeInTheDocument();
    expect(screen.getByText('客户端诊断：Supabase 异常')).toBeInTheDocument();
  });
});
