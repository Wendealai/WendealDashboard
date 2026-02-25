import { N8NWebhookService } from '../n8nWebhookService';

const createFiles = (count: number): File[] =>
  Array.from(
    { length: count },
    (_, index) =>
      new File([`content-${index}`], `invoice-${index + 1}.pdf`, {
        type: 'application/pdf',
      })
  );

const createSuccessResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: jest.fn().mockResolvedValue({
      executionId: 'exec-stress-1',
      workflowId: 'wf-stress',
    }),
    text: jest
      .fn()
      .mockResolvedValue(
        JSON.stringify({
          executionId: 'exec-stress-1',
          workflowId: 'wf-stress',
        })
      ),
  }) as unknown as Response;

describe('N8NWebhookService upload stress fixture', () => {
  const service = new N8NWebhookService();
  const webhookUrl = 'https://example.com/webhook';
  const originalFetch = globalThis.fetch;
  const originalAbortSignalTimeout = AbortSignal.timeout;

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof AbortSignal.timeout !== 'function') {
      (AbortSignal as any).timeout = jest.fn(() => undefined);
    }
    (globalThis as any).fetch = jest
      .fn()
      .mockResolvedValue(createSuccessResponse());
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    (AbortSignal as any).timeout = originalAbortSignalTimeout;
  });

  it('supports 50-file batch validation path', async () => {
    const files = createFiles(50);
    const result = await service.uploadFilesToWebhook(webhookUrl, {
      workflowId: 'wf-stress',
      files,
    });

    expect(result.success).toBe(true);
    expect((globalThis.fetch as jest.Mock).mock.calls.length).toBe(1);
  });

  it('rejects batch larger than 50 files', async () => {
    const files = createFiles(51);
    await expect(
      service.uploadFilesToWebhook(webhookUrl, {
        workflowId: 'wf-stress',
        files,
      })
    ).rejects.toThrow('Too many files');
  });
});
