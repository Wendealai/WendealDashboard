/**
 * Cleaning Inspection Wizard - Shared Type Definitions
 * Used by wizard steps, admin panel, and PDF template
 */

import type { UploadFile } from 'antd/es/upload/interface';

// ──────────────────────── Checklist ────────────────────────────

/** A single checklist item within a room section */
export interface ChecklistItem {
  id: string;
  /** Display label (Chinese primary) */
  label: string;
  /** English label (optional, used when language is set to English) */
  labelEn?: string;
  checked: boolean;
  /** If true, the cleaner MUST attach a photo before checking this item */
  requiredPhoto: boolean;
  /** Base64 data URL of the evidence photo (if requiredPhoto or voluntarily added) */
  photo?: string;
}

// ──────────────────────── Reference Images ──────────────────────

/** Admin-uploaded reference image showing the "correct" standard */
export interface ReferenceImage {
  image: string;
  description?: string;
}

// ──────────────────────── Room Section ──────────────────────────

/** A room / area section within the inspection */
export interface RoomSection {
  id: string;
  name: string;
  description: string;
  referenceImages: ReferenceImage[];
  photos: UploadFile[];
  notes: string;
  /** Structured checklist for this room */
  checklist: ChecklistItem[];
}

// ──────────────────────── Damage Report ─────────────────────────

/** Pre-clean damage documentation */
export interface DamageReport {
  id: string;
  /** Free-text description of the damage */
  description: string;
  /** Base64 photo with GPS+time watermark */
  photo: string;
  /** Where the damage was found, e.g. "Living Room - carpet" */
  location: string;
  /** ISO timestamp when the damage was documented */
  timestamp: string;
}

// ──────────────────────── Check-in / Check-out ──────────────────

/** GPS + timestamp + optional photo for check-in or check-out */
export interface CheckInOut {
  timestamp: string;
  gpsLat: number | null;
  gpsLng: number | null;
  /** Reverse-geocoded or manually entered address */
  gpsAddress: string;
  /** Lock / key photo (mainly for check-out) */
  photo?: string;
  /** Key return method: "lockbox" | "agent" | "under_mat" | "other" */
  keyReturnMethod?: string;
}

// ──────────────────────── Employee ─────────────────────────────

/** Employee / cleaner profile managed in admin panel */
export interface Employee {
  id: string;
  /** Chinese name */
  name: string;
  /** English name (optional) */
  nameEn?: string;
  /** Phone number */
  phone?: string;
  /** Notes / remarks */
  notes?: string;
}

// ──────────────────────── Main Inspection ───────────────────────

export type InspectionStatus = 'pending' | 'in_progress' | 'submitted';

/** Complete inspection record */
export interface CleaningInspection {
  id: string;
  propertyId: string;
  propertyAddress: string;
  /** Notes / remarks for cleaner — English version (key pickup, alarm codes, access instructions, etc.) */
  propertyNotes?: string;
  /** Notes / remarks for cleaner — Chinese version */
  propertyNotesZh?: string;
  /** Images attached to property notes (base64 data URLs) for location guidance */
  propertyNoteImages?: string[];
  checkOutDate: string;
  submittedAt: Date | string;
  sections: RoomSection[];
  submitterName: string | undefined;
  status: InspectionStatus;
  templateName: string | undefined;
  /** Check-in data (GPS + timestamp) */
  checkIn: CheckInOut | null;
  /** Check-out data (GPS + timestamp + key return) */
  checkOut: CheckInOut | null;
  /** Pre-clean damage reports */
  damageReports: DamageReport[];
  /** Assigned employee/cleaner (pre-filled from admin) */
  assignedEmployee?: Employee;
}

// ──────────────────────── Property Template ─────────────────────

/** Admin-defined property template */
export interface PropertyTemplate {
  id: string;
  name: string;
  address: string;
  /** Notes / remarks for cleaner — English version (key pickup, alarm codes, access instructions, etc.) */
  notes?: string;
  /** Notes / remarks for cleaner — Chinese version */
  notesZh?: string;
  /** Images attached to notes (base64 data URLs) for location guidance (e.g. key pickup, mail room) */
  noteImages?: string[];
  /** IDs of active sections for this property */
  sections: string[];
  /** Reference images keyed by section ID */
  referenceImages: Record<string, ReferenceImage[]>;
  /** Checklist templates keyed by section ID */
  checklists?: Record<string, Omit<ChecklistItem, 'checked' | 'photo'>[]>;
}

// ──────────────────────── Section Definitions ───────────────────

export interface SectionDefinition {
  id: string;
  name: string;
  description: string;
}

/** Base room sections (always included) - Chinese primary */
export const BASE_ROOM_SECTIONS: SectionDefinition[] = [
  {
    id: 'kitchen',
    name: '厨房 Kitchen',
    description: '厨房清洁：灶台、水槽、台面、橱柜、地板',
  },
  {
    id: 'living-room',
    name: '客厅 Living Room',
    description: '客厅清洁：沙发、茶几、地板、窗户',
  },
  {
    id: 'bedroom-1',
    name: '卧室1 Bedroom 1',
    description: '主卧：床铺、床单、床头柜、地板、衣柜',
  },
  {
    id: 'bathroom-1',
    name: '卫生间1 Bathroom 1',
    description: '主卫：马桶、淋浴、洗手台、镜子、地板',
  },
  {
    id: 'balcony',
    name: '阳台 Balcony',
    description: '阳台：地板、栏杆、户外家具',
  },
];

/** Optional sections that can be added per property - Chinese primary */
export const OPTIONAL_SECTIONS: SectionDefinition[] = [
  { id: 'bedroom-2', name: '卧室2 Bedroom 2', description: '第二卧室' },
  { id: 'bathroom-2', name: '卫生间2 Bathroom 2', description: '第二卫生间' },
  { id: 'bedroom-3', name: '卧室3 Bedroom 3', description: '第三卧室' },
  { id: 'bathroom-3', name: '卫生间3 Bathroom 3', description: '第三卫生间' },
  { id: 'toilet', name: '独立厕所 Toilet', description: '独立厕所' },
  { id: 'laundry', name: '洗衣房 Laundry', description: '洗衣房' },
  { id: 'garage', name: '车库 Garage', description: '车库' },
  { id: 'garden', name: '花园 Garden', description: '花园/户外区域' },
];

/** Get active sections from IDs list */
export function getActiveSections(
  activeSectionIds: string[]
): SectionDefinition[] {
  const activeIds = new Set(activeSectionIds);
  return BASE_ROOM_SECTIONS.filter(s => activeIds.has(s.id)).concat(
    OPTIONAL_SECTIONS.filter(s => activeIds.has(s.id))
  );
}

// ──────────────────────── Default Checklists ────────────────────

/** Default checklist item templates keyed by section ID (Chinese label + English labelEn) */
export const DEFAULT_CHECKLISTS: Record<
  string,
  Omit<ChecklistItem, 'id' | 'checked' | 'photo'>[]
> = {
  kitchen: [
    {
      label: '煤气灶/灶台无油渍',
      labelEn: 'No grease stains on stove',
      requiredPhoto: true,
    },
    {
      label: '烤箱内部清洁，无积碳',
      labelEn: 'Oven clean, no carbon buildup',
      requiredPhoto: true,
    },
    {
      label: '水槽清洁，无水渍',
      labelEn: 'Sink clean, no water stains',
      requiredPhoto: false,
    },
    {
      label: '水壶倒空并归位',
      labelEn: 'Kettle emptied and placed back',
      requiredPhoto: false,
    },
    {
      label: '洗碗机清洁并擦干',
      labelEn: 'Dishwasher cleaned and dried',
      requiredPhoto: true,
    },
    {
      label: '冰箱内部清洁',
      labelEn: 'Fridge interior clean',
      requiredPhoto: true,
    },
    {
      label: '微波炉内部清洁',
      labelEn: 'Microwave interior clean',
      requiredPhoto: true,
    },
    {
      label: '台面擦拭干净',
      labelEn: 'Countertops wiped down',
      requiredPhoto: false,
    },
    {
      label: '地板拖干净',
      labelEn: 'Floor mopped and clean',
      requiredPhoto: false,
    },
  ],
  'living-room': [
    {
      label: '沙发靠垫整齐摆放',
      labelEn: 'Sofa cushions arranged',
      requiredPhoto: false,
    },
    {
      label: '茶几擦拭干净',
      labelEn: 'Coffee table wiped down',
      requiredPhoto: false,
    },
    {
      label: '地板吸尘/拖干净',
      labelEn: 'Floor vacuumed/mopped',
      requiredPhoto: false,
    },
    {
      label: '窗户和玻璃干净',
      labelEn: 'Windows and glass clean',
      requiredPhoto: false,
    },
    { label: '电视屏幕擦拭', labelEn: 'TV screen wiped', requiredPhoto: false },
  ],
  'bedroom-1': [
    {
      label: '床单更换/铺好',
      labelEn: 'Bed linen changed/made',
      requiredPhoto: false,
    },
    {
      label: '衣柜内部擦拭',
      labelEn: 'Wardrobe interior wiped',
      requiredPhoto: false,
    },
    { label: '地板吸尘', labelEn: 'Floor vacuumed', requiredPhoto: false },
    { label: '窗户擦拭', labelEn: 'Windows wiped', requiredPhoto: false },
    {
      label: '窗帘/百叶窗无灰尘',
      labelEn: 'Curtains/blinds dust-free',
      requiredPhoto: false,
    },
  ],
  'bedroom-2': [
    {
      label: '床单更换/铺好',
      labelEn: 'Bed linen changed/made',
      requiredPhoto: false,
    },
    {
      label: '衣柜内部擦拭',
      labelEn: 'Wardrobe interior wiped',
      requiredPhoto: false,
    },
    { label: '地板吸尘', labelEn: 'Floor vacuumed', requiredPhoto: false },
  ],
  'bedroom-3': [
    {
      label: '床单更换/铺好',
      labelEn: 'Bed linen changed/made',
      requiredPhoto: false,
    },
    {
      label: '衣柜内部擦拭',
      labelEn: 'Wardrobe interior wiped',
      requiredPhoto: false,
    },
    { label: '地板吸尘', labelEn: 'Floor vacuumed', requiredPhoto: false },
  ],
  'bathroom-1': [
    {
      label: '马桶内外清洁',
      labelEn: 'Toilet interior and exterior clean',
      requiredPhoto: true,
    },
    {
      label: '淋浴玻璃无水渍',
      labelEn: 'Shower glass no water marks',
      requiredPhoto: true,
    },
    {
      label: '洗手台和镜子清洁',
      labelEn: 'Sink and mirror clean',
      requiredPhoto: false,
    },
    { label: '地板拖干净', labelEn: 'Floor mopped', requiredPhoto: false },
    {
      label: '排水口通畅清洁',
      labelEn: 'Drain clear and clean',
      requiredPhoto: false,
    },
    { label: '毛巾架擦拭', labelEn: 'Towel rack wiped', requiredPhoto: false },
  ],
  'bathroom-2': [
    {
      label: '马桶内外清洁',
      labelEn: 'Toilet interior and exterior clean',
      requiredPhoto: true,
    },
    {
      label: '淋浴玻璃无水渍',
      labelEn: 'Shower glass no water marks',
      requiredPhoto: true,
    },
    {
      label: '洗手台和镜子清洁',
      labelEn: 'Sink and mirror clean',
      requiredPhoto: false,
    },
    { label: '地板拖干净', labelEn: 'Floor mopped', requiredPhoto: false },
  ],
  'bathroom-3': [
    {
      label: '马桶内外清洁',
      labelEn: 'Toilet interior and exterior clean',
      requiredPhoto: true,
    },
    {
      label: '淋浴/浴缸清洁',
      labelEn: 'Shower/bath clean',
      requiredPhoto: false,
    },
    { label: '地板拖干净', labelEn: 'Floor mopped', requiredPhoto: false },
  ],
  toilet: [
    {
      label: '马桶内外清洁',
      labelEn: 'Toilet interior and exterior clean',
      requiredPhoto: true,
    },
    { label: '地板拖干净', labelEn: 'Floor mopped', requiredPhoto: false },
    { label: '洗手台清洁', labelEn: 'Sink clean', requiredPhoto: false },
  ],
  balcony: [
    { label: '地板扫干净', labelEn: 'Floor swept', requiredPhoto: false },
    { label: '栏杆擦拭', labelEn: 'Railings wiped', requiredPhoto: false },
    {
      label: '户外家具清洁',
      labelEn: 'Outdoor furniture cleaned',
      requiredPhoto: false,
    },
  ],
  laundry: [
    {
      label: '洗衣机清洁并擦干',
      labelEn: 'Washing machine cleaned',
      requiredPhoto: false,
    },
    {
      label: '烘干机滤网清理',
      labelEn: 'Dryer lint filter cleared',
      requiredPhoto: false,
    },
    { label: '洗手台清洁', labelEn: 'Sink clean', requiredPhoto: false },
    { label: '地板拖干净', labelEn: 'Floor mopped', requiredPhoto: false },
  ],
  garage: [
    { label: '地板扫干净', labelEn: 'Floor swept', requiredPhoto: false },
    { label: '架子擦拭', labelEn: 'Shelves wiped', requiredPhoto: false },
  ],
  garden: [
    {
      label: '户外区域整洁',
      labelEn: 'Outdoor area tidy',
      requiredPhoto: false,
    },
    { label: '垃圾桶清空', labelEn: 'Bins emptied', requiredPhoto: false },
  ],
};

/**
 * Get default checklist items for a section, creating proper IDs
 */
export function getDefaultChecklistForSection(
  sectionId: string
): ChecklistItem[] {
  const templates = DEFAULT_CHECKLISTS[sectionId] || [];
  return templates.map((t, idx) => {
    const item: ChecklistItem = {
      id: `${sectionId}-item-${idx}`,
      label: t.label,
      checked: false,
      requiredPhoto: t.requiredPhoto,
    };
    if (t.labelEn) item.labelEn = t.labelEn;
    return item;
  });
}

// ──────────────────────── Checklist Label Migration ─────────────

/**
 * Build a lookup map to migrate old-format checklist labels.
 * Maps various old formats (English-only, bilingual "中文 (English)") → { label, labelEn }.
 * Built from DEFAULT_CHECKLISTS so it stays in sync automatically.
 */
/** Legacy English labels from older default checklists → current section+index mapping */
const LEGACY_ENGLISH_LABELS: Record<
  string,
  { label: string; labelEn: string }
> = {
  'gas stove / cooktop has no grease stains': {
    label: '煤气灶/灶台无油渍',
    labelEn: 'No grease stains on stove',
  },
  'oven interior clean, no carbon buildup': {
    label: '烤箱内部清洁，无积碳',
    labelEn: 'Oven clean, no carbon buildup',
  },
  'sink clean, no water stains': {
    label: '水槽清洁，无水渍',
    labelEn: 'Sink clean, no water stains',
  },
  'kettle emptied and placed back': {
    label: '水壶倒空并归位',
    labelEn: 'Kettle emptied and placed back',
  },
  'dishwasher cleaned and dried': {
    label: '洗碗机清洁并擦干',
    labelEn: 'Dishwasher cleaned and dried',
  },
  'fridge interior clean': {
    label: '冰箱内部清洁',
    labelEn: 'Fridge interior clean',
  },
  'microwave interior clean': {
    label: '微波炉内部清洁',
    labelEn: 'Microwave interior clean',
  },
  'countertops wiped down': {
    label: '台面擦拭干净',
    labelEn: 'Countertops wiped down',
  },
  'floor mopped and clean': {
    label: '地板拖干净',
    labelEn: 'Floor mopped and clean',
  },
  'sofa cushions neatly arranged': {
    label: '沙发靠垫整齐摆放',
    labelEn: 'Sofa cushions arranged',
  },
  'coffee table wiped down': {
    label: '茶几擦拭干净',
    labelEn: 'Coffee table wiped down',
  },
  'floor vacuumed / mopped': {
    label: '地板吸尘/拖干净',
    labelEn: 'Floor vacuumed/mopped',
  },
  'windows and glass clean': {
    label: '窗户和玻璃干净',
    labelEn: 'Windows and glass clean',
  },
  'tv screen wiped': { label: '电视屏幕擦拭', labelEn: 'TV screen wiped' },
  'bed linen changed / made': {
    label: '床单更换/铺好',
    labelEn: 'Bed linen changed/made',
  },
  'wardrobe interior wiped': {
    label: '衣柜内部擦拭',
    labelEn: 'Wardrobe interior wiped',
  },
  'floor vacuumed': { label: '地板吸尘', labelEn: 'Floor vacuumed' },
  'windows wiped': { label: '窗户擦拭', labelEn: 'Windows wiped' },
  'curtains / blinds dust-free': {
    label: '窗帘/百叶窗无灰尘',
    labelEn: 'Curtains/blinds dust-free',
  },
  'toilet interior and exterior clean': {
    label: '马桶内外清洁',
    labelEn: 'Toilet interior and exterior clean',
  },
  'shower glass no water marks': {
    label: '淋浴玻璃无水渍',
    labelEn: 'Shower glass no water marks',
  },
  'sink and mirror clean': {
    label: '洗手台和镜子清洁',
    labelEn: 'Sink and mirror clean',
  },
  'floor mopped': { label: '地板拖干净', labelEn: 'Floor mopped' },
  'drain clear and clean': {
    label: '排水口通畅清洁',
    labelEn: 'Drain clear and clean',
  },
  'towel rack wiped': { label: '毛巾架擦拭', labelEn: 'Towel rack wiped' },
  'shower / bath clean': {
    label: '淋浴/浴缸清洁',
    labelEn: 'Shower/bath clean',
  },
  'sink clean': { label: '洗手台清洁', labelEn: 'Sink clean' },
  'floor swept': { label: '地板扫干净', labelEn: 'Floor swept' },
  'railings wiped': { label: '栏杆擦拭', labelEn: 'Railings wiped' },
  'outdoor furniture wiped': {
    label: '户外家具擦拭',
    labelEn: 'Outdoor furniture wiped',
  },
  'washing machine cleaned': {
    label: '洗衣机清洁并擦干',
    labelEn: 'Washing machine cleaned',
  },
  'dryer lint filter cleared': {
    label: '烘干机滤网清理',
    labelEn: 'Dryer lint filter cleared',
  },
  'shelves wiped': { label: '架子擦拭', labelEn: 'Shelves wiped' },
  'outdoor area tidy': { label: '户外区域整洁', labelEn: 'Outdoor area tidy' },
  'bins emptied': { label: '垃圾桶清空', labelEn: 'Bins emptied' },
  'bed linen changed/made': {
    label: '床单更换/铺好',
    labelEn: 'Bed linen changed/made',
  },
  'curtains/blinds dust-free': {
    label: '窗帘/百叶窗无灰尘',
    labelEn: 'Curtains/blinds dust-free',
  },
  'floor vacuumed/mopped': {
    label: '地板吸尘/拖干净',
    labelEn: 'Floor vacuumed/mopped',
  },
  'shower/bath clean': { label: '淋浴/浴缸清洁', labelEn: 'Shower/bath clean' },
};

function buildLabelLookup(): Map<string, { label: string; labelEn: string }> {
  const map = new Map<string, { label: string; labelEn: string }>();

  // Add legacy English labels first (lower priority, overridden by defaults)
  for (const [key, pair] of Object.entries(LEGACY_ENGLISH_LABELS)) {
    map.set(key.toLowerCase(), pair);
  }

  // Add from DEFAULT_CHECKLISTS (higher priority)
  for (const items of Object.values(DEFAULT_CHECKLISTS)) {
    for (const item of items) {
      const zh = item.label;
      const en = item.labelEn || '';
      if (!en) continue;
      const pair = { label: zh, labelEn: en };
      // Key by English (lowercased)
      map.set(en.toLowerCase(), pair);
      // Key by old bilingual format: "中文 (English)"
      map.set(`${zh} (${en})`.toLowerCase(), pair);
      // Key by Chinese
      map.set(zh, pair);
    }
  }
  return map;
}

const _labelLookup = buildLabelLookup();

/**
 * Migrate a single checklist item's labels from old format to new { label (zh), labelEn }.
 * Handles:
 *  - Old bilingual: "煤气灶/灶台无油渍 (No grease stains on stove)" → split
 *  - Pure English (from old templates): "No grease stains on stove" → lookup Chinese
 *  - Already correct (has labelEn): no change
 */
export function migrateChecklistItemLabel(item: any): any {
  const label: string = item.label || '';
  if (!label) return item; // No label to migrate

  // Already has labelEn → already migrated
  if (item.labelEn) return item;

  const label: string = item.label || '';

  // Try bilingual pattern: "中文内容
  const bilingualMatch = label.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (bilingualMatch && bilingualMatch[1] && bilingualMatch[2]) {
    const zh = bilingualMatch[1].trim();
    const en = bilingualMatch[2].trim();
    return { ...item, label: zh, labelEn: en };
  }

  // Try exact lookup (case-insensitive for English labels)
  const lookupKey = label.toLowerCase();
  const found = _labelLookup.get(lookupKey) || _labelLookup.get(label);
  if (found) {
    return { ...item, label: found.label, labelEn: found.labelEn };
  }

  // Check if label has Chinese characters → it's already Chinese, just missing labelEn
  if (/[\u4e00-\u9fff]/.test(label)) {
    return item; // Keep as-is, no English version available
  }

  // Pure English label not found in lookup → keep as label, duplicate as labelEn
  return { ...item, labelEn: label };
}

/**
 * Migrate all checklist items in an inspection's sections.
 * Call this when loading old inspection data.
 */
export function migrateInspectionChecklists(inspection: any): any {
  if (!inspection?.sections) return inspection;
  const migrated = { ...inspection };
  migrated.sections = migrated.sections.map((section: any) => {
    if (!section.checklist) return section;
    return {
      ...section,
      checklist: section.checklist.map(migrateChecklistItemLabel),
    };
  });
  return migrated;
}

/**
 * Migrate property template checklists to new format.
 * Call this when loading property templates from localStorage.
 */
export function migratePropertyChecklists(property: any): any {
  if (!property?.checklists) return property;
  const migrated = { ...property };
  const newChecklists: Record<string, any[]> = {};
  for (const [sectionId, items] of Object.entries(migrated.checklists)) {
    if (Array.isArray(items)) {
      newChecklists[sectionId] = items.map(migrateChecklistItemLabel);
    }
  }
  migrated.checklists = newChecklists;
  return migrated;
}

// ──────────────────────── Key Return Methods ────────────────────

export const KEY_RETURN_METHODS = [
  { value: 'lockbox', label: 'Lockbox' },
  { value: 'agent', label: 'Hand to Agent / Owner' },
  { value: 'under_mat', label: 'Under Door Mat' },
  { value: 'letterbox', label: 'Letterbox' },
  { value: 'other', label: 'Other' },
];

// ──────────────────────── Helpers ───────────────────────────────

/** Generate unique ID with prefix */
export function generateId(prefix = 'insp'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${ts}-${rand}`;
}
