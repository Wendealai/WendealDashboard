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
} from '@/pages/CleaningInspection/types';
import { reverseGeocode } from '@/pages/CleaningInspection/utils';

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
  inspection: CleaningInspection
): Promise<string> {
  // Pre-process: reverse-geocode check-in/out GPS if addresses are missing
  const [enrichedCheckIn, enrichedCheckOut] = await Promise.all([
    ensureGpsAddress(inspection.checkIn),
    ensureGpsAddress(inspection.checkOut),
  ]);
  // Use enriched copy for rendering
  const enriched: CleaningInspection = {
    ...inspection,
    checkIn: enrichedCheckIn,
    checkOut: enrichedCheckOut,
  };
  const formattedDate = dayjs(enriched.checkOutDate).format('DD/MM/YYYY');
  const submittedAt = enriched.submittedAt
    ? dayjs(enriched.submittedAt).format('DD/MM/YYYY HH:mm')
    : 'N/A';

  const pages: string[] = [];

  // Page 1: Cover
  pages.push(generateCoverPage(enriched, formattedDate, submittedAt));

  // Damage report pages (one photo per page)
  const damagesWithPhotos = (enriched.damageReports || []).filter(d => d.photo);
  if (damagesWithPhotos.length > 0) {
    pages.push(generateDamageSummaryPage(damagesWithPhotos));
    damagesWithPhotos.forEach((d, idx) => {
      pages.push(generateDamagePhotoPage(d, idx));
    });
  }

  // Per-room: checklist page + checklist item photos + additional photos
  enriched.sections.forEach((section, sectionIdx) => {
    // Checklist summary for this room
    if (section.checklist && section.checklist.length > 0) {
      pages.push(
        generateRoomChecklistPage(section, sectionIdx, enriched.sections.length)
      );
    }

    // Checklist item photos (one per page, labeled with the item)
    const itemsWithPhotos = (section.checklist || []).filter(i => i.photo);
    itemsWithPhotos.forEach(item => {
      pages.push(generateChecklistPhotoPage(item, section, sectionIdx));
    });

    // Additional room photos (one per page)
    (section.photos || []).forEach((photo, photoIdx) => {
      pages.push(generateRoomPhotoPage(photo, section, sectionIdx, photoIdx));
    });
  });

  // Add page numbers
  const totalPages = pages.length;
  const numberedPages = pages.map((html, idx) =>
    html
      .replace(/\{PAGE_NUM\}/g, String(idx + 1))
      .replace(/\{TOTAL_PAGES\}/g, String(totalPages))
  );

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>清洁检查报告 - ${enriched.id}</title>
  <style>
    ${generatePrintStyles()}
  </style>
</head>
<body>
  ${numberedPages.join('\n')}
  <script>
    window.onload = function() {
      var images = document.querySelectorAll('img');
      var loaded = 0;
      if (images.length === 0) { setTimeout(function(){ window.print(); }, 300); return; }
      images.forEach(function(img) {
        if (img.complete) { loaded++; if (loaded >= images.length) setTimeout(function(){ window.print(); }, 300); }
        else { img.onload = img.onerror = function() { loaded++; if (loaded >= images.length) setTimeout(function(){ window.print(); }, 300); }; }
      });
    };
  </script>
</body>
</html>
  `;
}

/**
 * Print-optimized CSS - clean, high-contrast, professional
 */
function generatePrintStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #222;
      background: #fff;
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
      background: #389e0d;
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
      background: #389e0d;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #fff;
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
    }
    .cover-subtitle {
      font-size: 9pt;
      opacity: 0.8;
      margin-top: 2mm;
    }

    .cover-body {
      position: absolute;
      top: 58mm; left: 15mm; right: 15mm; bottom: 12mm;
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
    }

    .section-heading {
      font-size: 10pt;
      font-weight: 700;
      color: #222;
      margin: 5mm 0 3mm;
      padding-bottom: 1.5mm;
      border-bottom: 1.5pt solid #389e0d;
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
      color: #389e0d;
      margin-bottom: 1.5mm;
    }
    .cio-time { font-size: 11pt; font-weight: 700; color: #222; }
    .cio-detail { font-size: 8pt; color: #888; margin-top: 0.5mm; }

    /* Room cards grid */
    .room-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .room-card {
      border: 1pt solid #e0e0e0;
      border-radius: 3px;
      padding: 2.5mm 3mm;
    }
    .room-card-name { font-size: 9pt; font-weight: 700; color: #333; }
    .room-card-stat { font-size: 7.5pt; color: #888; margin-top: 0.5mm; }

    .cover-footer-line {
      position: absolute;
      bottom: 5mm; left: 15mm; right: 15mm;
      text-align: center;
      font-size: 7pt;
      color: #bbb;
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
      border-bottom: 1.5pt solid #389e0d;
      margin-bottom: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
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
      padding: 2mm 0;
      border-bottom: 0.3pt solid #f0f0f0;
      font-size: 9pt;
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
    .cl-pass { background: #f6ffed; color: #389e0d; border: 0.5pt solid #b7eb8f; }
    .cl-fail { background: #fff2f0; color: #cf1322; border: 0.5pt solid #ffa39e; }
    .cl-label { flex: 1; color: #333; }
    .cl-badge {
      font-size: 7pt;
      padding: 0.5mm 2mm;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .cl-badge-photo { background: #f0f9eb; color: #389e0d; }
    .cl-badge-missing { background: #fff2f0; color: #cf1322; }

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
      border-radius: 3px;
      background: #fffbe6;
    }
    .dmg-thumb {
      width: 22mm; height: 16mm;
      object-fit: cover;
      border-radius: 2px;
      border: 0.5pt solid #d9d9d9;
      flex-shrink: 0;
    }
    .dmg-info { flex: 1; }
    .dmg-loc { font-size: 9pt; font-weight: 700; color: #d46b08; }
    .dmg-desc { font-size: 8.5pt; color: #555; margin-top: 0.5mm; }
    .dmg-time { font-size: 7.5pt; color: #aaa; margin-top: 0.5mm; }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { margin: 0; box-shadow: none; }
      html, body { height: auto; overflow: visible; }
    }
    @media screen {
      body { background: #e8e8e8; padding: 10mm; }
      .page { margin: 0 auto 10mm; box-shadow: 0 2px 16px rgba(0,0,0,0.12); }
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
    locationLine = `<div class="cio-detail" style="font-weight:600;">📍 ${data.gpsAddress}</div>`;
    if (coordsStr) {
      locationLine += `<div class="cio-detail" style="font-size:7pt;color:#888;">${coordsStr}</div>`;
    }
  } else if (hasCoords) {
    locationLine = `<div class="cio-detail">GPS: ${coordsStr}</div>`;
  } else {
    locationLine = `<div class="cio-detail" style="color:#ccc;">GPS: N/A</div>`;
  }

  const keyLine = data.keyReturnMethod
    ? `<div class="cio-detail" style="color:#d46b08;">钥匙归还: ${data.keyReturnMethod}</div>`
    : '';
  return `
    <div class="cio-box">
      <div class="cio-label">${label}</div>
      <div class="cio-time">${time}</div>
      <div class="cio-detail">${date}</div>
      ${locationLine}
      ${keyLine}
    </div>
  `;
}

/**
 * Cover page: property info, check-in/out, room overview
 */
function generateCoverPage(
  inspection: CleaningInspection,
  formattedDate: string,
  submittedAt: string
): string {
  const roomCount = inspection.sections.length;
  const totalPhotos = inspection.sections.reduce(
    (sum, s) =>
      sum +
      (s.photos || []).length +
      (s.checklist || []).filter(i => i.photo).length,
    0
  );
  const damageCount = (inspection.damageReports || []).length;
  const cleanerName =
    inspection.assignedEmployee?.name || inspection.submitterName || 'N/A';

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
      const photoCount =
        (s.photos || []).length +
        (s.checklist || []).filter(i => i.photo).length;
      const checked = (s.checklist || []).filter(i => i.checked).length;
      const total = (s.checklist || []).length;
      return `
        <div class="room-card">
          <div class="room-card-name">${idx + 1}. ${s.name}</div>
          <div class="room-card-stat">${photoCount} 张照片${total ? ` · ${checked}/${total} 完成` : ''}</div>
        </div>`;
    })
    .join('');

  return `
  <div class="page">
    <div class="cover-banner">
      <div class="cover-brand">Sparkery</div>
      <div class="cover-title">清洁检查报告</div>
      <div class="cover-subtitle">Cleaning Inspection Report</div>
    </div>

    <div class="cover-body">
      <table class="info-table">
        <tr><td class="label-cell">房产名称 / Property</td><td class="value-cell">${inspection.propertyId || 'N/A'}</td></tr>
        <tr><td class="label-cell">地址 / Address</td><td class="value-cell">${inspection.propertyAddress || 'N/A'}</td></tr>
        <tr><td class="label-cell">退房日期 / Check-out Date</td><td class="value-cell">${formattedDate}</td></tr>
        <tr><td class="label-cell">清洁人员 / Cleaner</td><td class="value-cell">${cleanerName}</td></tr>
        <tr><td class="label-cell">清洁时长 / Duration</td><td class="value-cell">${durationStr}</td></tr>
        <tr><td class="label-cell">房间 / 照片 / 损坏</td><td class="value-cell">${roomCount} 个房间 · ${totalPhotos} 张照片 · ${damageCount} 处损坏</td></tr>
        <tr><td class="label-cell">提交时间 / Submitted</td><td class="value-cell">${submittedAt}</td></tr>
      </table>

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

    <div class="cover-footer-line">
      Sparkery Cleaning Services · 第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页 · ${inspection.id}
    </div>
  </div>
  `;
}

/**
 * Damage summary page (list with thumbnails)
 */
function generateDamageSummaryPage(damages: DamageReport[]): string {
  const itemsHtml = damages
    .map(
      (d, idx) => `
      <div class="dmg-item">
        <img class="dmg-thumb" src="${d.photo}" alt="损坏 ${idx + 1}" />
        <div class="dmg-info">
          <div class="dmg-loc">${d.location || '未知位置'}</div>
          <div class="dmg-desc">${d.description || '无描述'}</div>
          <div class="dmg-time">${dayjs(d.timestamp).format('DD/MM/YYYY HH:mm:ss')}</div>
        </div>
      </div>`
    )
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
  </div>
  `;
}

/**
 * Damage photo page - one full-page photo per damage
 */
function generateDamagePhotoPage(damage: DamageReport, index: number): string {
  const loc = damage.location || '未知位置';
  const desc = damage.description || '';
  const caption = `损坏 #${index + 1} — ${loc}${desc ? ': ' + desc : ''}`;

  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">损坏照片 #${index + 1} — ${loc}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${damage.photo}" alt="损坏 ${index + 1}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${caption}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
  </div>
  `;
}

/**
 * Room checklist page - all checklist items for one room
 */
function generateRoomChecklistPage(
  section: RoomSection,
  sectionIdx: number,
  totalSections: number
): string {
  const passCount = section.checklist.filter(i => i.checked).length;
  const total = section.checklist.length;

  const rowsHtml = section.checklist
    .map(
      item => `
      <div class="cl-row">
        <div class="cl-icon ${item.checked ? 'cl-pass' : 'cl-fail'}">
          ${item.checked ? '✓' : '✗'}
        </div>
        <div class="cl-label">${item.label}${item.labelEn ? ` <span style="color:#888;font-size:11px">(${item.labelEn})</span>` : ''}</div>
        ${item.photo ? '<span class="cl-badge cl-badge-photo">📷 已拍照</span>' : ''}
        ${item.requiredPhoto && !item.photo ? '<span class="cl-badge cl-badge-missing">⚠ 缺少照片</span>' : ''}
      </div>`
    )
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
        <span>${sectionIdx + 1}. ${section.name}</span>
        <span class="list-room-stat">${passCount} / ${total} 通过</span>
      </div>
      ${rowsHtml}
      ${section.notes ? `<div style="margin-top:3mm;padding:2.5mm 3mm;background:#fafafa;border-radius:3px;font-size:8.5pt;color:#555;border:0.5pt solid #e0e0e0;"><strong>备注：</strong>${section.notes}</div>` : ''}
    </div>
  </div>
  `;
}

/**
 * Checklist item photo page - full page photo with item label
 */
function generateChecklistPhotoPage(
  item: ChecklistItem,
  section: RoomSection,
  sectionIdx: number
): string {
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">${sectionIdx + 1}. ${section.name}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${item.photo}" alt="${item.labelEn || item.label}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${item.checked ? '✓' : '✗'} ${item.label}${item.labelEn ? ` (${item.labelEn})` : ''}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
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
  photoIdx: number
): string {
  return `
  <div class="page">
    <div class="page-bar"></div>
    <div class="page-topline">
      <div class="topline-left">${sectionIdx + 1}. ${section.name} — 补充照片 #${photoIdx + 1}</div>
      <div class="topline-right">第 {PAGE_NUM} 页 / 共 {TOTAL_PAGES} 页</div>
    </div>
    <div class="photo-area">
      <img src="${photo.url}" alt="${photo.name}" />
    </div>
    <div class="photo-caption">
      <div class="caption-text">${section.name} · 补充照片 ${photoIdx + 1}</div>
      <div class="caption-page">{PAGE_NUM} / {TOTAL_PAGES}</div>
    </div>
  </div>
  `;
}

/**
 * Open HTML in new window for printing
 */
export function openInspectionPrintWindow(htmlContent: string): Window | null {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
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
  return `Cleaning_Inspection_${dateStr}_${inspection.id}.pdf`;
}
