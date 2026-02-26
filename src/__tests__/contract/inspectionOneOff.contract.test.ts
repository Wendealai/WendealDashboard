import type { RoomSection } from '@/pages/CleaningInspection/types';
import {
  buildOneOffChecklistDraftMap,
  buildOneOffSectionPreset,
  buildOneOffTemplateSnapshot,
  calculateOneOffTemplateDrift,
  evaluateOneOffGovernance,
  evaluateOneOffQuality,
  normalizeOneOffTemplateSnapshot,
} from '@/pages/Sparkery/inspectionOneOff';

describe('inspection one-off contract', () => {
  it('builds deterministic section baseline from cleaning/property matrix', () => {
    const baseline = buildOneOffSectionPreset('deep_clean', 'apartment_2b2b');
    expect(baseline).toEqual([
      'kitchen',
      'living-room',
      'bedroom-1',
      'bedroom-2',
      'bathroom-1',
      'bathroom-2',
      'balcony',
      'laundry',
      'garage',
      'garden',
      'toilet',
    ]);
  });

  it('keeps one-off snapshot schema stable', () => {
    const sectionIds = buildOneOffSectionPreset(
      'routine_clean',
      'apartment_1b1b'
    );
    const checklists = buildOneOffChecklistDraftMap(sectionIds);
    const snapshot = buildOneOffTemplateSnapshot(sectionIds, checklists);

    expect(snapshot.version).toBe(1);
    expect(Array.isArray(snapshot.sectionIds)).toBe(true);
    expect(typeof snapshot.generatedAt).toBe('string');
    expect(snapshot.checklists['kitchen']?.length).toBeGreaterThan(0);
  });

  it('supports legacy snapshot payload shape for backward compatibility', () => {
    const normalized = normalizeOneOffTemplateSnapshot({
      generatedAt: '2026-02-26T00:00:00.000Z',
      sectionIds: ['kitchen'],
      checklistMap: {
        kitchen: [{ label: 'clean sink', requiredPhoto: true }],
      },
    });

    expect(normalized.version).toBe(1);
    expect(normalized.sectionIds).toEqual(['kitchen']);
    expect(normalized.checklists.kitchen?.[0]?.label).toBe('clean sink');
  });

  it('enforces one-off quality guard before link creation', () => {
    const sectionIds = ['kitchen', 'living-room'];
    const checklists = {
      kitchen: [{ label: 'clean sink', requiredPhoto: false }],
      'living-room': [{ label: 'vacuum', requiredPhoto: false }],
    };
    const quality = evaluateOneOffQuality(sectionIds, checklists);

    expect(quality.valid).toBe(false);
    expect(
      quality.issues.some(issue => issue.code === 'missing_bathroom')
    ).toBe(true);
    expect(
      quality.issues.some(issue => issue.code === 'missing_required_photo')
    ).toBe(true);
  });

  it('enforces governance caps on large one-off payloads', () => {
    const sectionIds = Array.from(
      { length: 20 },
      (_unused, idx) => `section-${idx}`
    );
    const checklists: Record<
      string,
      Array<{ label: string; requiredPhoto: boolean }>
    > = {};
    sectionIds.forEach(sectionId => {
      checklists[sectionId] = Array.from({ length: 5 }, (_unused, idx) => ({
        label: `${sectionId}-${idx}`,
        requiredPhoto: false,
      }));
    });

    const governance = evaluateOneOffGovernance(sectionIds, checklists);
    expect(governance.valid).toBe(false);
    expect(
      governance.issues.some(issue =>
        issue.includes('Section count exceeds cap')
      )
    ).toBe(true);
  });

  it('detects drift between generated template and submitted checklist edits', () => {
    const sectionIds = ['kitchen', 'bathroom-1', 'living-room'];
    const checklists = {
      kitchen: [
        { label: 'clean sink', requiredPhoto: true },
        { label: 'clean oven', requiredPhoto: true },
      ],
      'bathroom-1': [{ label: 'clean mirror', requiredPhoto: true }],
      'living-room': [{ label: 'vacuum floor', requiredPhoto: false }],
    };
    const snapshot = buildOneOffTemplateSnapshot(sectionIds, checklists);
    const finalSections = [
      {
        id: 'kitchen',
        name: 'Kitchen',
        description: '',
        referenceImages: [],
        photos: [],
        notes: '',
        checklist: [
          {
            id: 'k-1',
            label: 'clean sink area',
            checked: true,
            requiredPhoto: true,
          },
          {
            id: 'k-2',
            label: 'clean oven',
            checked: true,
            requiredPhoto: false,
          },
        ],
      },
      {
        id: 'bathroom-1',
        name: 'Bathroom',
        description: '',
        referenceImages: [],
        photos: [],
        notes: '',
        checklist: [],
      },
      {
        id: 'balcony',
        name: 'Balcony',
        description: '',
        referenceImages: [],
        photos: [],
        notes: '',
        checklist: [],
      },
    ] as RoomSection[];

    const drift = calculateOneOffTemplateDrift(snapshot, finalSections);
    expect(drift.driftScore).toBeGreaterThan(0);
    expect(drift.sectionsAdded).toBe(1);
    expect(drift.sectionsRemoved).toBe(1);
    expect(drift.labelsChanged).toBeGreaterThan(0);
  });
});
