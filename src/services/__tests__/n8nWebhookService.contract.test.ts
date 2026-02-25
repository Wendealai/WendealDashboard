import { N8NWebhookService } from '../n8nWebhookService';

const createMockResponse = (options: {
  body: unknown;
  contentType: string;
  status?: number;
  statusText?: string;
  ok?: boolean;
}): Response =>
  ({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    headers: new Headers({ 'content-type': options.contentType }),
    json: jest.fn().mockResolvedValue(options.body),
    text: jest
      .fn()
      .mockResolvedValue(
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
      ),
  }) as unknown as Response;

describe('N8NWebhookService response contract', () => {
  const service = new N8NWebhookService();
  const webhookUrl = 'https://example.com/webhook';
  const originalFetch = globalThis.fetch;
  const originalAbortSignalTimeout = AbortSignal.timeout;

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof AbortSignal.timeout !== 'function') {
      (AbortSignal as any).timeout = jest.fn(() => undefined);
    }
    (globalThis as any).fetch = jest.fn();
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (AbortSignal as any).timeout = originalAbortSignalTimeout;
  });

  it('accepts object response and preserves traceId diagnostics', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      createMockResponse({
        body: {
          executionId: 'exec-object-1',
          workflowId: 'wf-1',
          message: 'ok',
        },
        contentType: 'application/json',
      })
    );

    const result = await service.uploadFilesToWebhook(webhookUrl, {
      workflowId: 'wf-1',
      files: [new File(['a'], 'a.pdf', { type: 'application/pdf' })],
      metadata: {
        traceId: 'trace-123',
      },
    });

    expect(result.success).toBe(true);
    expect(result.executionId).toBe('exec-object-1');
    expect(result.diagnostics?.traceId).toBe('trace-123');
    expect((globalThis.fetch as jest.Mock).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Trace-Id': 'trace-123',
        }),
      })
    );
  });

  it('accepts array response payload compatibility', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      createMockResponse({
        body: [
          {
            executionId: 'exec-array-1',
            workflowId: 'wf-1',
            googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/demo',
          },
        ],
        contentType: 'application/json',
      })
    );

    const result = await service.uploadFilesToWebhook(webhookUrl, {
      workflowId: 'wf-1',
      files: [new File(['a'], 'a.pdf', { type: 'application/pdf' })],
    });

    expect(result.success).toBe(true);
    expect(result.executionId).toBe('exec-array-1');
    expect(result.googleSheetsUrl).toContain('docs.google.com');
    expect(result.hasBusinessData).toBe(true);
  });

  it('accepts text response payload compatibility', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      createMockResponse({
        body: 'workflow accepted',
        contentType: 'text/plain',
      })
    );

    const result = await service.uploadFilesToWebhook(webhookUrl, {
      workflowId: 'wf-1',
      files: [new File(['a'], 'a.pdf', { type: 'application/pdf' })],
    });

    expect(result.success).toBe(true);
    expect(result.hasBusinessData).toBe(false);
    expect(result.data).toEqual({
      message: 'workflow accepted',
    });
  });
});
