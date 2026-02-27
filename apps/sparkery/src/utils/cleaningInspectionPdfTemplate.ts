/**
 * Cleaning Inspection PDF Template System
 *
 * Redesigned for clarity and readability:
 * - Clean black text on white background, green accents only for structure
 * - Cover page with property info + check-in/out + room overview
 * - Per-room checklist with associated photos immediately following
 * - One photo per page, maximized display (nearly full A4)
 * - Damage report photos also one per page
 * - Minimal headers to maximize photo area
 */

import dayjs from 'dayjs';
import type { UploadFile } from 'antd';
import type {
  CleaningInspection,
  RoomSection,
  DamageReport,
  CheckInOut,
  ChecklistItem,
  Employee,
} from '@/pages/CleaningInspection/types';
import { getSectionTypeId } from '@/pages/CleaningInspection/types';
import { reverseGeocode } from '@/pages/CleaningInspection/utils';

export type InspectionReportLang = 'zh' | 'en';
export type InspectionReportStylePreset = 'residential' | 'moveout' | 'office';
export type InspectionReportCoverVariant = 'clean' | 'business' | 'contrast';
export type InspectionReportDensity = 'standard' | 'compact';

export interface InspectionReportRenderOptions {
  preset?: InspectionReportStylePreset;
  coverVariant?: InspectionReportCoverVariant;
  density?: InspectionReportDensity;
  issueOnly?: boolean;
  includeSignoff?: boolean;
  clientLabel?: string;
  onlineReportUrl?: string;
  customerFriendlyLanguage?: boolean;
}

type InspectionTheme = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  badgePassBg: string;
  badgePassText: string;
};

type InspectionReportRenderConfig = {
  preset: InspectionReportStylePreset;
  coverVariant: InspectionReportCoverVariant;
  density: InspectionReportDensity;
  issueOnly: boolean;
  includeSignoff: boolean;
  clientLabel?: string;
  onlineReportUrl?: string;
  customerFriendlyLanguage: boolean;
};

type ReportPageMeta = {
  reportId: string;
  generatedAt: string;
};

const SECTION_NAME_EN_BY_ID: Record<string, string> = {
  kitchen: 'Kitchen',
  'living-room': 'Living Room',
  'bedroom-1': 'Bedroom 1',
  'bedroom-2': 'Bedroom 2',
  'bedroom-3': 'Bedroom 3',
  'bathroom-1': 'Bathroom 1',
  'bathroom-2': 'Bathroom 2',
  'bathroom-3': 'Bathroom 3',
  toilet: 'Toilet',
  laundry: 'Laundry',
  balcony: 'Balcony',
  garage: 'Garage',
  garden: 'Garden',
  'meeting-room': 'Meeting Room',
  'office-area-1': 'Office Area 1',
  'office-area-2': 'Office Area 2',
  'archive-room': 'Archive Room',
  pantry: 'Pantry',
  restroom: 'Restroom',
  'print-area': 'Print Area',
};

const KEY_RETURN_METHOD_EN_BY_VALUE: Record<string, string> = {
  lockbox: 'Lockbox',
  agent: 'Hand to Agent / Owner',
  under_mat: 'Under Door Mat',
  undermat: 'Under Door Mat',
  letterbox: 'Letterbox',
  other: 'Other',
};

const HAN_REGEX = /[\u3400-\u9fff\uf900-\ufaff]/g;
const NON_ASCII_REGEX = /[^\x00-\x7F]/g;

const SPARKERY_COMPANY_PROFILE = {
  name: 'Sparkery Cleaning Services',
  phone: '0478 540 915',
  email: 'info@sparkery.com.au',
  website: 'sparkery.com.au',
  serviceArea: 'Brisbane, QLD',
} as const;

function getInspectionTheme(
  preset: InspectionReportStylePreset
): InspectionTheme {
  switch (preset) {
    case 'moveout':
      return {
        accent: '#2563eb',
        accentDark: '#1e40af',
        accentSoft: '#eff6ff',
        badgePassBg: '#e8f5ff',
        badgePassText: '#1d4ed8',
      };
    case 'office':
      return {
        accent: '#0f766e',
        accentDark: '#134e4a',
        accentSoft: '#ecfeff',
        badgePassBg: '#e6fffb',
        badgePassText: '#0f766e',
      };
    case 'residential':
    default:
      return {
        accent: '#389e0d',
        accentDark: '#166534',
        accentSoft: '#f0fdf4',
        badgePassBg: '#f6ffed',
        badgePassText: '#389e0d',
      };
  }
}

function inferInspectionPreset(
  inspection: CleaningInspection
): InspectionReportStylePreset {
  const hint =
    `${inspection.templateName || ''} ${inspection.propertyNotes || ''}`.toLowerCase();
  if (
    hint.includes('move') ||
    hint.includes('bond') ||
    hint.includes('lease')
  ) {
    return 'moveout';
  }
  if (
    hint.includes('office') ||
    hint.includes('commercial') ||
    hint.includes('workspace')
  ) {
    return 'office';
  }
  return 'residential';
}

function inferCoverVariant(
  preset: InspectionReportStylePreset
): InspectionReportCoverVariant {
  if (preset === 'office') return 'business';
  if (preset === 'moveout') return 'contrast';
  return 'clean';
}

function resolveInspectionRenderConfig(
  inspection: CleaningInspection,
  options: InspectionReportRenderOptions
): InspectionReportRenderConfig {
  const preset = options.preset || inferInspectionPreset(inspection);
  const clientLabel = options.clientLabel?.trim();
  const onlineReportUrl = options.onlineReportUrl?.trim();
  return {
    preset,
    coverVariant: options.coverVariant || inferCoverVariant(preset),
    density: options.density || 'standard',
    issueOnly: Boolean(options.issueOnly),
    includeSignoff: Boolean(options.includeSignoff),
    customerFriendlyLanguage: options.customerFriendlyLanguage ?? true,
    ...(clientLabel ? { clientLabel } : {}),
    ...(onlineReportUrl ? { onlineReportUrl } : {}),
  };
}

function getChecklistIssueCount(section: RoomSection): number {
  return (section.checklist || []).filter(
    item => !item.checked || (item.requiredPhoto && !item.photo)
  ).length;
}

function hasChecklistIssue(section: RoomSection): boolean {
  return getChecklistIssueCount(section) > 0;
}

function getRoomRiskLevel(section: RoomSection): 'low' | 'medium' | 'high' {
  const total = (section.checklist || []).length;
  if (total === 0) return 'low';
  const issues = getChecklistIssueCount(section);
  const ratio = issues / total;
  if (ratio >= 0.4) return 'high';
  if (ratio >= 0.15) return 'medium';
  return 'low';
}

function getRoomStatusSummary(
  section: RoomSection,
  customerFriendlyLanguage: boolean
): string {
  const total = (section.checklist || []).length;
  const checked = (section.checklist || []).filter(i => i.checked).length;
  const missingRequiredCount = (section.checklist || []).filter(
    item => item.requiredPhoto && !item.photo
  ).length;
  if (total === 0) {
    return customerFriendlyLanguage
      ? 'No checklist items added.'
      : 'No checklist entries configured.';
  }
  if (missingRequiredCount > 0) {
    return customerFriendlyLanguage
      ? `Need ${missingRequiredCount} more required photos.`
      : `Required evidence missing: ${missingRequiredCount}.`;
  }
  if (checked === total) {
    return customerFriendlyLanguage
      ? 'All checklist items are completed.'
      : 'Checklist completed with full evidence.';
  }
  return customerFriendlyLanguage
    ? `${total - checked} item(s) still need attention.`
    : `${total - checked} item(s) remain unresolved.`;
}

function inferServiceLabel(
  inspection: CleaningInspection,
  preset: InspectionReportStylePreset
): string {
  const hint =
    `${inspection.templateName || ''} ${inspection.propertyNotes || ''}`.toLowerCase();
  if (hint.includes('bond') || hint.includes('move')) return 'Move-out Clean';
  if (hint.includes('office') || hint.includes('commercial'))
    return 'Commercial Clean';
  if (hint.includes('deep')) return 'Deep Clean';
  if (preset === 'office') return 'Office Inspection';
  if (preset === 'moveout') return 'Move-out Inspection';
  return 'Residential Inspection';
}

function buildReportMeta(inspection: CleaningInspection): ReportPageMeta {
  return {
    reportId: inspection.id || 'N/A',
    generatedAt: dayjs().format('DD/MM/YYYY HH:mm'),
  };
}

function buildFooterHtml(meta: ReportPageMeta, sectionHint: string): string {
  const safeReportId = escapeHtml(meta.reportId);
  const safeGeneratedAt = escapeHtml(meta.generatedAt);
  const safeSectionHint = escapeHtml(sectionHint);
  return `<div class="report-footer-line">${escapeHtml(SPARKERY_COMPANY_PROFILE.name)} · ${escapeHtml(SPARKERY_COMPANY_PROFILE.phone)} · Report ${safeReportId} · Section ${safeSectionHint} · Generated ${safeGeneratedAt} · 第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>`;
}

function toSafeQrImageUrl(url: string): string {
  const encoded = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=${encoded}`;
}

function inferDamageSeverity(damage: DamageReport): 'high' | 'medium' | 'low' {
  const hint =
    `${damage.location || ''} ${damage.description || ''}`.toLowerCase();
  if (
    hint.includes('broken') ||
    hint.includes('crack') ||
    hint.includes('leak') ||
    hint.includes('电') ||
    hint.includes('hazard')
  ) {
    return 'high';
  }
  if (
    hint.includes('stain') ||
    hint.includes('scratch') ||
    hint.includes('dent') ||
    hint.includes('mark')
  ) {
    return 'medium';
  }
  return 'low';
}

function extractTrailingEnglish(value: string): string {
  const match = value.match(/[A-Za-z][A-Za-z0-9 /&().,'-]*$/);
  return match ? match[0].trim() : '';
}

function toAsciiText(
  value: string | null | undefined,
  fallback = 'N/A'
): string {
  if (!value) return fallback;
  const cleaned = value
    .replace(HAN_REGEX, ' ')
    .replace(NON_ASCII_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPreviewText(
  value: string | null | undefined,
  maxLength = 96
): string {
  const raw = (value || '').trim();
  if (!raw) return 'N/A';
  if (raw.length <= maxLength) return escapeHtml(raw);
  const preview = escapeHtml(`${raw.slice(0, maxLength).trimEnd()}...`);
  return `${preview}<div class="long-text-muted">Full: ${escapeHtml(raw)}</div>`;
}

function toFileToken(
  value: string | null | undefined,
  fallback: string
): string {
  const ascii = toAsciiText(value, fallback)
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
  if (!ascii) return fallback;

  const words = ascii.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0] || fallback).toUpperCase().slice(0, 10);
  }

  const initials = words
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
  if (initials.length >= 3) {
    return initials.slice(0, 10);
  }

  return words.join('').toUpperCase().slice(0, 10);
}

function toEnglishKeyReturnMethod(
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  const direct = KEY_RETURN_METHOD_EN_BY_VALUE[value.trim().toLowerCase()];
  if (direct) return direct;
  return toAsciiText(value, 'Other');
}

function toEnglishRoomName(section: RoomSection): string {
  const mapped = SECTION_NAME_EN_BY_ID[getSectionTypeId(section.id)];
  if (mapped) return mapped;
  const trailing = extractTrailingEnglish(section.name);
  return toAsciiText(trailing || section.name, 'Room');
}

function toEnglishChecklistLabel(item: ChecklistItem): string {
  const preferred = item.labelEn?.trim();
  if (preferred) return toAsciiText(preferred, 'Checklist Item');
  const trailing = extractTrailingEnglish(item.label);
  return toAsciiText(trailing || item.label, 'Checklist Item');
}

function normalizeEmployeeForEnglish(employee: Employee): Employee {
  return {
    ...employee,
    name: toAsciiText(
      employee.nameEn || extractTrailingEnglish(employee.name) || employee.name,
      'Cleaner'
    ),
    ...(employee.nameEn
      ? {
          nameEn: toAsciiText(employee.nameEn, 'Cleaner'),
        }
      : {}),
  };
}

function buildEnglishInspection(
  inspection: CleaningInspection
): CleaningInspection {
  const sourceAssignedEmployees =
    inspection.assignedEmployees && inspection.assignedEmployees.length > 0
      ? inspection.assignedEmployees
      : inspection.assignedEmployee
        ? [inspection.assignedEmployee]
        : [];
  const assignedEmployees = sourceAssignedEmployees.map(
    normalizeEmployeeForEnglish
  );
  const assignedEmployee = assignedEmployees[0];

  const sections = inspection.sections.map(section => ({
    ...section,
    name: toEnglishRoomName(section),
    description: toAsciiText(
      extractTrailingEnglish(section.description) || section.description,
      ''
    ),
    notes: toAsciiText(section.notes, ''),
    checklist: (section.checklist || []).map(item => {
      const englishLabel = toEnglishChecklistLabel(item);
      return {
        ...item,
        label: englishLabel,
        labelEn: englishLabel,
      };
    }),
  }));

  const damageReports = (inspection.damageReports || []).map(report => ({
    ...report,
    location: toAsciiText(
      extractTrailingEnglish(report.location) || report.location,
      'Unknown location'
    ),
    description: toAsciiText(report.description, ''),
  }));

  const normalizeCio = (cio: CheckInOut | null): CheckInOut | null => {
    if (!cio) return null;
    const normalizedKeyReturnMethod = toEnglishKeyReturnMethod(
      cio.keyReturnMethod
    );
    return {
      timestamp: cio.timestamp,
      gpsLat: cio.gpsLat,
      gpsLng: cio.gpsLng,
      gpsAddress: toAsciiText(cio.gpsAddress, 'N/A'),
      ...(cio.photo ? { photo: cio.photo } : {}),
      ...(normalizedKeyReturnMethod
        ? { keyReturnMethod: normalizedKeyReturnMethod }
        : {}),
    };
  };

  return {
    ...inspection,
    propertyId: toAsciiText(inspection.propertyId, 'N/A'),
    propertyAddress: toAsciiText(inspection.propertyAddress, 'N/A'),
    propertyNotes: toAsciiText(inspection.propertyNotes, ''),
    submittedAt: inspection.submittedAt,
    submitterName: inspection.submitterName
      ? toAsciiText(inspection.submitterName, 'N/A')
      : inspection.submitterName,
    templateName: inspection.templateName
      ? toAsciiText(inspection.templateName, '')
      : inspection.templateName,
    sections,
    damageReports,
    checkIn: normalizeCio(inspection.checkIn),
    checkOut: normalizeCio(inspection.checkOut),
    ...(assignedEmployees.length > 0
      ? { assignedEmployees, assignedEmployee }
      : {}),
  };
}

function localizePdfHtmlForEnglish(html: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/lang="zh-CN"/g, 'lang="en"'],
    [/<title>[\s\S]*?<\/title>/, '<title>Cleaning Inspection Report</title>'],
    [/清洁检查报告/g, 'Cleaning Inspection Report'],
    [/房产名称\s*\/\s*Property/g, 'Property'],
    [/地址\s*\/\s*Address/g, 'Address'],
    [/退房日期\s*\/\s*Check-out Date/g, 'Check-out Date'],
    [/清洁人员\s*\/\s*Cleaner/g, 'Cleaner'],
    [/清洁时长\s*\/\s*Duration/g, 'Duration'],
    [/房间\s*\/\s*照片\s*\/\s*损坏/g, 'Rooms / Photos / Damage Reports'],
    [/备注\s*\/\s*Notes/g, 'Notes'],
    [/提交时间\s*\/\s*Submitted/g, 'Submitted'],
    [/目录\s*\/\s*Contents/g, 'Contents'],
    [/签到\s*\/\s*签退/g, 'Check-in / Check-out'],
    [/签到\s*CHECK-IN/g, 'CHECK-IN'],
    [/签退\s*CHECK-OUT/g, 'CHECK-OUT'],
    [/房间概览/g, 'Room Overview'],
    [
      /清洁前损坏报告\s*\/\s*Pre-Clean Damage Report/g,
      'Pre-Clean Damage Report',
    ],
    [/损坏照片/g, 'Damage Photo'],
    [/损坏\s*#/g, 'Damage #'],
    [/检查清单\s*\/\s*Checklist/g, 'Checklist'],
    [/备注：/g, 'Notes:'],
    [/钥匙归还:/g, 'Key Return:'],
    [/未知位置/g, 'Unknown location'],
    [/无描述/g, 'No description'],
    [/已拍照/g, 'Photo attached'],
    [/缺少照片/g, 'Missing photo'],
    [/补充照片/g, 'Additional photo'],
    [/通过/g, 'passed'],
    [/完成/g, 'complete'],
    [/(\\d+)小时\\s*(\\d+)分钟/g, '$1h $2m'],
    [/(\\d+)\\s*个房间/g, '$1 rooms'],
    [/(\\d+)\\s*张照片/g, '$1 photos'],
    [/(\\d+)\\s*处损坏/g, '$1 damage reports'],
    [
      /第\s*\{PAGE_NUM\}\s*页\s*\/\s*共\s*\{TOTAL_PAGES\}\s*页/g,
      'Page {PAGE_NUM} / {TOTAL_PAGES}',
    ],
    [/第\s*\{PAGE_NUM\}\s*页/g, 'Page {PAGE_NUM}'],
    [/共\s*\{TOTAL_PAGES\}\s*页/g, '{TOTAL_PAGES}'],
  ];

  let output = html;
  replacements.forEach(([pattern, value]) => {
    output = output.replace(pattern, value);
  });

  // Final safeguard: strip all Han chars from English report output.
  output = output.replace(HAN_REGEX, '');
  return output;
}

/**
 * Ensure a CheckInOut record has a reverse-geocoded gpsAddress.
 * If gpsAddress is empty/missing but coords exist, perform reverse geocoding.
 */
async function ensureGpsAddress(
  data: CheckInOut | null
): Promise<CheckInOut | null> {
  if (!data) return null;
  if (data.gpsAddress && data.gpsAddress.length > 0) return data;
  if (data.gpsLat !== null && data.gpsLng !== null) {
    const address = await reverseGeocode(data.gpsLat, data.gpsLng);
    return { ...data, gpsAddress: address };
  }
  return data;
}

/**
 * Generate the complete HTML document for PDF printing.
 * Async because it may need to reverse-geocode GPS coordinates.
 */
export async function generateInspectionPdfHtml(
  inspection: CleaningInspection,
  lang: InspectionReportLang = 'zh',
  options: InspectionReportRenderOptions = {}
): Promise<string> {
  const sourceInspection =
    lang === 'en' ? buildEnglishInspection(inspection) : inspection;

  // Pre-process: reverse-geocode check-in/out GPS if addresses are missing
  const [enrichedCheckIn, enrichedCheckOut] = await Promise.all([
    ensureGpsAddress(sourceInspection.checkIn),
    ensureGpsAddress(sourceInspection.checkOut),
  ]);
  // Use enriched copy for rendering
  const enriched: CleaningInspection = {
    ...sourceInspection,
    checkIn: enrichedCheckIn,
    checkOut: enrichedCheckOut,
  };
  const formattedDate = dayjs(enriched.checkOutDate).format('DD/MM/YYYY');
  const submittedAt = enriched.submittedAt
    ? dayjs(enriched.submittedAt).format('DD/MM/YYYY HH:mm')
    : 'N/A';
  const renderConfig = resolveInspectionRenderConfig(enriched, options);
  const validationWarnings = collectInspectionValidationWarnings(
    enriched,
    renderConfig
  );
  const reportMeta = buildReportMeta(enriched);
  const preset = renderConfig.preset;
  const sectionsForRender = renderConfig.issueOnly
    ? enriched.sections.filter(
        section => hasChecklistIssue(section) || Boolean(section.notes?.trim())
      )
    : enriched.sections;

  const pages: string[] = [];

  // Page 1: Cover
  pages.push(
    generateCoverPage(
      enriched,
      formattedDate,
      submittedAt,
      renderConfig,
      validationWarnings,
      reportMeta
    )
  );

  // Page 2: simple contents
  const damagesWithPhotos = (enriched.damageReports || []).filter(d => d.photo);
  const includeIssueEvidencePage =
    sectionsForRender.some(section => hasChecklistIssue(section)) ||
    damagesWithPhotos.length > 0;
  pages.push(
    generateContentsPage(
      enriched,
      sectionsForRender,
      renderConfig,
      reportMeta,
      {
        hasDamageSection: damagesWithPhotos.length > 0,
        includeIssueEvidencePage,
      }
    )
  );

  pages.push(
    generateExecutiveSummaryPage(
      enriched,
      sectionsForRender,
      renderConfig,
      reportMeta
    )
  );

  if (includeIssueEvidencePage) {
    pages.push(
      generateIssueEvidencePage(
        enriched,
        sectionsForRender,
        renderConfig,
        reportMeta
      )
    );
  }

  // Damage report pages (one photo per page)
  if (damagesWithPhotos.length > 0) {
    pages.push(generateDamageSummaryPage(damagesWithPhotos, reportMeta));
    damagesWithPhotos.forEach((d, idx) => {
      pages.push(generateDamagePhotoPage(d, idx, reportMeta));
    });
  }

  if (sectionsForRender.length > 0) {
    pages.push(generateSectionDividerPage(renderConfig, reportMeta));
  }

  // Per-room: checklist page + checklist item photos + additional photos
  sectionsForRender.forEach((section, sectionIdx) => {
    // Checklist summary for this room
    if (
      (section.checklist && section.checklist.length > 0) ||
      Boolean(section.notes?.trim())
    ) {
      pages.push(
        generateRoomChecklistPage(
          section,
          sectionIdx,
          sectionsForRender.length,
          renderConfig,
          reportMeta
        )
      );
    }

    // Checklist item photos (one per page, labeled with the item)
    const itemsWithPhotos = (section.checklist || []).filter(item =>
      renderConfig.issueOnly
        ? Boolean(item.photo && !item.checked)
        : Boolean(item.photo)
    );
    itemsWithPhotos.forEach(item => {
      pages.push(
        generateChecklistPhotoPage(item, section, sectionIdx, reportMeta)
      );
    });

    // Additional room photos (one per page)
    if (!renderConfig.issueOnly) {
      (section.photos || []).forEach((photo, photoIdx) => {
        pages.push(
          generateRoomPhotoPage(
            photo,
            section,
            sectionIdx,
            photoIdx,
            reportMeta
          )
        );
      });
    }
  });

  // Closing page for client-facing handoff
  pages.push(generateClosingPage(enriched, renderConfig, reportMeta));

  // Add page numbers
  const totalPages = pages.length;
  const numberedPages = pages.map((html, idx) =>
    html
      .replace(/\{PAGE_NUM\}/g, String(idx + 1))
      .replace(/\{TOTAL_PAGES\}/g, String(totalPages))
  );
  const reportTitle = generateInspectionFilename(enriched).replace(
    /\.pdf$/i,
    ''
  );

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    ${generatePrintStyles(renderConfig)}
  </style>
</head>
<body class="density-${renderConfig.density}${renderConfig.issueOnly ? ' issue-only-export' : ''}">
  ${numberedPages.join('\n')}
  <script>
    window.onload = function() {
      var images = document.querySelectorAll('img');
      var loaded = 0;
      var hasPrinted = false;
      var triggerPrint = function () {
        if (hasPrinted) return;
        hasPrinted = true;
        window.print();
      };
      var forceTimeout = setTimeout(triggerPrint, 8000);
      if (images.length === 0) {
        setTimeout(function(){
          clearTimeout(forceTimeout);
          triggerPrint();
        }, 300);
        return;
      }
      images.forEach(function(img) {
        if (img.complete) {
          loaded++;
          if (loaded >= images.length) {
            clearTimeout(forceTimeout);
            setTimeout(triggerPrint, 300);
          }
        }
        else {
          img.onload = img.onerror = function() {
            loaded++;
            if (loaded >= images.length) {
              clearTimeout(forceTimeout);
              setTimeout(triggerPrint, 300);
            }
          };
        }
      });
    };
  </script>
</body>
</html>
  `;

  return lang === 'en' ? localizePdfHtmlForEnglish(html) : html;
}

/**
 * Print-optimized CSS - clean, high-contrast, professional
 */
function generatePrintStyles(config: InspectionReportRenderConfig): string {
  const theme = getInspectionTheme(config.preset);
  const compact = config.density === 'compact';
  return `
    :root {
      --report-accent: ${theme.accent};
      --report-accent-dark: ${theme.accentDark};
      --report-accent-soft: ${theme.accentSoft};
      --report-badge-pass-bg: ${theme.badgePassBg};
      --report-badge-pass-text: ${theme.badgePassText};
      --report-badge-fail-bg: #fff2f0;
      --report-badge-fail-text: #cf1322;
      --report-badge-missing-bg: #fff7e6;
      --report-badge-missing-text: #ad6800;
      --report-section-gap: ${compact ? '2.3mm' : '3mm'};
      --report-card-padding: ${compact ? '1.8mm 2.2mm' : '2.3mm 2.8mm'};
      --report-row-gap: ${compact ? '1.1mm' : '1.6mm'};
      --report-body-top: ${compact ? '55mm' : '58mm'};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #222;
      background: #fff;
    }
    .secondary-lang {
      color: #94a3b8;
      font-size: 0.92em;
      font-weight: 500;
    }

    @page { size: A4 portrait; margin: 0; }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 0;
      margin: 0;
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      background: #fff;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }

    /* ── Thin top accent bar (all pages) ── */
    .page-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3mm;
      background: var(--report-accent);
    }

    /* ── Compact page header for photo pages ── */
    .page-topline {
      position: absolute;
      top: 3mm; left: 10mm; right: 10mm;
      height: 10mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.5pt solid #e0e0e0;
    }
    .topline-left {
      font-size: 9pt;
      font-weight: 600;
      color: #333;
    }
    .topline-right {
      font-size: 7.5pt;
      color: #999;
    }

    /* ── Full-bleed photo area (maximized) ── */
    .photo-area {
      position: absolute;
      top: 15mm; left: 8mm; right: 8mm; bottom: 18mm;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
    .photo-area img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .photo-area.img-fallback {
      border: 0.8pt dashed #cbd5e1;
      border-radius: 4px;
      background: repeating-linear-gradient(
        -45deg,
        #f8fafc,
        #f8fafc 8px,
        #f1f5f9 8px,
        #f1f5f9 16px
      );
    }
    .photo-area.img-fallback::after {
      content: 'Image unavailable';
      font-size: 10pt;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    /* ── Minimal footer with caption ── */
    .photo-caption {
      position: absolute;
      bottom: 4mm; left: 10mm; right: 10mm;
      height: 12mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 0.5pt solid #e0e0e0;
      padding-top: 2mm;
    }
    .caption-text {
      font-size: 8pt;
      color: #555;
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .caption-page {
      font-size: 7.5pt;
      color: #aaa;
    }

    /* ════════════════════ COVER PAGE ════════════════════ */
    .cover-banner {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 52mm;
      background: linear-gradient(135deg, var(--report-accent) 0%, var(--report-accent-dark) 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
    }
    .cover-page.cover-style-business .cover-banner {
      background: linear-gradient(140deg, #0f172a 0%, var(--report-accent-dark) 100%);
    }
    .cover-page.cover-style-contrast .cover-banner {
      background: linear-gradient(145deg, #111827 0%, #000000 100%);
    }
    .cover-brand {
      font-size: 11pt;
      font-weight: 400;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 2mm;
    }
    .cover-title {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 0.5mm;
    }
    .cover-subtitle {
      font-size: 9pt;
      opacity: 0.8;
      margin-top: 2mm;
    }
    .cover-tag-row {
      margin-top: 2mm;
      display: flex;
      gap: 2mm;
      flex-wrap: wrap;
      justify-content: center;
    }
    .cover-service-tag,
    .cover-mode-chip,
    .cover-client-chip {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.4px;
      border-radius: 999px;
      padding: 0.6mm 1.8mm;
      border: 0.5pt solid rgba(255, 255, 255, 0.38);
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      text-transform: uppercase;
    }
    .cover-mode-chip {
      background: rgba(255, 255, 255, 0.24);
    }
    .cover-page.cover-style-contrast .cover-service-tag,
    .cover-page.cover-style-contrast .cover-mode-chip,
    .cover-page.cover-style-contrast .cover-client-chip {
      border-color: rgba(255, 255, 255, 0.52);
      background: rgba(255, 255, 255, 0.18);
    }
    .cover-class-strip {
      margin-top: 1.3mm;
      border-radius: 999px;
      padding: 0.7mm 2mm;
      border: 0.5pt solid rgba(255, 255, 255, 0.52);
      background: rgba(255, 255, 255, 0.22);
      color: #fff;
      font-size: 7.1pt;
      font-weight: 700;
      letter-spacing: 0.45px;
      text-transform: uppercase;
    }

    .cover-body {
      position: absolute;
      top: var(--report-body-top); left: 15mm; right: 15mm; bottom: 12mm;
    }

    /* Info table on cover */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
    }
    .info-table td {
      padding: 2.5mm 3mm;
      vertical-align: top;
      font-size: 9.5pt;
    }
    .info-table .label-cell {
      width: 30%;
      color: #777;
      font-size: 8.5pt;
      font-weight: 500;
      border-bottom: 0.5pt solid #f0f0f0;
    }
    .info-table .value-cell {
      color: #222;
      font-weight: 600;
      border-bottom: 0.5pt solid #f0f0f0;
      word-break: break-word;
    }
    .long-text-muted {
      margin-top: 0.6mm;
      font-size: 7.4pt;
      color: #64748b;
      line-height: 1.35;
      font-weight: 500;
    }
    .info-table tr:nth-child(odd) .label-cell,
    .info-table tr:nth-child(odd) .value-cell {
      background: #fbfdfb;
    }

    .cover-summary-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2.5mm;
      margin-bottom: 4mm;
    }
    .cover-summary-card {
      border: 0.5pt solid #dbe9d7;
      border-radius: 3px;
      background: var(--report-accent-soft);
      padding: var(--report-card-padding);
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .cover-summary-label {
      font-size: 7.1pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #6f8a66;
      margin-bottom: 0.6mm;
      display: flex;
      align-items: center;
      gap: 1mm;
    }
    .metric-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.8mm;
      height: 3.8mm;
      border-radius: 50%;
      border: 0.5pt solid #cfe4cd;
      background: #fff;
      color: var(--report-accent-dark);
      font-size: 6.4pt;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cover-summary-value {
      font-size: 11pt;
      font-weight: 700;
      line-height: 1.1;
      color: var(--report-accent-dark);
      font-variant-numeric: tabular-nums;
    }
    .cover-success-banner {
      border: 0.7pt solid #b7eb8f;
      border-radius: 3px;
      padding: 1.9mm 2.3mm;
      background: #f6ffed;
      color: #237804;
      font-size: 8.3pt;
      font-weight: 700;
      margin-bottom: 3mm;
    }
    .validation-warning-box {
      border: 0.7pt solid #ffd591;
      background: #fffbe6;
      border-radius: 3px;
      padding: 2.3mm 2.8mm;
      margin-bottom: 4mm;
    }
    .validation-warning-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #ad6800;
      margin-bottom: 1mm;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .validation-warning-item {
      font-size: 8pt;
      color: #874d00;
      line-height: 1.45;
      margin-top: 0.5mm;
    }

    .company-card {
      border: 1pt solid #d9d9d9;
      border-radius: 3px;
      background: #fafafa;
      padding: 3mm 4mm;
      margin-bottom: 4mm;
    }
    .company-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #222;
      margin-bottom: 2mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .company-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5mm 4mm;
    }
    .company-item {
      font-size: 8.5pt;
      color: #444;
      line-height: 1.4;
      min-height: 4mm;
    }
    .company-label {
      color: #888;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-right: 1mm;
    }

    .section-heading {
      font-size: 10pt;
      font-weight: 700;
      color: #222;
      margin: calc(var(--report-section-gap) + 2mm) 0 var(--report-section-gap);
      padding-bottom: 1.5mm;
      border-bottom: 1.5pt solid var(--report-accent);
      display: inline-block;
    }

    /* Check-in/out boxes */
    .cio-row { display: flex; gap: 4mm; margin-bottom: 4mm; }
    .cio-box {
      flex: 1;
      border: 1pt solid #d9d9d9;
      border-radius: 3px;
      padding: 3mm 4mm;
    }
    .cio-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--report-accent);
      margin-bottom: 1.5mm;
    }
    .cio-time { font-size: 11pt; font-weight: 700; color: #222; }
    .cio-detail { font-size: 8pt; color: #888; margin-top: 0.5mm; }

    /* Room cards grid */
    .room-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .room-card {
      border: 1pt solid #e0e0e0;
      border-radius: 3px;
      padding: var(--report-card-padding);
      background: #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .room-card-topline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2mm;
    }
    .room-card-name { font-size: 9pt; font-weight: 700; color: #333; }
    .room-risk-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      font-size: 6.8pt;
      font-weight: 700;
      letter-spacing: 0.3px;
      padding: 0.3mm 1.2mm;
      border: 0.5pt solid transparent;
      flex-shrink: 0;
    }
    .room-risk-low {
      color: #237804;
      background: #f6ffed;
      border-color: #b7eb8f;
    }
    .room-risk-medium {
      color: #ad6800;
      background: #fff7e6;
      border-color: #ffd591;
    }
    .room-risk-high {
      color: #a8071a;
      background: #fff1f0;
      border-color: #ffa39e;
    }
    .room-card-stat { font-size: 7.5pt; color: #888; margin-top: 0.5mm; }
    .room-card-summary {
      margin-top: 1mm;
      font-size: 7.5pt;
      color: #334155;
      font-weight: 600;
    }

    .report-footer-line {
      position: absolute;
      bottom: 5mm; left: 15mm; right: 15mm;
      text-align: center;
      font-size: 6.5pt;
      color: #bbb;
      letter-spacing: 0.15px;
    }

    /* ════════════════════ CHECKLIST PAGE ════════════════════ */
    .list-body {
      position: absolute;
      top: 15mm; left: 10mm; right: 10mm; bottom: 12mm;
      overflow: hidden;
    }
    .list-room-title {
      font-size: 12pt;
      font-weight: 700;
      color: #222;
      padding: 3mm 0 2mm;
      border-bottom: 1.5pt solid var(--report-accent);
      margin-bottom: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .list-room-conclusion {
      margin-bottom: 2mm;
      padding: 1.6mm 2.2mm;
      border: 0.6pt solid #d9f7be;
      background: #f6ffed;
      color: #237804;
      border-radius: 3px;
      font-size: 8.2pt;
      font-weight: 700;
      letter-spacing: 0.15px;
    }
    .list-room-conclusion.alert {
      border-color: #ffd591;
      background: #fff7e6;
      color: #ad6800;
    }
    .room-missing-alert {
      margin-bottom: 2mm;
      padding: 1.6mm 2.2mm;
      border-radius: 3px;
      border: 0.6pt solid #ffd591;
      background: #fff7e6;
      color: #ad6800;
      font-size: 8pt;
      font-weight: 600;
    }
    .list-room-stat {
      font-size: 9pt;
      font-weight: 400;
      color: #888;
    }
    .cl-row {
      display: flex;
      align-items: center;
      gap: 2.5mm;
      padding: var(--report-row-gap) 0;
      border-bottom: 0.3pt solid #f0f0f0;
      font-size: 9pt;
      border-left: 1.5pt solid transparent;
      padding-left: 1.4mm;
    }
    .cl-row.cl-row-fail {
      border-left-color: #cf1322;
      background: #fff7f7;
    }
    .cl-row.cl-row-missing {
      border-left-color: #d48806;
      background: #fffdf5;
    }
    .cl-row:nth-child(odd):not(.cl-row-fail):not(.cl-row-missing) {
      background: #fcfffb;
    }
    .cl-row:last-child { border-bottom: none; }
    .cl-icon {
      width: 4mm; height: 4mm;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cl-pass { background: var(--report-badge-pass-bg); color: var(--report-badge-pass-text); border: 0.5pt solid #b7eb8f; }
    .cl-fail { background: #fff2f0; color: #cf1322; border: 0.5pt solid #ffa39e; }
    .cl-label { flex: 1; color: #333; }
    .cl-status-label {
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.4px;
      border-radius: 999px;
      padding: 0.4mm 1.5mm;
      min-width: 11mm;
      text-align: center;
      flex-shrink: 0;
      text-transform: uppercase;
      font-variant-numeric: tabular-nums;
    }
    .cl-status-pass {
      background: var(--report-badge-pass-bg);
      color: var(--report-badge-pass-text);
      border: 0.5pt solid #b7eb8f;
    }
    .cl-status-fail {
      background: var(--report-badge-fail-bg);
      color: var(--report-badge-fail-text);
      border: 0.5pt solid #ffa39e;
    }
    .cl-status-missing {
      background: var(--report-badge-missing-bg);
      color: var(--report-badge-missing-text);
      border: 0.5pt solid #ffd591;
    }
    .cl-badge {
      font-size: 7pt;
      padding: 0.5mm 2mm;
      border-radius: 2px;
      flex-shrink: 0;
      font-weight: 700;
      letter-spacing: 0.25px;
      text-transform: uppercase;
    }
    .cl-badge-photo { background: var(--report-accent-soft); color: var(--report-accent-dark); }
    .cl-badge-missing { background: #fff2f0; color: #cf1322; }

    /* ════════════════════ CONTENTS / CLOSING ════════════════════ */
    .toc-body,
    .closing-body,
    .summary-body,
    .evidence-body,
    .divider-body {
      position: absolute;
      top: 16mm;
      left: 15mm;
      right: 15mm;
      bottom: 16mm;
    }
    .toc-title,
    .closing-title,
    .summary-title,
    .evidence-title,
    .divider-title {
      font-size: 20pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2mm;
    }
    .toc-subtitle,
    .closing-subtitle,
    .summary-subtitle,
    .evidence-subtitle,
    .divider-subtitle {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 4mm;
    }
    .toc-section-title {
      display: inline-block;
      margin-bottom: 2mm;
      font-size: 10pt;
      font-weight: 700;
      color: #334155;
      border-bottom: 1.3pt solid var(--report-accent);
      padding-bottom: 0.8mm;
    }
    .toc-list {
      list-style: none;
      border: 1pt solid #e2e8f0;
      border-radius: 4px;
      padding: 1.5mm 2mm;
      background: #fff;
    }
    .toc-list li {
      display: flex;
      justify-content: space-between;
      gap: 3mm;
      padding: 1.6mm 0.8mm;
      border-bottom: 0.5pt solid #edf2f7;
      font-size: 8.8pt;
      color: #1f2937;
    }
    .toc-issue-total {
      margin-bottom: 2.2mm;
      border: 0.6pt solid #ffd591;
      border-radius: 3px;
      background: #fff7e6;
      padding: 1.5mm 2mm;
      font-size: 8.4pt;
      color: #ad6800;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .toc-list .toc-meta {
      color: #64748b;
      font-size: 8pt;
    }
    .toc-list li:last-child {
      border-bottom: none;
    }
    .toc-note,
    .closing-note {
      margin-top: 4mm;
      font-size: 8.6pt;
      color: #475569;
      line-height: 1.5;
    }
    .closing-card {
      margin-top: 4mm;
      border: 1pt solid #dbe7dc;
      background: #f8fffa;
      border-radius: 4px;
      padding: 3mm;
    }
    .closing-line {
      font-size: 9pt;
      color: #1f2937;
      margin-bottom: 1.2mm;
    }
    .closing-signoff-grid {
      margin-top: 4mm;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4mm;
    }
    .signoff-box {
      border: 0.8pt dashed #cbd5e1;
      border-radius: 3px;
      padding: 2.2mm 2.5mm;
      min-height: 18mm;
    }
    .signoff-title {
      font-size: 8pt;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8mm;
    }
    .signoff-line {
      border-top: 0.6pt solid #94a3b8;
      font-size: 7.5pt;
      color: #64748b;
      padding-top: 1mm;
    }
    .closing-qr {
      margin-top: 4mm;
      display: flex;
      gap: 3mm;
      align-items: center;
    }
    .closing-qr img {
      width: 24mm;
      height: 24mm;
      border: 0.8pt solid #dbeafe;
      border-radius: 2px;
      object-fit: contain;
      background: #fff;
    }
    .closing-qr-note {
      font-size: 8.2pt;
      color: #475569;
      line-height: 1.45;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2.3mm;
      margin-bottom: 3.5mm;
    }
    .summary-card {
      border: 0.8pt solid #dbe7dc;
      border-radius: 3px;
      padding: var(--report-card-padding);
      background: #f8fffa;
    }
    .summary-card-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.35px;
      color: #64748b;
      margin-bottom: 0.7mm;
    }
    .summary-card-value {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }
    .summary-section {
      margin-top: 3.2mm;
    }
    .summary-section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1.5mm;
      display: inline-block;
      border-bottom: 1pt solid var(--report-accent);
      padding-bottom: 0.6mm;
    }
    .summary-list {
      list-style: none;
      border: 0.8pt solid #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .summary-list li {
      font-size: 8.6pt;
      color: #334155;
      padding: 1.5mm 2mm;
      border-bottom: 0.5pt solid #e2e8f0;
      line-height: 1.45;
    }
    .summary-list li:last-child {
      border-bottom: none;
    }
    .evidence-list {
      list-style: none;
      border: 0.8pt solid #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 1mm;
    }
    .evidence-item {
      display: grid;
      grid-template-columns: 32% 46% 22%;
      gap: 2mm;
      align-items: center;
      font-size: 8.2pt;
      padding: 1.6mm 2mm;
      border-bottom: 0.5pt solid #edf2f7;
      color: #1f2937;
    }
    .evidence-item:last-child {
      border-bottom: none;
    }
    .evidence-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 6.9pt;
      font-weight: 700;
      padding: 0.3mm 1.3mm;
      border: 0.5pt solid transparent;
      min-width: 11mm;
    }
    .evidence-status-fail {
      color: #a8071a;
      background: #fff1f0;
      border-color: #ffa39e;
    }
    .evidence-status-missing {
      color: #ad6800;
      background: #fff7e6;
      border-color: #ffd591;
    }
    .evidence-more {
      margin-top: 2mm;
      font-size: 8pt;
      color: #64748b;
    }
    .divider-body {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .divider-subtitle {
      margin-bottom: 0;
    }

    /* ════════════════════ DAMAGE SUMMARY ════════════════════ */
    .damage-body {
      position: absolute;
      top: 15mm; left: 10mm; right: 10mm; bottom: 12mm;
      overflow: hidden;
    }
    .dmg-item {
      display: flex;
      gap: 4mm;
      margin-bottom: 3mm;
      padding: 3mm;
      border: 1pt solid #ffd591;
      border-left: 2pt solid #ffd591;
      border-radius: 3px;
      background: #fffbe6;
    }
    .dmg-item.severity-high {
      border-left-color: #cf1322;
      background: #fff2f0;
    }
    .dmg-item.severity-medium {
      border-left-color: #d48806;
      background: #fff7e6;
    }
    .dmg-item.severity-low {
      border-left-color: #389e0d;
      background: #f6ffed;
    }
    .dmg-group {
      margin-bottom: 2.5mm;
    }
    .dmg-group-title {
      font-size: 8.1pt;
      font-weight: 800;
      letter-spacing: 0.45px;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 1.4mm;
    }
    .dmg-severity-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 6.7pt;
      font-weight: 700;
      letter-spacing: 0.35px;
      text-transform: uppercase;
      min-width: 12mm;
      padding: 0.35mm 1.3mm;
      border: 0.5pt solid transparent;
      margin-left: 1.2mm;
    }
    .dmg-severity-tag.high {
      color: #a8071a;
      background: #fff1f0;
      border-color: #ffa39e;
    }
    .dmg-severity-tag.medium {
      color: #ad6800;
      background: #fff7e6;
      border-color: #ffd591;
    }
    .dmg-severity-tag.low {
      color: #237804;
      background: #f6ffed;
      border-color: #b7eb8f;
    }
    .dmg-thumb {
      width: 22mm; height: 16mm;
      object-fit: cover;
      border-radius: 2px;
      border: 0.5pt solid #d9d9d9;
      flex-shrink: 0;
    }
    .dmg-thumb.img-fallback {
      border-style: dashed;
      background: #f1f5f9;
      object-fit: contain;
    }
    .dmg-info { flex: 1; }
    .dmg-loc { font-size: 9pt; font-weight: 700; color: #d46b08; }
    .dmg-desc { font-size: 8.5pt; color: #555; margin-top: 0.5mm; }
    .dmg-time { font-size: 7.5pt; color: #aaa; margin-top: 0.5mm; }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { margin: 0; box-shadow: none; }
      html, body { height: auto; overflow: visible; }
      .cl-row,
      .dmg-item,
      .room-card,
      .company-card,
      .cover-summary-card,
      .summary-card,
      .evidence-item {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    @media screen {
      body { background: #e8e8e8; padding: 10mm; }
      .page { margin: 0 auto 10mm; box-shadow: 0 2px 16px rgba(0,0,0,0.12); }
      .cover-summary-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;
}

/**
 * Format a CheckInOut block for the cover page
 */
function formatCioBox(data: CheckInOut | null, label: string): string {
  if (!data) {
    return `<div class="cio-box"><div class="cio-label">${label}</div><div class="cio-time" style="color:#ccc;">N/A</div></div>`;
  }
  const time = dayjs(data.timestamp).format('HH:mm:ss');
  const date = dayjs(data.timestamp).format('DD/MM/YYYY');

  // Show reverse-geocoded street address prominently; raw coords as secondary info
  const hasCoords = data.gpsLat !== null && data.gpsLng !== null;
  const coordsStr = hasCoords
    ? `(${data.gpsLat!.toFixed(5)}, ${data.gpsLng!.toFixed(5)})`
    : '';

  // gpsAddress should now contain the reverse-geocoded street address
  let locationLine = '';
  if (data.gpsAddress) {
    locationLine = `<div class="cio-detail" style="font-weight:600;">📍 ${escapeHtml(data.gpsAddress)}</div>`;
    if (coordsStr) {
      locationLine += `<div class="cio-detail" style="font-size:7pt;color:#888;">${escapeHtml(coordsStr)}</div>`;
    }
  } else if (hasCoords) {
    locationLine = `<div class="cio-detail">GPS: ${escapeHtml(coordsStr)}</div>`;
  } else {
    locationLine = `<div class="cio-detail" style="color:#ccc;">GPS: N/A</div>`;
  }

  const keyLine = data.keyReturnMethod
    ? `<div class="cio-detail" style="color:#d46b08;">钥匙归还: ${escapeHtml(data.keyReturnMethod)}</div>`
    : '';
  return `
    <div class="cio-box">
      <div class="cio-label">${escapeHtml(label)}</div>
      <div class="cio-time">${escapeHtml(time)}</div>
      <div class="cio-detail">${escapeHtml(date)}</div>
      ${locationLine}
      ${keyLine}
    </div>
  `;
}

function collectInspectionValidationWarnings(
  inspection: CleaningInspection,
  config: InspectionReportRenderConfig
): string[] {
  const warnings: string[] = [];
  const roomCount = inspection.sections.length;
  const totalPhotos = inspection.sections.reduce(
    (sum, s) =>
      sum +
      (s.photos || []).length +
      (s.checklist || []).filter(i => Boolean(i.photo)).length,
    0
  );

  if (!inspection.propertyId?.trim()) {
    warnings.push('Property name is missing.');
  }
  if (roomCount === 0) {
    warnings.push('No rooms found in this report.');
  }
  if (totalPhotos === 0) {
    warnings.push('No photos attached yet.');
  }
  if (!inspection.checkOutDate) {
    warnings.push('Check-out date is missing.');
  }
  if (!inspection.checkOut?.timestamp) {
    warnings.push('Check-out time record is missing.');
  }
  if (inspection.propertyAddress && inspection.propertyAddress.length > 180) {
    warnings.push(
      'Property address is very long and may wrap in print layout.'
    );
  }
  if (
    config.issueOnly &&
    !inspection.sections.some(section => hasChecklistIssue(section))
  ) {
    warnings.push('Issue-only mode is enabled, but no issue items were found.');
  }

  return warnings;
}

function generateContentsPage(
  inspection: CleaningInspection,
  sections: RoomSection[],
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta,
  options: { hasDamageSection: boolean; includeIssueEvidencePage: boolean }
): string {
  const safeReportId = escapeHtml(inspection.id || 'N/A');
  const safePreset = escapeHtml(config.preset.toUpperCase());
  const totalIssues = sections.reduce(
    (sum, section) => sum + getChecklistIssueCount(section),
    0
  );
  const roomLines = sections
    .map((section, index) => {
      const issueCount = getChecklistIssueCount(section);
      return `<li><span>${index + 1}. ${escapeHtml(section.name)}</span><span class="toc-meta">${(section.checklist || []).length} items · ${issueCount} issue(s)</span></li>`;
    })
    .join('');
  const systemLines: string[] = [
    '<li><span>1. Cover</span><span class="toc-meta">Overview</span></li>',
    '<li><span>2. Contents</span><span class="toc-meta">Index</span></li>',
    '<li><span>3. Executive Summary</span><span class="toc-meta">Client Snapshot</span></li>',
  ];
  if (options.includeIssueEvidencePage) {
    systemLines.push(
      '<li><span>4. Issue Evidence</span><span class="toc-meta">Action Required</span></li>'
    );
  }
  if (options.hasDamageSection) {
    systemLines.push(
      '<li><span>5. Damage Summary</span><span class="toc-meta">Photos</span></li>'
    );
  }
  const modeNote = config.issueOnly
    ? 'Export mode: Issues only (focus version).'
    : 'Export mode: Full report.';

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="toc-body">
      <div class="toc-title">目录 / Contents</div>
      <div class="toc-subtitle">Report ID: ${safeReportId} · Style: ${safePreset}</div>
      <div class="toc-issue-total">TOTAL ISSUES: ${totalIssues} · ROOMS: ${sections.length}</div>
      <div class="toc-section-title">Sections</div>
      <ul class="toc-list">
        ${systemLines.join('')}
        ${roomLines}
      </ul>
      <div class="toc-note">This report is designed for client-facing review and presentation. ${modeNote}</div>
    </div>
    ${buildFooterHtml(reportMeta, 'Contents')}
  </div>
  `;
}

function buildActionRecommendations(
  inspection: CleaningInspection,
  sections: RoomSection[],
  customerFriendlyLanguage: boolean
): string[] {
  const totalIssues = sections.reduce(
    (sum, section) => sum + getChecklistIssueCount(section),
    0
  );
  const missingRequiredPhotos = sections.reduce(
    (sum, section) =>
      sum +
      (section.checklist || []).filter(
        item => item.requiredPhoto && !item.photo
      ).length,
    0
  );
  const actions: string[] = [];

  if (totalIssues === 0) {
    actions.push(
      customerFriendlyLanguage
        ? 'All checklist items are complete. No immediate follow-up required.'
        : 'Inspection is complete with no unresolved checklist items.'
    );
  } else {
    actions.push(
      customerFriendlyLanguage
        ? `Review the ${totalIssues} highlighted item(s) and confirm re-clean scope if needed.`
        : `Prioritize remediation for ${totalIssues} unresolved checklist item(s).`
    );
  }

  if (missingRequiredPhotos > 0) {
    actions.push(
      customerFriendlyLanguage
        ? `Collect ${missingRequiredPhotos} missing required photo(s) for full evidence archive.`
        : `Capture and upload ${missingRequiredPhotos} required evidence photo(s).`
    );
  }

  if ((inspection.damageReports || []).length > 0) {
    actions.push(
      customerFriendlyLanguage
        ? 'Confirm pre-existing damage acknowledgement with customer before close-out.'
        : 'Review and acknowledge all pre-clean damage records before sign-off.'
    );
  }

  actions.push(
    customerFriendlyLanguage
      ? 'Keep this report ID for future service follow-up and client communication.'
      : 'Reference this report ID for subsequent operational tracking.'
  );

  return actions.slice(0, 5);
}

function generateExecutiveSummaryPage(
  inspection: CleaningInspection,
  sections: RoomSection[],
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta
): string {
  const totalChecklist = sections.reduce(
    (sum, section) => sum + (section.checklist || []).length,
    0
  );
  const totalIssues = sections.reduce(
    (sum, section) => sum + getChecklistIssueCount(section),
    0
  );
  const missingRequiredPhotos = sections.reduce(
    (sum, section) =>
      sum +
      (section.checklist || []).filter(
        item => item.requiredPhoto && !item.photo
      ).length,
    0
  );
  const passRate =
    totalChecklist > 0
      ? Math.max(
          0,
          Math.round(((totalChecklist - totalIssues) / totalChecklist) * 100)
        )
      : 100;
  const actions = buildActionRecommendations(
    inspection,
    sections,
    config.customerFriendlyLanguage
  );

  const keyFindings = [
    `Property: ${inspection.propertyId || 'N/A'}`,
    `Report mode: ${config.issueOnly ? 'Issues only' : 'Full report'}`,
    `Coverage: ${sections.length} room section(s), ${(inspection.damageReports || []).length} damage record(s)`,
    `Prepared for client-facing review and evidence handoff.`,
  ];

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="summary-body">
      <div class="summary-title">Client Summary</div>
      <div class="summary-subtitle">Quick review snapshot for customer communication and approval.</div>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Rooms</div>
          <div class="summary-card-value">${sections.length}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Checklist</div>
          <div class="summary-card-value">${totalChecklist}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Issues</div>
          <div class="summary-card-value">${totalIssues}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Pass Rate</div>
          <div class="summary-card-value">${passRate}%</div>
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-section-title">Key Findings</div>
        <ul class="summary-list">
          ${keyFindings.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
      </div>
      <div class="summary-section">
        <div class="summary-section-title">Recommended Next Actions</div>
        <ul class="summary-list">
          ${actions.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
      </div>
      ${
        missingRequiredPhotos > 0
          ? `<div class="toc-note">Required evidence still missing: ${missingRequiredPhotos} photo(s).</div>`
          : ''
      }
    </div>
    ${buildFooterHtml(reportMeta, 'Executive Summary')}
  </div>
  `;
}

function generateIssueEvidencePage(
  inspection: CleaningInspection,
  sections: RoomSection[],
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta
): string {
  const rows: Array<{
    room: string;
    item: string;
    status: 'fail' | 'missing';
    hasPhoto: boolean;
  }> = [];

  sections.forEach(section => {
    (section.checklist || []).forEach(item => {
      const isMissingRequired = item.requiredPhoto && !item.photo;
      if (!item.checked || isMissingRequired) {
        rows.push({
          room: section.name,
          item: item.labelEn || item.label,
          status: isMissingRequired ? 'missing' : 'fail',
          hasPhoto: Boolean(item.photo),
        });
      }
    });
  });

  const maxRows = 34;
  const visibleRows = rows.slice(0, maxRows);
  const overflowCount = Math.max(0, rows.length - visibleRows.length);
  const damageCount = (inspection.damageReports || []).length;
  const subtitle = config.customerFriendlyLanguage
    ? 'Items listed here usually need follow-up or customer confirmation.'
    : 'Evidence-focused list of unresolved checklist items.';

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="evidence-body">
      <div class="evidence-title">Issue Evidence</div>
      <div class="evidence-subtitle">${escapeHtml(subtitle)} Damage records: ${damageCount}</div>
      <ul class="evidence-list">
        ${visibleRows
          .map(
            row => `
          <li class="evidence-item">
            <span>${escapeHtml(row.room)}</span>
            <span>${escapeHtml(row.item)}</span>
            <span class="evidence-status ${row.status === 'missing' ? 'evidence-status-missing' : 'evidence-status-fail'}">
              ${row.status === 'missing' ? 'MISSING' : 'FAIL'} · ${row.hasPhoto ? 'PHOTO' : 'NO PHOTO'}
            </span>
          </li>`
          )
          .join('')}
      </ul>
      ${
        visibleRows.length === 0
          ? '<div class="toc-note">No unresolved checklist item was detected.</div>'
          : ''
      }
      ${
        overflowCount > 0
          ? `<div class="evidence-more">+ ${overflowCount} more issue item(s) are listed in room detail pages.</div>`
          : ''
      }
    </div>
    ${buildFooterHtml(reportMeta, 'Issue Evidence')}
  </div>
  `;
}

function generateSectionDividerPage(
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta
): string {
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="divider-body">
      <div class="divider-title">Inspection Details</div>
      <div class="divider-subtitle">Room-by-room checklist and evidence pages start from the next page.</div>
      <div class="toc-note">${config.issueOnly ? 'Issue-only mode: only rooms with unresolved items are included.' : 'Full mode: all rooms are included.'}</div>
    </div>
    ${buildFooterHtml(reportMeta, 'Inspection Details')}
  </div>
  `;
}

function generateClosingPage(
  inspection: CleaningInspection,
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta
): string {
  const safeReportId = escapeHtml(inspection.id || 'N/A');
  const safeProperty = escapeHtml(inspection.propertyId || 'N/A');
  const qrHtml = config.onlineReportUrl
    ? `<div class="closing-qr">
        <img src="${escapeHtml(toSafeQrImageUrl(config.onlineReportUrl))}" alt="Online report QR" onerror="this.style.display='none'" />
        <div class="closing-qr-note">
          Online version available for mobile viewing:<br/>
          ${escapeHtml(config.onlineReportUrl)}
        </div>
      </div>`
    : '';
  const signoffHtml = config.includeSignoff
    ? `<div class="closing-signoff-grid">
        <div class="signoff-box">
          <div class="signoff-title">Client Acknowledgement</div>
          <div class="signoff-line">Name / Signature / Date</div>
        </div>
        <div class="signoff-box">
          <div class="signoff-title">Sparkery Representative</div>
          <div class="signoff-line">Name / Signature / Date</div>
        </div>
      </div>`
    : '';
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="closing-body">
      <div class="closing-title">Thank You</div>
      <div class="closing-subtitle">感谢您的信任 · Professional Cleaning Inspection Completed</div>
      <div class="closing-card">
        <div class="closing-line"><strong>Property:</strong> ${safeProperty}</div>
        <div class="closing-line"><strong>Report ID:</strong> ${safeReportId}</div>
        <div class="closing-line"><strong>Company:</strong> ${escapeHtml(SPARKERY_COMPANY_PROFILE.name)}</div>
        <div class="closing-line"><strong>Phone:</strong> ${escapeHtml(SPARKERY_COMPANY_PROFILE.phone)}</div>
        <div class="closing-line"><strong>Email:</strong> ${escapeHtml(SPARKERY_COMPANY_PROFILE.email)}</div>
        <div class="closing-line"><strong>Website:</strong> ${escapeHtml(SPARKERY_COMPANY_PROFILE.website)}</div>
      </div>
      <div class="closing-note">If you need any follow-up service, please contact us and reference this report ID.</div>
      ${qrHtml}
      ${signoffHtml}
    </div>
    ${buildFooterHtml(reportMeta, 'Closing')}
  </div>
  `;
}

/**
 * Cover page: property info, check-in/out, room overview
 */
function generateCoverPage(
  inspection: CleaningInspection,
  formattedDate: string,
  submittedAt: string,
  config: InspectionReportRenderConfig,
  validationWarnings: string[],
  reportMeta: ReportPageMeta
): string {
  const roomCount = inspection.sections.length;
  const checklistTotal = inspection.sections.reduce(
    (sum, section) => sum + (section.checklist || []).length,
    0
  );
  const checklistPassed = inspection.sections.reduce(
    (sum, section) =>
      sum + (section.checklist || []).filter(item => item.checked).length,
    0
  );
  const checklistCompletionRate =
    checklistTotal > 0
      ? Math.round((checklistPassed / checklistTotal) * 100)
      : 0;
  const totalPhotos = inspection.sections.reduce(
    (sum, s) =>
      sum +
      (s.photos || []).length +
      (s.checklist || []).filter(i => i.photo).length,
    0
  );
  const damageCount = (inspection.damageReports || []).length;
  const issueCount = inspection.sections.reduce(
    (sum, section) => sum + getChecklistIssueCount(section),
    0
  );
  const assignedEmployees =
    inspection.assignedEmployees && inspection.assignedEmployees.length > 0
      ? inspection.assignedEmployees
      : inspection.assignedEmployee
        ? [inspection.assignedEmployee]
        : [];
  const cleanerName =
    assignedEmployees.length > 0
      ? assignedEmployees
          .map(emp => emp.name || emp.nameEn || 'Cleaner')
          .join(' / ')
      : inspection.submitterName || 'N/A';
  const safePropertyId = escapeHtml(inspection.propertyId || 'N/A');
  const safePropertyAddressPreview = formatPreviewText(
    inspection.propertyAddress
  );
  const safePropertyNotesPreview = formatPreviewText(
    inspection.propertyNotes || inspection.propertyNotesZh,
    120
  );
  const safeFormattedDate = escapeHtml(formattedDate);
  const safeCleanerName = escapeHtml(cleanerName);
  const safeSubmittedAt = escapeHtml(submittedAt);
  const safeClientLabel = config.clientLabel
    ? escapeHtml(config.clientLabel)
    : '';
  const serviceLabel = inferServiceLabel(inspection, config.preset);
  const safeServiceLabel = escapeHtml(serviceLabel);
  const presetLabelMap: Record<InspectionReportStylePreset, string> = {
    residential: 'Residential',
    moveout: 'Move-out',
    office: 'Office',
  };
  const safePresetLabel = escapeHtml(presetLabelMap[config.preset]);

  let durationStr = 'N/A';
  if (inspection.checkIn?.timestamp && inspection.checkOut?.timestamp) {
    const diffMin = dayjs(inspection.checkOut.timestamp).diff(
      dayjs(inspection.checkIn.timestamp),
      'minute'
    );
    durationStr = `${Math.floor(diffMin / 60)}小时 ${diffMin % 60}分钟`;
  }

  const roomCardsHtml = inspection.sections
    .map((s, idx) => {
      const safeRoomName = escapeHtml(s.name);
      const photoCount =
        (s.photos || []).length +
        (s.checklist || []).filter(i => i.photo).length;
      const checked = (s.checklist || []).filter(i => i.checked).length;
      const total = (s.checklist || []).length;
      const missingRequiredCount = (s.checklist || []).filter(
        item => item.requiredPhoto && !item.photo
      ).length;
      const roomStatus = getRoomStatusSummary(
        s,
        config.customerFriendlyLanguage
      );
      const riskLevel = getRoomRiskLevel(s);
      const riskLabelMap: Record<'low' | 'medium' | 'high', string> = {
        low: 'LOW',
        medium: 'MEDIUM',
        high: 'HIGH',
      };
      return `
        <div class="room-card">
          <div class="room-card-topline">
            <div class="room-card-name">${idx + 1}. ${safeRoomName}</div>
            <span class="room-risk-badge room-risk-${riskLevel}">${riskLabelMap[riskLevel]}</span>
          </div>
          <div class="room-card-stat">${photoCount} 张照片${total ? ` · ${checked}/${total} 完成` : ''}</div>
          <div class="room-card-summary">${roomStatus}${missingRequiredCount > 0 ? ` · Missing ${missingRequiredCount}` : ''}</div>
        </div>`;
    })
    .join('');
  const validationWarningsHtml =
    validationWarnings.length > 0
      ? `<div class="validation-warning-box"><div class="validation-warning-title">Pre-export Checks</div>${validationWarnings
          .map(
            warning =>
              `<div class="validation-warning-item">• ${escapeHtml(warning)}</div>`
          )
          .join('')}</div>`
      : '';
  const noIssueBannerHtml =
    issueCount === 0
      ? `<div class="cover-success-banner">All inspection checks passed. This report is ready for client handoff.</div>`
      : '';
  const modeChipHtml = config.issueOnly
    ? '<span class="cover-mode-chip">Issue-only Export</span>'
    : '<span class="cover-mode-chip">Full Export</span>';
  const clientChipHtml = safeClientLabel
    ? `<span class="cover-client-chip">Client: ${safeClientLabel}</span>`
    : '';
  const reportClassLabel = config.issueOnly
    ? 'REPORT CLASS · ISSUE-ONLY REVIEW'
    : 'REPORT CLASS · STANDARD CLIENT COPY';

  const companyInfoItems = [
    ['Company', SPARKERY_COMPANY_PROFILE.name],
    ['Phone', SPARKERY_COMPANY_PROFILE.phone],
    ['Email', SPARKERY_COMPANY_PROFILE.email],
    ['Website', SPARKERY_COMPANY_PROFILE.website],
    ['Service Area', SPARKERY_COMPANY_PROFILE.serviceArea],
    ['Report ID', inspection.id || 'N/A'],
  ];
  const companyInfoHtml = companyInfoItems
    .map(
      ([label, value]) =>
        `<div class="company-item"><span class="company-label">${escapeHtml(label)}</span>${escapeHtml(toAsciiText(value, 'N/A'))}</div>`
    )
    .join('');

  return `
  <div class="page cover-page cover-style-${config.coverVariant}">
    <div class="cover-banner">
      <div class="cover-brand">Sparkery</div>
      <div class="cover-title">清洁检查报告</div>
      <div class="cover-subtitle">Cleaning Inspection Report · ${safeFormattedDate} · ${safePresetLabel}</div>
      <div class="cover-class-strip">${reportClassLabel}</div>
      <div class="cover-tag-row">
        <span class="cover-service-tag">${safeServiceLabel}</span>
        ${modeChipHtml}
        ${clientChipHtml}
      </div>
    </div>

    <div class="cover-body">
      <table class="info-table">
        <tr><td class="label-cell">房产名称 / Property</td><td class="value-cell">${safePropertyId}</td></tr>
        <tr><td class="label-cell">地址 / Address</td><td class="value-cell">${safePropertyAddressPreview}</td></tr>
        <tr><td class="label-cell">退房日期 / Check-out Date</td><td class="value-cell">${safeFormattedDate}</td></tr>
        <tr><td class="label-cell">清洁人员 / Cleaner</td><td class="value-cell">${safeCleanerName}</td></tr>
        <tr><td class="label-cell">清洁时长 / Duration</td><td class="value-cell">${escapeHtml(durationStr)}</td></tr>
        <tr><td class="label-cell">房间 / 照片 / 损坏</td><td class="value-cell">${roomCount} 个房间 · ${totalPhotos} 张照片 · ${damageCount} 处损坏</td></tr>
        <tr><td class="label-cell">备注 / Notes</td><td class="value-cell">${safePropertyNotesPreview}</td></tr>
        <tr><td class="label-cell">提交时间 / Submitted</td><td class="value-cell">${safeSubmittedAt}</td></tr>
      </table>

      <div class="cover-summary-strip">
        <div class="cover-summary-card">
          <div class="cover-summary-label"><span class="metric-icon">R</span>Rooms</div>
          <div class="cover-summary-value">${roomCount}</div>
        </div>
        <div class="cover-summary-card">
          <div class="cover-summary-label"><span class="metric-icon">C</span>Checklist Items</div>
          <div class="cover-summary-value">${checklistTotal}</div>
        </div>
        <div class="cover-summary-card">
          <div class="cover-summary-label"><span class="metric-icon">P</span>Pass Rate</div>
          <div class="cover-summary-value">${checklistCompletionRate}%</div>
        </div>
        <div class="cover-summary-card">
          <div class="cover-summary-label"><span class="metric-icon">D</span>Damage Reports</div>
          <div class="cover-summary-value">${damageCount}</div>
        </div>
      </div>
      ${noIssueBannerHtml}
      ${validationWarningsHtml}
      <div class="company-card">
        <div class="company-title">Company Information</div>
        <div class="company-grid">
          ${companyInfoHtml}
        </div>
      </div>

      <div class="section-heading">签到 / 签退</div>
      <div class="cio-row">
        ${formatCioBox(inspection.checkIn || null, '签到 CHECK-IN')}
        ${formatCioBox(inspection.checkOut || null, '签退 CHECK-OUT')}
      </div>

      <div class="section-heading">房间概览</div>
      <div class="room-grid">
        ${roomCardsHtml}
      </div>
    </div>

    ${buildFooterHtml(reportMeta, 'Cover')}
  </div>
  `;
}

/**
 * Damage summary page (list with thumbnails)
 */
function generateDamageSummaryPage(
  damages: DamageReport[],
  reportMeta: ReportPageMeta
): string {
  const groups: Record<'high' | 'medium' | 'low', DamageReport[]> = {
    high: [],
    medium: [],
    low: [],
  };
  damages.forEach(damage => {
    groups[inferDamageSeverity(damage)].push(damage);
  });
  const severityTitle: Record<'high' | 'medium' | 'low', string> = {
    high: 'High Severity',
    medium: 'Medium Severity',
    low: 'Low Severity',
  };
  const severityLabel: Record<'high' | 'medium' | 'low', string> = {
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };
  const itemsHtml = (['high', 'medium', 'low'] as const)
    .map(severity => {
      const groupItems = groups[severity];
      if (!groupItems.length) return '';
      const groupBody = groupItems
        .map(
          (d, idx) => `
      <div class="dmg-item severity-${severity}">
        <img class="dmg-thumb" src="${escapeHtml(d.photo)}" alt="损坏 ${idx + 1}" onerror="this.classList.add('img-fallback'); this.alt='Image unavailable';" />
        <div class="dmg-info">
          <div class="dmg-loc">${escapeHtml(d.location || '未知位置')}<span class="dmg-severity-tag ${severity}">${severityLabel[severity]}</span></div>
          <div class="dmg-desc">${escapeHtml(d.description || '无描述')}</div>
          <div class="dmg-time">${escapeHtml(dayjs(d.timestamp).format('DD/MM/YYYY HH:mm:ss'))}</div>
        </div>
      </div>`
        )
        .join('');
      return `<div class="dmg-group"><div class="dmg-group-title">${severityTitle[severity]}</div>${groupBody}</div>`;
    })
    .join('');

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">清洁前损坏报告 / Pre-Clean Damage Report</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="damage-body" style="top:16mm;">
      ${itemsHtml}
    </div>
    ${buildFooterHtml(reportMeta, 'Damage Summary')}
  </div>
  `;
}

/**
 * Damage photo page - one full-page photo per damage
 */
function generateDamagePhotoPage(
  damage: DamageReport,
  index: number,
  reportMeta: ReportPageMeta
): string {
  const severity = inferDamageSeverity(damage);
  const severityLabel: Record<'high' | 'medium' | 'low', string> = {
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };
  const loc = escapeHtml(damage.location || '未知位置');
  const desc = escapeHtml(damage.description || '');
  const caption = `损坏 #${index + 1} — ${loc}${desc ? ': ' + desc : ''} · ${severityLabel[severity]}`;

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">损坏照片 #${index + 1} — ${loc} · ${severityLabel[severity]}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${escapeHtml(damage.photo)}" alt="损坏 ${index + 1}" onerror="this.style.display='none'; var p=this.closest('.photo-area'); if(p){p.classList.add('img-fallback');}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${caption}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
    ${buildFooterHtml(reportMeta, `Damage Photo ${index + 1}`)}
  </div>
  `;
}

/**
 * Room checklist page - all checklist items for one room
 */
function generateRoomChecklistPage(
  section: RoomSection,
  sectionIdx: number,
  totalSections: number,
  config: InspectionReportRenderConfig,
  reportMeta: ReportPageMeta
): string {
  const safeSectionName = escapeHtml(section.name);
  const checklistItems = (section.checklist || [])
    .filter(item =>
      config.issueOnly
        ? !item.checked || (item.requiredPhoto && !item.photo)
        : true
    )
    .sort((a, b) => {
      const score = (item: ChecklistItem) => {
        if (item.requiredPhoto && !item.photo) return 0;
        if (!item.checked) return 1;
        return 2;
      };
      return score(a) - score(b);
    });
  const passCount = checklistItems.filter(i => i.checked).length;
  const total = checklistItems.length;
  const missingRequiredCount = checklistItems.filter(
    item => item.requiredPhoto && !item.photo
  ).length;
  const unresolvedCount = checklistItems.filter(item => !item.checked).length;
  const roomConclusion =
    missingRequiredCount > 0 || unresolvedCount > 0
      ? `ACTION NEEDED · ${Math.max(unresolvedCount, 0)} FAIL · ${missingRequiredCount} EVIDENCE MISSING`
      : 'PASS WITH EVIDENCE · READY FOR CLIENT REVIEW';
  const roomConclusionClass =
    missingRequiredCount > 0 || unresolvedCount > 0
      ? 'list-room-conclusion alert'
      : 'list-room-conclusion';

  const rowsHtml = checklistItems
    .map(item => {
      const isMissingRequired = item.requiredPhoto && !item.photo;
      const rowClass = isMissingRequired
        ? 'cl-row cl-row-missing'
        : item.checked
          ? 'cl-row'
          : 'cl-row cl-row-fail';
      const statusLabel = isMissingRequired
        ? '<span class="cl-status-label cl-status-missing">MISSING</span>'
        : item.checked
          ? '<span class="cl-status-label cl-status-pass">PASS</span>'
          : '<span class="cl-status-label cl-status-fail">FAIL</span>';
      return `
      <div class="${rowClass}">
        <div class="cl-icon ${item.checked ? 'cl-pass' : 'cl-fail'}">
          ${item.checked ? '✓' : '✗'}
        </div>
        ${statusLabel}
        <div class="cl-label">${escapeHtml(item.label)}${item.labelEn ? ` <span class="secondary-lang">(${escapeHtml(item.labelEn)})</span>` : ''}</div>
        ${item.photo ? '<span class="cl-badge cl-badge-photo">PHOTO</span>' : ''}
        ${isMissingRequired ? '<span class="cl-badge cl-badge-missing">EVIDENCE MISSING</span>' : ''}
      </div>`;
    })
    .join('');

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">检查清单 / Checklist</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="list-body" style="top:16mm;">
      <div class="list-room-title">
        <span>${sectionIdx + 1}. ${safeSectionName}</span>
        <span class="list-room-stat">${passCount} / ${total} 通过 · ${sectionIdx + 1}/${totalSections}</span>
      </div>
      <div class="${roomConclusionClass}">${roomConclusion}</div>
      ${
        missingRequiredCount > 0
          ? `<div class="room-missing-alert">Missing required photos: ${missingRequiredCount}</div>`
          : ''
      }
      ${rowsHtml}
      ${section.notes ? `<div style="margin-top:3mm;padding:2.5mm 3mm;background:#fafafa;border-radius:3px;font-size:8.5pt;color:#555;border:0.5pt solid #e0e0e0;"><strong>备注：</strong>${escapeHtml(section.notes)}</div>` : ''}
    </div>
    ${buildFooterHtml(reportMeta, `Room ${sectionIdx + 1}/${totalSections}`)}
  </div>
  `;
}

/**
 * Checklist item photo page - full page photo with item label
 */
function generateChecklistPhotoPage(
  item: ChecklistItem,
  section: RoomSection,
  sectionIdx: number,
  reportMeta: ReportPageMeta
): string {
  const safeSectionName = escapeHtml(section.name);
  const safeChecklistLabel = escapeHtml(item.label);
  const safeChecklistLabelEn = item.labelEn ? escapeHtml(item.labelEn) : '';
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">${sectionIdx + 1}. ${safeSectionName}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${escapeHtml(item.photo)}" alt="${safeChecklistLabelEn || safeChecklistLabel}" onerror="this.style.display='none'; var p=this.closest('.photo-area'); if(p){p.classList.add('img-fallback');}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${item.checked ? '✓' : '✗'} ${safeChecklistLabel}${safeChecklistLabelEn ? ` (${safeChecklistLabelEn})` : ''}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
    ${buildFooterHtml(reportMeta, `Checklist Photo ${sectionIdx + 1}`)}
  </div>
  `;
}

/**
 * Room additional photo page - full page photo
 */
function generateRoomPhotoPage(
  photo: UploadFile,
  section: RoomSection,
  sectionIdx: number,
  photoIdx: number,
  reportMeta: ReportPageMeta
): string {
  const safeSectionName = escapeHtml(section.name);
  const safePhotoName = escapeHtml(photo.name);
  const safePhotoUrl = escapeHtml(photo.url);
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">${sectionIdx + 1}. ${safeSectionName} — 补充照片 #${photoIdx + 1}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${safePhotoUrl}" alt="${safePhotoName}" onerror="this.style.display='none'; var p=this.closest('.photo-area'); if(p){p.classList.add('img-fallback');}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${safeSectionName} · 补充照片 ${photoIdx + 1}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
    ${buildFooterHtml(reportMeta, `Room Photo ${sectionIdx + 1}`)}
  </div>
  `;
}

/**
 * Open HTML in new window for printing
 */
export function openInspectionPrintWindow(htmlContent: string): Window | null {
  const printWindow = window.open(
    '',
    '_blank',
    'width=900,height=700,noopener,noreferrer'
  );
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
  return printWindow;
}

/**
 * Generate filename for the PDF
 */
export function generateInspectionFilename(
  inspection: CleaningInspection
): string {
  const dateStr = dayjs(inspection.checkOutDate).format('YYYYMMDD');
  const propertyShort = toFileToken(
    inspection.propertyId || inspection.templateName,
    'PROPERTY'
  );
  return `Sparkery_Cleaning_Report_${dateStr}_${propertyShort}.pdf`;
}
