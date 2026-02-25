import { InvoiceOCRService } from '../invoiceOCRService';

describe('InvoiceOCRService phase-5 helpers', () => {
  const service = new InvoiceOCRService();
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    (window.localStorage.getItem as jest.Mock).mockImplementation(key =>
      storage.has(key) ? storage.get(key)! : null
    );
    (window.localStorage.setItem as jest.Mock).mockImplementation(
      (key, value) => {
        storage.set(String(key), String(value));
      }
    );
  });

  it('computes stable file fingerprint for same file', async () => {
    const file = new File(['same-content'], 'invoice.pdf', {
      type: 'application/pdf',
    });
    const fp1 = await service.computeFileFingerprint(file);
    const fp2 = await service.computeFileFingerprint(file);

    expect(fp1).toBe(fp2);
    expect(fp1.length).toBeGreaterThan(4);
  });

  it('keeps manual correction history', () => {
    service.saveManualCorrection(
      'wf-1',
      'result-1',
      { invoiceNumber: 'INV-1' },
      { actor: 'tester', diffKeys: ['invoiceNumber'] }
    );
    service.saveManualCorrection(
      'wf-1',
      'result-1',
      { amount: 100 },
      { actor: 'tester', diffKeys: ['amount'] }
    );

    const history = service.getManualCorrectionHistory('wf-1', 'result-1');
    expect(history.length).toBe(2);
    expect(history[0].diffKeys).toContain('amount');
    expect(history[1].diffKeys).toContain('invoiceNumber');
  });

  it('matches supplier template by alias', () => {
    service.saveSupplierTemplateRule({
      supplierName: 'ACME Corporation',
      aliases: ['ACME', 'ACME LTD'],
      fieldMappings: {
        amount: 'totalAmount',
      },
      defaultTags: ['核心供应商'],
      industry: '制造',
    });

    const applied = service.applySupplierTemplateRule('ACME', {
      amount: 200,
      currency: 'USD',
    });
    expect(applied.totalAmount).toBe(200);
    expect(applied.industry).toBe('制造');
    expect(applied.tags).toContain('核心供应商');
  });

  it('detects potential duplicate result ids', () => {
    const duplicated = service.findPotentialDuplicateResultIds([
      {
        id: 'r1',
        workflowId: 'wf-1',
        executionId: 'e1',
        originalFile: {
          name: 'a.pdf',
          size: 1,
          type: 'pdf',
          uploadedAt: '2026-01-01T00:00:00Z',
        },
        status: 'completed',
        startedAt: '2026-01-01T00:00:00Z',
        extractedData: {
          invoiceNumber: 'INV-001',
          vendorName: 'ACME',
          amount: 100,
          invoiceDate: '2026-01-01',
        } as any,
      } as any,
      {
        id: 'r2',
        workflowId: 'wf-1',
        executionId: 'e2',
        originalFile: {
          name: 'b.pdf',
          size: 2,
          type: 'pdf',
          uploadedAt: '2026-01-01T00:00:00Z',
        },
        status: 'completed',
        startedAt: '2026-01-01T00:00:00Z',
        extractedData: {
          invoiceNumber: 'INV-001',
          vendorName: 'ACME',
          amount: 100,
          invoiceDate: '2026-01-01',
        } as any,
      } as any,
      {
        id: 'r3',
        workflowId: 'wf-1',
        executionId: 'e3',
        originalFile: {
          name: 'c.pdf',
          size: 3,
          type: 'pdf',
          uploadedAt: '2026-01-01T00:00:00Z',
        },
        status: 'completed',
        startedAt: '2026-01-01T00:00:00Z',
        extractedData: {
          invoiceNumber: 'INV-002',
          vendorName: 'ACME',
          amount: 100,
          invoiceDate: '2026-01-01',
        } as any,
      } as any,
    ]);

    expect(duplicated).toContain('r1');
    expect(duplicated).toContain('r2');
    expect(duplicated).not.toContain('r3');
  });
});
