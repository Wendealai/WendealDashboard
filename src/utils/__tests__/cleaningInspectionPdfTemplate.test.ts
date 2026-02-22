import {
  generateInspectionPdfHtml,
  generateInspectionFilename,
} from '@/utils/cleaningInspectionPdfTemplate';
import type { CleaningInspection } from '@/pages/CleaningInspection/types';

describe('cleaningInspectionPdfTemplate', () => {
  it('renders English-only report content when language is en', async () => {
    const inspection: CleaningInspection = {
      id: 'insp-test-001',
      propertyId: '测试房源 Test Property',
      propertyAddress: '52 Wecker Road, Mansfield QLD 4122',
      propertyNotes: 'English notes only',
      propertyNotesZh: '中文备注',
      checkOutDate: '2026-02-22',
      submittedAt: '2026-02-22T10:00:00.000Z',
      sections: [
        {
          id: 'kitchen',
          name: '厨房 Kitchen',
          description: '厨房区域',
          referenceImages: [],
          photos: [],
          notes: '需要重点清洁',
          checklist: [
            {
              id: 'item-1',
              label: '灶台无油渍',
              labelEn: 'No grease stains on stove',
              checked: true,
              requiredPhoto: true,
              photo: 'data:image/jpeg;base64,abc',
            },
          ],
        },
      ],
      submitterName: '张三',
      status: 'submitted',
      templateName: '模板A',
      checkIn: {
        timestamp: '2026-02-22T08:00:00.000Z',
        gpsLat: null,
        gpsLng: null,
        gpsAddress: 'Brisbane QLD',
      },
      checkOut: {
        timestamp: '2026-02-22T10:00:00.000Z',
        gpsLat: null,
        gpsLng: null,
        gpsAddress: 'Brisbane QLD',
        keyReturnMethod: 'lockbox',
      },
      damageReports: [
        {
          id: 'dmg-1',
          description: '墙面有划痕',
          photo: 'data:image/jpeg;base64,def',
          location: '客厅 Living Room',
          timestamp: '2026-02-22T09:00:00.000Z',
        },
      ],
      assignedEmployee: {
        id: 'emp-1',
        name: '李四',
        nameEn: 'Leo Li',
      },
      assignedEmployees: [
        {
          id: 'emp-1',
          name: '李四',
          nameEn: 'Leo Li',
        },
        {
          id: 'emp-2',
          name: '王五',
          nameEn: 'Amy Chen',
        },
      ],
    };

    const html = await generateInspectionPdfHtml(inspection, 'en');

    expect(html).toContain('Cleaning Inspection Report');
    expect(html).toContain('Company Information');
    expect(html).toContain('info@sparkery.com.au');
    expect(html).toContain('Leo Li / Amy Chen');
    expect(html).toContain('Kitchen');
    expect(html).toContain('No grease stains on stove');
    expect(html).toContain('Key Return');
    expect(/[\u3400-\u9FFF\uF900-\uFAFF]/u.test(html)).toBe(false);
  });

  it('generates English filename with date and property abbreviation', () => {
    const inspection: CleaningInspection = {
      id: 'insp-file-001',
      propertyId: 'Unit 3803 Brisbane City',
      propertyAddress: '8 Margaret St, Brisbane',
      checkOutDate: '2026-02-22',
      submittedAt: '',
      sections: [],
      submitterName: 'Tester',
      status: 'pending',
      templateName: undefined,
      checkIn: null,
      checkOut: null,
      damageReports: [],
    };

    const filename = generateInspectionFilename(inspection);
    expect(filename).toBe('Sparkery_Cleaning_Report_20260222_U3BC.pdf');
    expect(/[\u3400-\u9FFF\uF900-\uFAFF]/u.test(filename)).toBe(false);
  });
});
