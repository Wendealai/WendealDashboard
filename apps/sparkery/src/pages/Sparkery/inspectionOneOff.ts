import {
  DEFAULT_CHECKLISTS,
  getSectionTypeId,
  type RoomSection,
} from '@/pages/CleaningInspection/types';

export type OneOffCleaningType =
  | 'bond_clean'
  | 'routine_clean'
  | 'deep_clean'
  | 'office_clean'
  | 'airbnb_turnover';

export type OneOffPropertyType =
  | 'studio'
  | 'apartment_1b1b'
  | 'apartment_2b2b'
  | 'apartment_3b2b'
  | 'house_4b2b'
  | 'office_small'
  | 'office_large';

export type ChecklistTemplateDraftItem = {
  label: string;
  labelEn?: string;
  requiredPhoto: boolean;
};

export type OneOffChecklistDraftMap = Record<
  string,
  ChecklistTemplateDraftItem[]
>;

export interface OneOffTemplateSnapshot {
  version: 1;
  generatedAt: string;
  sectionIds: string[];
  checklists: OneOffChecklistDraftMap;
}

export type LegacyOneOffTemplateSnapshot = Partial<OneOffTemplateSnapshot> & {
  checklistMap?: OneOffChecklistDraftMap;
};

export interface OneOffQualityIssue {
  code:
    | 'min_sections'
    | 'min_total_checklist'
    | 'missing_kitchen'
    | 'missing_bathroom'
    | 'missing_living_room'
    | 'missing_required_photo';
  message: string;
}

export interface OneOffQualityReport {
  valid: boolean;
  totalSections: number;
  totalChecklistItems: number;
  requiredPhotoItems: number;
  issues: OneOffQualityIssue[];
}

export interface OneOffDriftSummary {
  sectionsAdded: number;
  sectionsRemoved: number;
  checklistItemsAdded: number;
  checklistItemsRemoved: number;
  labelsChanged: number;
  photoRequirementChanged: number;
  driftScore: number;
}

export interface OneOffGovernancePolicy {
  maxSections: number;
  maxChecklistItemsPerSection: number;
  maxTotalChecklistItems: number;
  maxPayloadBytes: number;
  maxPropertyNoteImages: number;
  draftTtlMs: number;
  memoryTtlMs: number;
}

export const DEFAULT_ONE_OFF_GOVERNANCE_POLICY: OneOffGovernancePolicy = {
  maxSections: 18,
  maxChecklistItemsPerSection: 40,
  maxTotalChecklistItems: 320,
  maxPayloadBytes: 180_000,
  maxPropertyNoteImages: 12,
  draftTtlMs: 7 * 24 * 60 * 60 * 1000,
  memoryTtlMs: 45 * 24 * 60 * 60 * 1000,
};

export type OneOffSectionBundleId =
  | 'kitchen_deep_clean_pack'
  | 'move_out_pack'
  | 'office_hygiene_pack';

export interface OneOffSectionBundle {
  id: OneOffSectionBundleId;
  label: string;
  description: string;
  sectionIds: string[];
}

export const ONE_OFF_SECTION_BUNDLES: OneOffSectionBundle[] = [
  {
    id: 'kitchen_deep_clean_pack',
    label: 'Kitchen Deep-clean Pack',
    description: 'Kitchen-heavy ad-hoc jobs with pantry/laundry support',
    sectionIds: ['kitchen', 'pantry', 'laundry'],
  },
  {
    id: 'move_out_pack',
    label: 'Move-out Pack',
    description: 'Bond-style handover checklist baseline',
    sectionIds: [
      'kitchen',
      'living-room',
      'bedroom-1',
      'bathroom-1',
      'laundry',
      'toilet',
      'balcony',
    ],
  },
  {
    id: 'office_hygiene_pack',
    label: 'Office Hygiene Pack',
    description: 'Workplace hygiene and compliance focused baseline',
    sectionIds: [
      'meeting-room',
      'office-area-1',
      'pantry',
      'restroom',
      'print-area',
    ],
  },
];

const NUMBERED_SECTION_TYPE_RE = /^(.*?)-([1-9]\d*)$/;

const dedupeSectionIds = (sectionIds: string[]): string[] =>
  Array.from(new Set(sectionIds.filter(Boolean)));

export const getOneOffSectionFamilyId = (sectionId: string): string => {
  const normalizedTypeId = getSectionTypeId(sectionId);
  const numberedMatch = normalizedTypeId.match(NUMBERED_SECTION_TYPE_RE);
  if (numberedMatch && numberedMatch[1]) {
    return numberedMatch[1];
  }
  return normalizedTypeId;
};

const sanitizeChecklistLabel = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const normalizeChecklistItems = (
  items: ChecklistTemplateDraftItem[]
): ChecklistTemplateDraftItem[] =>
  items
    .map(item => ({
      label: sanitizeChecklistLabel(item.label),
      ...(sanitizeChecklistLabel(item.labelEn)
        ? { labelEn: sanitizeChecklistLabel(item.labelEn) }
        : {}),
      requiredPhoto: Boolean(item.requiredPhoto),
    }))
    .filter(item => item.label.length > 0 || (item.labelEn || '').length > 0);

export const buildOneOffChecklistDraftForSection = (
  sectionId: string
): ChecklistTemplateDraftItem[] => {
  const defaults = DEFAULT_CHECKLISTS[getSectionTypeId(sectionId)] || [];
  return defaults.map(item => ({
    label: item.label,
    ...(item.labelEn ? { labelEn: item.labelEn } : {}),
    requiredPhoto: item.requiredPhoto,
  }));
};

export const buildOneOffChecklistDraftMap = (
  sectionIds: string[]
): OneOffChecklistDraftMap => {
  const result: OneOffChecklistDraftMap = {};
  sectionIds.forEach(sectionId => {
    result[sectionId] = buildOneOffChecklistDraftForSection(sectionId);
  });
  return result;
};

export const buildOneOffSectionPreset = (
  cleaningType?: OneOffCleaningType,
  propertyType?: OneOffPropertyType
): string[] => {
  const residentialBaseline = [
    'kitchen',
    'living-room',
    'bedroom-1',
    'bathroom-1',
    'balcony',
  ];
  const propertyTypeSections: Partial<Record<OneOffPropertyType, string[]>> = {
    studio: ['kitchen', 'living-room', 'bedroom-1', 'bathroom-1'],
    apartment_1b1b: ['kitchen', 'living-room', 'bedroom-1', 'bathroom-1'],
    apartment_2b2b: [
      'kitchen',
      'living-room',
      'bedroom-1',
      'bedroom-2',
      'bathroom-1',
      'bathroom-2',
      'balcony',
      'laundry',
    ],
    apartment_3b2b: [
      'kitchen',
      'living-room',
      'bedroom-1',
      'bedroom-2',
      'bedroom-3',
      'bathroom-1',
      'bathroom-2',
      'balcony',
      'laundry',
    ],
    house_4b2b: [
      'kitchen',
      'living-room',
      'bedroom-1',
      'bedroom-2',
      'bedroom-3',
      'bathroom-1',
      'bathroom-2',
      'toilet',
      'laundry',
      'garage',
      'garden',
    ],
    office_small: ['meeting-room', 'office-area-1', 'pantry', 'restroom'],
    office_large: [
      'meeting-room',
      'office-area-1',
      'office-area-2',
      'archive-room',
      'pantry',
      'restroom',
      'print-area',
    ],
  };
  const cleaningTypeSections: Partial<Record<OneOffCleaningType, string[]>> = {
    bond_clean: ['laundry', 'toilet'],
    routine_clean: [],
    deep_clean: ['laundry', 'garage', 'garden', 'toilet'],
    office_clean: [
      'meeting-room',
      'office-area-1',
      'office-area-2',
      'archive-room',
      'pantry',
      'restroom',
      'print-area',
    ],
    airbnb_turnover: ['laundry', 'toilet', 'balcony'],
  };

  const isOfficePreset =
    cleaningType === 'office_clean' ||
    propertyType === 'office_small' ||
    propertyType === 'office_large';
  const base =
    (propertyType && propertyTypeSections[propertyType]) ||
    (isOfficePreset ? propertyTypeSections.office_small : residentialBaseline);
  const merged = dedupeSectionIds([
    ...(base || residentialBaseline),
    ...((cleaningType && cleaningTypeSections[cleaningType]) || []),
  ]);

  if (merged.length === 0) {
    return [...residentialBaseline];
  }
  return merged;
};

export const applySectionBundleToSectionIds = (
  sectionIds: string[],
  bundleId: OneOffSectionBundleId
): string[] => {
  const bundle = ONE_OFF_SECTION_BUNDLES.find(item => item.id === bundleId);
  if (!bundle) {
    return sectionIds;
  }
  return dedupeSectionIds([...sectionIds, ...bundle.sectionIds]);
};

export const removeSectionBundleFromSectionIds = (
  sectionIds: string[],
  bundleId: OneOffSectionBundleId
): string[] => {
  const bundle = ONE_OFF_SECTION_BUNDLES.find(item => item.id === bundleId);
  if (!bundle) {
    return sectionIds;
  }
  const removeSet = new Set(
    bundle.sectionIds.map(item => getSectionTypeId(item))
  );
  return sectionIds.filter(
    sectionId => !removeSet.has(getSectionTypeId(sectionId))
  );
};

export const estimateOneOffPayloadBytes = (value: unknown): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

export const evaluateOneOffQuality = (
  sectionIds: string[],
  checklists: OneOffChecklistDraftMap
): OneOffQualityReport => {
  const issues: OneOffQualityIssue[] = [];
  const totalSections = sectionIds.length;
  let totalChecklistItems = 0;
  let requiredPhotoItems = 0;

  const familyItemCounts = new Map<string, number>();

  sectionIds.forEach(sectionId => {
    const familyId = getOneOffSectionFamilyId(sectionId);
    const items = normalizeChecklistItems(checklists[sectionId] || []);
    totalChecklistItems += items.length;
    requiredPhotoItems += items.filter(item => item.requiredPhoto).length;
    familyItemCounts.set(
      familyId,
      (familyItemCounts.get(familyId) || 0) + items.length
    );
  });

  if (totalSections < 3) {
    issues.push({
      code: 'min_sections',
      message: 'At least 3 sections are required for one-off inspections.',
    });
  }
  if (totalChecklistItems < 10) {
    issues.push({
      code: 'min_total_checklist',
      message: 'At least 10 checklist items are required before creating link.',
    });
  }

  if (
    !sectionIds.some(
      sectionId => getOneOffSectionFamilyId(sectionId) === 'kitchen'
    )
  ) {
    issues.push({
      code: 'missing_kitchen',
      message: 'Kitchen section is required for quality baseline.',
    });
  }
  if (
    !sectionIds.some(
      sectionId => getOneOffSectionFamilyId(sectionId) === 'bathroom'
    )
  ) {
    issues.push({
      code: 'missing_bathroom',
      message: 'Bathroom section is required for quality baseline.',
    });
  }
  if (
    !sectionIds.some(
      sectionId => getOneOffSectionFamilyId(sectionId) === 'living-room'
    )
  ) {
    issues.push({
      code: 'missing_living_room',
      message: 'Living room section is required for quality baseline.',
    });
  }
  if (requiredPhotoItems < 2) {
    issues.push({
      code: 'missing_required_photo',
      message: 'At least 2 checklist items must require evidence photo.',
    });
  }

  return {
    valid: issues.length === 0,
    totalSections,
    totalChecklistItems,
    requiredPhotoItems,
    issues,
  };
};

export const evaluateOneOffGovernance = (
  sectionIds: string[],
  checklists: OneOffChecklistDraftMap,
  policy: OneOffGovernancePolicy = DEFAULT_ONE_OFF_GOVERNANCE_POLICY
): {
  valid: boolean;
  payloadBytes: number;
  issues: string[];
} => {
  const issues: string[] = [];
  if (sectionIds.length > policy.maxSections) {
    issues.push(
      `Section count exceeds cap (${sectionIds.length}/${policy.maxSections}).`
    );
  }

  let totalChecklistItems = 0;
  sectionIds.forEach(sectionId => {
    const count = (checklists[sectionId] || []).length;
    totalChecklistItems += count;
    if (count > policy.maxChecklistItemsPerSection) {
      issues.push(
        `Section "${sectionId}" exceeds checklist cap (${count}/${policy.maxChecklistItemsPerSection}).`
      );
    }
  });
  if (totalChecklistItems > policy.maxTotalChecklistItems) {
    issues.push(
      `Total checklist items exceed cap (${totalChecklistItems}/${policy.maxTotalChecklistItems}).`
    );
  }

  const payloadBytes = estimateOneOffPayloadBytes({
    sectionIds,
    checklists,
  });
  if (payloadBytes > policy.maxPayloadBytes) {
    issues.push(
      `Template payload exceeds cap (${payloadBytes} bytes / ${policy.maxPayloadBytes} bytes).`
    );
  }

  return {
    valid: issues.length === 0,
    payloadBytes,
    issues,
  };
};

export const buildOneOffTemplateSnapshot = (
  sectionIds: string[],
  checklists: OneOffChecklistDraftMap
): OneOffTemplateSnapshot => {
  const normalized: OneOffChecklistDraftMap = {};
  sectionIds.forEach(sectionId => {
    normalized[sectionId] = normalizeChecklistItems(
      checklists[sectionId] || []
    );
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sectionIds: [...sectionIds],
    checklists: normalized,
  };
};

export const normalizeOneOffTemplateSnapshot = (
  input: LegacyOneOffTemplateSnapshot | null | undefined
): OneOffTemplateSnapshot => {
  const sectionIds = Array.isArray(input?.sectionIds)
    ? input!.sectionIds.filter(item => typeof item === 'string')
    : [];
  const sourceChecklists =
    (input?.checklists && typeof input.checklists === 'object'
      ? input.checklists
      : input?.checklistMap && typeof input.checklistMap === 'object'
        ? input.checklistMap
        : {}) || {};
  const checklists: OneOffChecklistDraftMap = {};
  sectionIds.forEach(sectionId => {
    const items = sourceChecklists[sectionId];
    checklists[sectionId] = Array.isArray(items)
      ? normalizeChecklistItems(items as ChecklistTemplateDraftItem[])
      : [];
  });

  return {
    version: 1,
    generatedAt:
      typeof input?.generatedAt === 'string'
        ? input.generatedAt
        : new Date().toISOString(),
    sectionIds,
    checklists,
  };
};

const readChecklistItemsFromSection = (
  section: RoomSection
): ChecklistTemplateDraftItem[] =>
  (section.checklist || []).map(item => ({
    label: sanitizeChecklistLabel(item.label),
    ...(sanitizeChecklistLabel(item.labelEn)
      ? { labelEn: sanitizeChecklistLabel(item.labelEn) }
      : {}),
    requiredPhoto: Boolean(item.requiredPhoto),
  }));

export const calculateOneOffTemplateDrift = (
  snapshot: OneOffTemplateSnapshot,
  finalSections: RoomSection[]
): OneOffDriftSummary => {
  const normalizedSnapshot = normalizeOneOffTemplateSnapshot(snapshot);
  const baselineSections = new Set(normalizedSnapshot.sectionIds);
  const currentSections = new Set(
    (finalSections || []).map(section => section.id)
  );

  const sectionsAdded = Array.from(currentSections).filter(
    sectionId => !baselineSections.has(sectionId)
  ).length;
  const sectionsRemoved = Array.from(baselineSections).filter(
    sectionId => !currentSections.has(sectionId)
  ).length;

  let checklistItemsAdded = 0;
  let checklistItemsRemoved = 0;
  let labelsChanged = 0;
  let photoRequirementChanged = 0;

  finalSections.forEach(section => {
    const baselineItems = normalizedSnapshot.checklists[section.id] || [];
    const finalItems = readChecklistItemsFromSection(section);
    const maxCount = Math.max(baselineItems.length, finalItems.length);
    for (let idx = 0; idx < maxCount; idx += 1) {
      const baseline = baselineItems[idx];
      const current = finalItems[idx];
      if (!baseline && current) {
        checklistItemsAdded += 1;
        continue;
      }
      if (baseline && !current) {
        checklistItemsRemoved += 1;
        continue;
      }
      if (!baseline || !current) {
        continue;
      }
      if (
        sanitizeChecklistLabel(baseline.label) !==
        sanitizeChecklistLabel(current.label)
      ) {
        labelsChanged += 1;
      }
      if (Boolean(baseline.requiredPhoto) !== Boolean(current.requiredPhoto)) {
        photoRequirementChanged += 1;
      }
    }
  });

  const driftScore =
    sectionsAdded * 3 +
    sectionsRemoved * 3 +
    checklistItemsAdded * 2 +
    checklistItemsRemoved * 2 +
    labelsChanged +
    photoRequirementChanged;

  return {
    sectionsAdded,
    sectionsRemoved,
    checklistItemsAdded,
    checklistItemsRemoved,
    labelsChanged,
    photoRequirementChanged,
    driftScore,
  };
};

export const buildOneOffScenarioTypeKey = (
  cleaningType?: OneOffCleaningType,
  propertyType?: OneOffPropertyType
): string => `${cleaningType || 'unknown'}::${propertyType || 'unknown'}`;
