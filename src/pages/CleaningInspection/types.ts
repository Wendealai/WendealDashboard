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

/** Default checklist item templates keyed by section ID prefix */
export const DEFAULT_CHECKLISTS: Record<
  string,
  Omit<ChecklistItem, 'id' | 'checked' | 'photo'>[]
> = {
  kitchen: [
    { label: 'Gas stove / cooktop has no grease stains', requiredPhoto: true },
    { label: 'Oven interior clean, no carbon buildup', requiredPhoto: true },
    { label: 'Sink clean, no water stains', requiredPhoto: false },
    { label: 'Kettle emptied and placed back', requiredPhoto: false },
    { label: 'Dishwasher cleaned and dried', requiredPhoto: true },
    { label: 'Fridge interior clean', requiredPhoto: true },
    { label: 'Microwave interior clean', requiredPhoto: true },
    { label: 'Countertops wiped down', requiredPhoto: false },
    { label: 'Floor mopped and clean', requiredPhoto: false },
  ],
  'living-room': [
    { label: 'Sofa cushions arranged neatly', requiredPhoto: false },
    { label: 'Coffee table wiped down', requiredPhoto: false },
    { label: 'Floor vacuumed / mopped', requiredPhoto: false },
    { label: 'Windows and glass clean', requiredPhoto: false },
    { label: 'TV screen wiped', requiredPhoto: false },
  ],
  'bedroom-1': [
    { label: 'Bed linen changed / made', requiredPhoto: false },
    { label: 'Wardrobe interior wiped', requiredPhoto: false },
    { label: 'Floor vacuumed', requiredPhoto: false },
    { label: 'Windows wiped', requiredPhoto: false },
    { label: 'Curtains / blinds dust-free', requiredPhoto: false },
  ],
  'bedroom-2': [
    { label: 'Bed linen changed / made', requiredPhoto: false },
    { label: 'Wardrobe interior wiped', requiredPhoto: false },
    { label: 'Floor vacuumed', requiredPhoto: false },
  ],
  'bedroom-3': [
    { label: 'Bed linen changed / made', requiredPhoto: false },
    { label: 'Wardrobe interior wiped', requiredPhoto: false },
    { label: 'Floor vacuumed', requiredPhoto: false },
  ],
  'bathroom-1': [
    { label: 'Toilet interior and exterior clean', requiredPhoto: true },
    { label: 'Shower glass has no water marks', requiredPhoto: true },
    { label: 'Sink and mirror clean', requiredPhoto: false },
    { label: 'Floor mopped', requiredPhoto: false },
    { label: 'Drain clear and clean', requiredPhoto: false },
    { label: 'Towel rack wiped', requiredPhoto: false },
  ],
  'bathroom-2': [
    { label: 'Toilet interior and exterior clean', requiredPhoto: true },
    { label: 'Shower glass has no water marks', requiredPhoto: true },
    { label: 'Sink and mirror clean', requiredPhoto: false },
    { label: 'Floor mopped', requiredPhoto: false },
  ],
  'bathroom-3': [
    { label: 'Toilet interior and exterior clean', requiredPhoto: true },
    { label: 'Shower / bath clean', requiredPhoto: false },
    { label: 'Floor mopped', requiredPhoto: false },
  ],
  toilet: [
    { label: 'Toilet interior and exterior clean', requiredPhoto: true },
    { label: 'Floor mopped', requiredPhoto: false },
    { label: 'Sink clean', requiredPhoto: false },
  ],
  balcony: [
    { label: 'Floor swept', requiredPhoto: false },
    { label: 'Railings wiped', requiredPhoto: false },
    { label: 'Outdoor furniture cleaned', requiredPhoto: false },
  ],
  laundry: [
    { label: 'Washing machine cleaned and dried', requiredPhoto: false },
    { label: 'Dryer lint filter cleared', requiredPhoto: false },
    { label: 'Sink clean', requiredPhoto: false },
    { label: 'Floor mopped', requiredPhoto: false },
  ],
  garage: [
    { label: 'Floor swept', requiredPhoto: false },
    { label: 'Shelves wiped', requiredPhoto: false },
  ],
  garden: [
    { label: 'Outdoor area tidy', requiredPhoto: false },
    { label: 'Bins emptied', requiredPhoto: false },
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
