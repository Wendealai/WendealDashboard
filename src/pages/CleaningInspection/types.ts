/**
 * Cleaning Inspection Wizard - Shared Type Definitions
 * Used by wizard steps, admin panel, and PDF template
 */

import type { UploadFile } from 'antd/es/upload/interface';

// ──────────────────────── Checklist ────────────────────────────

/** A single checklist item within a room section */
export interface ChecklistItem {
  id: string;
  /** Display label, e.g. "Gas stove has no grease stains" */
  label: string;
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
  /** Notes / remarks for cleaner (key pickup, alarm codes, access instructions, etc.) */
  propertyNotes?: string;
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
  /** Notes / remarks for cleaner (key pickup, alarm codes, access instructions, etc.) */
  notes?: string;
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

/** Base room sections (always included) */
export const BASE_ROOM_SECTIONS: SectionDefinition[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Kitchen cleaning: countertops, stove, sink, cabinets, floor',
  },
  {
    id: 'living-room',
    name: 'Living Room',
    description: 'Living room: sofa, coffee table, floor, windows',
  },
  {
    id: 'bedroom-1',
    name: 'Bedroom 1',
    description: 'Master bedroom: bed, sheets, nightstands, floor, wardrobe',
  },
  {
    id: 'bathroom-1',
    name: 'Bathroom 1',
    description: 'Main bathroom: toilet, shower, sink, mirror, floor',
  },
  {
    id: 'balcony',
    name: 'Balcony',
    description: 'Balcony: floor, railings, outdoor furniture',
  },
];

/** Optional sections that can be added per property */
export const OPTIONAL_SECTIONS: SectionDefinition[] = [
  { id: 'bedroom-2', name: 'Bedroom 2', description: 'Second bedroom' },
  { id: 'bathroom-2', name: 'Bathroom 2', description: 'Second bathroom' },
  { id: 'bedroom-3', name: 'Bedroom 3', description: 'Third bedroom' },
  { id: 'bathroom-3', name: 'Bathroom 3', description: 'Third bathroom' },
  { id: 'toilet', name: 'Toilet', description: 'Separate toilet' },
  { id: 'laundry', name: 'Laundry', description: 'Laundry room' },
  { id: 'garage', name: 'Garage', description: 'Garage' },
  { id: 'garden', name: 'Garden', description: 'Garden' },
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

/** Default checklist item templates keyed by section ID prefix (bilingual: Chinese primary) */
export const DEFAULT_CHECKLISTS: Record<
  string,
  Omit<ChecklistItem, 'id' | 'checked' | 'photo'>[]
> = {
  kitchen: [
    {
      label: '煤气灶/灶台无油渍 (No grease stains on stove)',
      requiredPhoto: true,
    },
    {
      label: '烤箱内部清洁，无积碳 (Oven clean, no carbon)',
      requiredPhoto: true,
    },
    {
      label: '水槽清洁，无水渍 (Sink clean, no water stains)',
      requiredPhoto: false,
    },
    {
      label: '水壶倒空并归位 (Kettle emptied and placed back)',
      requiredPhoto: false,
    },
    {
      label: '洗碗机清洁并擦干 (Dishwasher cleaned and dried)',
      requiredPhoto: true,
    },
    { label: '冰箱内部清洁 (Fridge interior clean)', requiredPhoto: true },
    { label: '微波炉内部清洁 (Microwave interior clean)', requiredPhoto: true },
    { label: '台面擦拭干净 (Countertops wiped down)', requiredPhoto: false },
    { label: '地板拖干净 (Floor mopped and clean)', requiredPhoto: false },
  ],
  'living-room': [
    {
      label: '沙发靠垫整齐摆放 (Sofa cushions arranged)',
      requiredPhoto: false,
    },
    { label: '茶几擦拭干净 (Coffee table wiped down)', requiredPhoto: false },
    { label: '地板吸尘/拖干净 (Floor vacuumed/mopped)', requiredPhoto: false },
    { label: '窗户和玻璃干净 (Windows and glass clean)', requiredPhoto: false },
    { label: '电视屏幕擦拭 (TV screen wiped)', requiredPhoto: false },
  ],
  'bedroom-1': [
    { label: '床单更换/铺好 (Bed linen changed/made)', requiredPhoto: false },
    { label: '衣柜内部擦拭 (Wardrobe interior wiped)', requiredPhoto: false },
    { label: '地板吸尘 (Floor vacuumed)', requiredPhoto: false },
    { label: '窗户擦拭 (Windows wiped)', requiredPhoto: false },
    {
      label: '窗帘/百叶窗无灰尘 (Curtains/blinds dust-free)',
      requiredPhoto: false,
    },
  ],
  'bedroom-2': [
    { label: '床单更换/铺好 (Bed linen changed/made)', requiredPhoto: false },
    { label: '衣柜内部擦拭 (Wardrobe interior wiped)', requiredPhoto: false },
    { label: '地板吸尘 (Floor vacuumed)', requiredPhoto: false },
  ],
  'bedroom-3': [
    { label: '床单更换/铺好 (Bed linen changed/made)', requiredPhoto: false },
    { label: '衣柜内部擦拭 (Wardrobe interior wiped)', requiredPhoto: false },
    { label: '地板吸尘 (Floor vacuumed)', requiredPhoto: false },
  ],
  'bathroom-1': [
    {
      label: '马桶内外清洁 (Toilet interior and exterior clean)',
      requiredPhoto: true,
    },
    {
      label: '淋浴玻璃无水渍 (Shower glass no water marks)',
      requiredPhoto: true,
    },
    { label: '洗手台和镜子清洁 (Sink and mirror clean)', requiredPhoto: false },
    { label: '地板拖干净 (Floor mopped)', requiredPhoto: false },
    { label: '排水口通畅清洁 (Drain clear and clean)', requiredPhoto: false },
    { label: '毛巾架擦拭 (Towel rack wiped)', requiredPhoto: false },
  ],
  'bathroom-2': [
    {
      label: '马桶内外清洁 (Toilet interior and exterior clean)',
      requiredPhoto: true,
    },
    {
      label: '淋浴玻璃无水渍 (Shower glass no water marks)',
      requiredPhoto: true,
    },
    { label: '洗手台和镜子清洁 (Sink and mirror clean)', requiredPhoto: false },
    { label: '地板拖干净 (Floor mopped)', requiredPhoto: false },
  ],
  'bathroom-3': [
    {
      label: '马桶内外清洁 (Toilet interior and exterior clean)',
      requiredPhoto: true,
    },
    { label: '淋浴/浴缸清洁 (Shower/bath clean)', requiredPhoto: false },
    { label: '地板拖干净 (Floor mopped)', requiredPhoto: false },
  ],
  toilet: [
    {
      label: '马桶内外清洁 (Toilet interior and exterior clean)',
      requiredPhoto: true,
    },
    { label: '地板拖干净 (Floor mopped)', requiredPhoto: false },
    { label: '洗手台清洁 (Sink clean)', requiredPhoto: false },
  ],
  balcony: [
    { label: '地板扫干净 (Floor swept)', requiredPhoto: false },
    { label: '栏杆擦拭 (Railings wiped)', requiredPhoto: false },
    { label: '户外家具清洁 (Outdoor furniture cleaned)', requiredPhoto: false },
  ],
  laundry: [
    {
      label: '洗衣机清洁并擦干 (Washing machine cleaned)',
      requiredPhoto: false,
    },
    {
      label: '烘干机滤网清理 (Dryer lint filter cleared)',
      requiredPhoto: false,
    },
    { label: '洗手台清洁 (Sink clean)', requiredPhoto: false },
    { label: '地板拖干净 (Floor mopped)', requiredPhoto: false },
  ],
  garage: [
    { label: '地板扫干净 (Floor swept)', requiredPhoto: false },
    { label: '架子擦拭 (Shelves wiped)', requiredPhoto: false },
  ],
  garden: [
    { label: '户外区域整洁 (Outdoor area tidy)', requiredPhoto: false },
    { label: '垃圾桶清空 (Bins emptied)', requiredPhoto: false },
  ],
};

/**
 * Get default checklist items for a section, creating proper IDs
 */
export function getDefaultChecklistForSection(
  sectionId: string
): ChecklistItem[] {
  const templates = DEFAULT_CHECKLISTS[sectionId] || [];
  return templates.map((t, idx) => ({
    id: `${sectionId}-item-${idx}`,
    label: t.label,
    checked: false,
    requiredPhoto: t.requiredPhoto,
  }));
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
