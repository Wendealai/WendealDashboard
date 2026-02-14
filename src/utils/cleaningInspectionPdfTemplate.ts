/**
 * Cleaning Inspection PDF Template System
 * Professional HTML-based PDF generation with Sparkery brand green styling
 *
 * Features:
 * - Cover page with property info, check-in/out, damage summary, room overview
 * - Checklist summary pages per room
 * - One image per page with description
 * - Sparkery brand green color scheme
 * - Print-optimized CSS for browser PDF conversion
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

/**
 * Generate the complete HTML document for PDF printing
 */
export function generateInspectionPdfHtml(
  inspection: CleaningInspection
): string {
  const formattedDate = dayjs(inspection.checkOutDate).format('DD/MM/YYYY');
  const submittedAt = inspection.submittedAt
    ? dayjs(inspection.submittedAt).format('DD/MM/YYYY HH:mm')
    : 'N/A';

  // Count pages
  const damagePhotoCount = inspection.damageReports.filter(d => d.photo).length;
  const imagePageCount = inspection.sections.reduce(
    (sum, s) => sum + s.photos.length,
    0
  );
  // Pages: cover + checklist summary + damage photos + room photos
  const hasChecklist = inspection.sections.some(s => s.checklist?.length > 0);
  const totalPages =
    1 + // cover
    (hasChecklist ? 1 : 0) + // checklist summary
    (damagePhotoCount > 0 ? 1 : 0) + // damage report page
    imagePageCount; // room photos

  let currentPage = 1;

  // Generate cover page
  const coverPage = generateCoverPage(
    inspection,
    formattedDate,
    submittedAt,
    currentPage,
    totalPages
  );
  currentPage++;

  // Generate checklist summary page
  let checklistPage = '';
  if (hasChecklist) {
    checklistPage = generateChecklistSummaryPage(
      inspection.sections,
      currentPage,
      totalPages
    );
    currentPage++;
  }

  // Generate damage report page
  let damagePage = '';
  if (damagePhotoCount > 0) {
    damagePage = generateDamageReportPage(
      inspection.damageReports,
      currentPage,
      totalPages
    );
    currentPage++;
  }

  // Generate image pages
  const imagePages: string[] = [];
  inspection.sections.forEach((section, sectionIndex) => {
    (section.photos || []).forEach(photo => {
      imagePages.push(
        generateImagePage(
          photo,
          section,
          sectionIndex,
          currentPage,
          totalPages,
          inspection.id
        )
      );
      currentPage++;
    });
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cleaning Inspection Report - ${inspection.id}</title>
  <style>
    ${generatePrintStyles()}
  </style>
</head>
<body>
  ${coverPage}
  ${checklistPage}
  ${damagePage}
  ${imagePages.join('\n  ')}
  
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
 * Generate print-optimized CSS styles with Sparkery green theme
 */
function generatePrintStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', 'Arial', 'Microsoft YaHei', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
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
      background: #ffffff;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }

    /* ── Header ── */
    .page-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 30mm;
      padding: 6mm 15mm;
      background: linear-gradient(135deg, #005901 0%, #389e0d 100%);
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title { font-size: 13pt; font-weight: 600; letter-spacing: 0.5px; }
    .header-subtitle { font-size: 8pt; opacity: 0.85; margin-top: 1mm; }
    .page-number { font-size: 16pt; font-weight: 700; }
    .page-total { font-size: 8pt; opacity: 0.85; }

    /* ── Content ── */
    .page-content {
      position: absolute;
      top: 34mm; left: 12mm; right: 12mm; bottom: 40mm;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f8faf8;
      border: 1px solid #d9f7be;
      border-radius: 4px;
      overflow: hidden;
    }
    .page-content img { max-width: 100%; max-height: 100%; object-fit: contain; }

    /* ── Footer ── */
    .page-footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 36mm;
      padding: 4mm 15mm;
      background: #f7faf7;
      border-top: 2px solid #52c41a;
    }
    .footer-section-title { font-size: 9pt; font-weight: 600; color: #389e0d; margin-bottom: 1mm; }
    .footer-description { font-size: 9pt; color: #4a5568; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
    .footer-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 2mm; border-top: 1px solid #e2e8f0; margin-top: 3mm; }
    .footer-reference { font-size: 8pt; font-family: 'Consolas', monospace; color: #718096; background: #f0f9eb; padding: 1mm 3mm; border-radius: 2px; }
    .footer-tag { font-size: 7pt; color: #fff; background: #52c41a; padding: 1mm 3mm; border-radius: 2px; text-transform: uppercase; font-weight: 600; }

    /* ── Cover Page ── */
    .cover-page { background: linear-gradient(180deg, #005901 0%, #389e0d 38%, #ffffff 38%); }
    .cover-header {
      position: absolute; top: 0; left: 0; right: 0;
      height: 90mm; padding: 18mm 15mm;
      color: #ffffff; text-align: center;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
    }
    .cover-logo { font-size: 26pt; font-weight: 700; letter-spacing: 3px; margin-bottom: 4mm; }
    .cover-title { font-size: 18pt; font-weight: 600; margin-bottom: 2mm; }
    .cover-subtitle { font-size: 10pt; opacity: 0.9; }
    .cover-content { position: absolute; top: 95mm; left: 15mm; right: 15mm; bottom: 18mm; overflow: hidden; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-bottom: 5mm; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 8pt; color: #718096; font-weight: 500; margin-bottom: 0.5mm; }
    .info-value { font-size: 10pt; color: #1a202c; font-weight: 600; }
    .info-value.highlight { color: #52c41a; }
    .divider { height: 1px; background: #e2e8f0; margin: 4mm 0; }
    .section-title { font-size: 10pt; font-weight: 600; color: #389e0d; margin-bottom: 3mm; }
    .cover-footer { position: absolute; bottom: 4mm; left: 15mm; right: 15mm; text-align: center; font-size: 7pt; color: #a0aec0; }

    /* ── Room cards on cover ── */
    .room-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .room-card { background: #f0f9eb; border: 1px solid #d9f7be; padding: 3mm; border-radius: 3px; }
    .room-card-name { font-weight: 600; color: #389e0d; font-size: 9pt; margin-bottom: 1mm; }
    .room-card-info { font-size: 8pt; color: #666; }

    /* ── Checklist Summary ── */
    .checklist-content { position: absolute; top: 34mm; left: 12mm; right: 12mm; bottom: 14mm; overflow: hidden; }
    .room-checklist-block { margin-bottom: 4mm; }
    .room-checklist-title { font-size: 10pt; font-weight: 600; color: #005901; background: #f0f9eb; padding: 2mm 4mm; border-radius: 3px; margin-bottom: 2mm; }
    .checklist-row { display: flex; align-items: center; gap: 2mm; padding: 1.5mm 4mm; border-bottom: 0.5px solid #f0f0f0; font-size: 9pt; }
    .checklist-row:last-child { border-bottom: none; }
    .check-icon { font-size: 10pt; width: 14px; text-align: center; }
    .check-pass { color: #52c41a; }
    .check-fail { color: #ff4d4f; }
    .photo-badge { font-size: 7pt; color: #389e0d; background: #f0f9eb; padding: 0.5mm 2mm; border-radius: 2px; margin-left: auto; }

    /* ── Damage Report ── */
    .damage-content { position: absolute; top: 34mm; left: 12mm; right: 12mm; bottom: 14mm; overflow: hidden; }
    .damage-item { display: flex; gap: 4mm; margin-bottom: 4mm; padding: 3mm; background: #fff7e6; border: 1px solid #ffd591; border-radius: 4px; }
    .damage-photo { width: 50mm; height: 35mm; object-fit: cover; border-radius: 3px; border: 1px solid #d9d9d9; }
    .damage-details { flex: 1; }
    .damage-location { font-weight: 600; color: #d46b08; font-size: 10pt; margin-bottom: 1mm; }
    .damage-desc { font-size: 9pt; color: #595959; margin-bottom: 1mm; }
    .damage-time { font-size: 8pt; color: #8c8c8c; }

    /* ── Check-in/out info ── */
    .checkinout-row { display: flex; gap: 4mm; margin-bottom: 3mm; }
    .checkinout-box { flex: 1; background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 4px; padding: 3mm; }
    .checkinout-label { font-size: 8pt; color: #389e0d; font-weight: 600; margin-bottom: 1mm; }
    .checkinout-value { font-size: 9pt; color: #262626; }

    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { margin: 0; box-shadow: none; }
      html, body { height: auto; overflow: visible; }
    }
    @media screen {
      body { background: #e2e8f0; padding: 10mm; }
      .page { margin: 0 auto 10mm; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    }
  `;
}

/**
 * Format check-in/out info for display
 */
function formatCheckInOut(data: CheckInOut | null, label: string): string {
  if (!data)
    return `<div class="checkinout-box"><div class="checkinout-label">${label}</div><div class="checkinout-value">N/A</div></div>`;
  const time = dayjs(data.timestamp).format('HH:mm:ss');
  const date = dayjs(data.timestamp).format('DD/MM/YYYY');
  const gps =
    data.gpsLat !== null && data.gpsLng !== null
      ? `${data.gpsLat.toFixed(4)}, ${data.gpsLng.toFixed(4)}`
      : 'GPS N/A';
  const addr = data.gpsAddress || '';
  return `
    <div class="checkinout-box">
      <div class="checkinout-label">${label}</div>
      <div class="checkinout-value">${date} ${time}</div>
      <div style="font-size:8pt;color:#718096;margin-top:1mm;">GPS: ${gps}</div>
      ${addr ? `<div style="font-size:8pt;color:#718096;">${addr}</div>` : ''}
      ${data.keyReturnMethod ? `<div style="font-size:8pt;color:#d46b08;margin-top:1mm;">Key: ${data.keyReturnMethod}</div>` : ''}
    </div>
  `;
}

/**
 * Generate cover page HTML
 */
function generateCoverPage(
  inspection: CleaningInspection,
  formattedDate: string,
  submittedAt: string,
  currentPage: number,
  totalPages: number
): string {
  const roomCount = inspection.sections.length;
  const photoCount = inspection.sections.reduce(
    (sum, s) => sum + (s.photos || []).length,
    0
  );
  const damageCount = (inspection.damageReports || []).length;

  // Build room cards HTML
  const roomCardsHtml = inspection.sections
    .map(
      (s, idx) => `
      <div class="room-card">
        <div class="room-card-name">${idx + 1}. ${s.name}</div>
        <div class="room-card-info">${(s.photos || []).length} photos${s.checklist?.length ? ` · ${s.checklist.filter(i => i.checked).length}/${s.checklist.length} checked` : ''}</div>
      </div>`
    )
    .join('');

  // Check-in/out HTML
  const checkInOutHtml = `
    <div class="checkinout-row">
      ${formatCheckInOut(inspection.checkIn || null, 'CHECK-IN')}
      ${formatCheckInOut(inspection.checkOut || null, 'CHECK-OUT')}
    </div>
  `;

  // Duration
  let durationHtml = '';
  if (inspection.checkIn?.timestamp && inspection.checkOut?.timestamp) {
    const diffMin = dayjs(inspection.checkOut.timestamp).diff(
      dayjs(inspection.checkIn.timestamp),
      'minute'
    );
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    durationHtml = `<div class="info-item"><span class="info-label">Duration</span><span class="info-value highlight">${hrs}h ${mins}m</span></div>`;
  }

  return `
  <div class="page cover-page">
    <div class="cover-header">
      <div class="cover-logo">SPARKERY</div>
      <div class="cover-title">Cleaning Inspection Report</div>
      <div class="cover-subtitle">Property Inspection Documentation</div>
    </div>
    
    <div class="cover-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Inspection ID</span>
          <span class="info-value" style="font-size:9pt;">${inspection.id}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Property</span>
          <span class="info-value">${inspection.propertyId || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Address</span>
          <span class="info-value">${inspection.propertyAddress || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Check-out Date</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Cleaner</span>
          <span class="info-value">${inspection.submitterName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Rooms / Photos / Damages</span>
          <span class="info-value">${roomCount} / ${photoCount} / ${damageCount}</span>
        </div>
        ${durationHtml}
        <div class="info-item">
          <span class="info-label">Submitted</span>
          <span class="info-value">${submittedAt}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      ${checkInOutHtml}
      <div class="divider"></div>

      <div class="section-title">Room Sections</div>
      <div class="room-grid">
        ${roomCardsHtml}
      </div>
    </div>
    
    <div class="cover-footer">
      Sparkery Cleaning Services &middot; Professional Inspection Report &middot; Page ${currentPage} of ${totalPages}
    </div>
  </div>
  `;
}

/**
 * Generate checklist summary page - all rooms on one page
 */
function generateChecklistSummaryPage(
  sections: RoomSection[],
  currentPage: number,
  totalPages: number
): string {
  const blocksHtml = sections
    .filter(s => s.checklist && s.checklist.length > 0)
    .map(s => {
      const itemsHtml = s.checklist
        .map(
          item => `
          <div class="checklist-row">
            <span class="check-icon ${item.checked ? 'check-pass' : 'check-fail'}">
              ${item.checked ? '✓' : '✗'}
            </span>
            <span style="${item.checked ? '' : 'color:#ff4d4f;'}">${item.label}</span>
            ${item.photo ? '<span class="photo-badge">📷 Photo</span>' : ''}
            ${item.requiredPhoto && !item.photo ? '<span style="font-size:7pt;color:#ff4d4f;margin-left:auto;">⚠ Missing photo</span>' : ''}
          </div>`
        )
        .join('');

      const passCount = s.checklist.filter(i => i.checked).length;
      const total = s.checklist.length;

      return `
        <div class="room-checklist-block">
          <div class="room-checklist-title">${s.name} — ${passCount}/${total} passed</div>
          ${itemsHtml}
        </div>
      `;
    })
    .join('');

  return `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="header-title">Checklist Summary</div>
        <div class="header-subtitle">All room inspection results</div>
      </div>
      <div style="text-align:right;">
        <div class="page-number">${currentPage}</div>
        <div class="page-total">of ${totalPages}</div>
      </div>
    </div>
    <div class="checklist-content">
      ${blocksHtml}
    </div>
  </div>
  `;
}

/**
 * Generate damage report page
 */
function generateDamageReportPage(
  damages: DamageReport[],
  currentPage: number,
  totalPages: number
): string {
  const itemsHtml = damages
    .filter(d => d.photo)
    .map(
      d => `
      <div class="damage-item">
        <img class="damage-photo" src="${d.photo}" alt="Damage" />
        <div class="damage-details">
          <div class="damage-location">📍 ${d.location || 'Unknown location'}</div>
          <div class="damage-desc">${d.description || 'No description'}</div>
          <div class="damage-time">${dayjs(d.timestamp).format('DD/MM/YYYY HH:mm:ss')}</div>
        </div>
      </div>`
    )
    .join('');

  return `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="header-title">Pre-Clean Damage Report</div>
        <div class="header-subtitle">Existing damage documented before cleaning</div>
      </div>
      <div style="text-align:right;">
        <div class="page-number">${currentPage}</div>
        <div class="page-total">of ${totalPages}</div>
      </div>
    </div>
    <div class="damage-content">
      ${itemsHtml}
    </div>
  </div>
  `;
}

/**
 * Generate image page HTML - one image per page with description
 */
function generateImagePage(
  photo: UploadFile,
  section: RoomSection,
  sectionIndex: number,
  currentPage: number,
  totalPages: number,
  inspectionId: string
): string {
  const description =
    section.notes || section.description || 'No description provided';

  return `
  <div class="page">
    <div class="page-header">
      <div>
        <div class="header-title">${sectionIndex + 1}. ${section.name}</div>
        <div class="header-subtitle">${section.description}</div>
      </div>
      <div style="text-align:right;">
        <div class="page-number">${currentPage}</div>
        <div class="page-total">of ${totalPages}</div>
      </div>
    </div>
    
    <div class="page-content">
      <img src="${photo.url}" alt="${photo.name}" />
    </div>
    
    <div class="page-footer">
      <div style="display:flex;flex-direction:column;height:100%;">
        <div class="footer-section-title">${section.name}</div>
        <div class="footer-description">${description}</div>
        <div class="footer-meta">
          <div style="display:flex;gap:3mm;align-items:center;">
            <span class="footer-reference">Ref: ${inspectionId}_${section.id}_${photo.uid}</span>
            <span class="footer-tag">${section.name}</span>
          </div>
          <div style="font-size:7pt;color:#a0aec0;">${photo.name}</div>
        </div>
      </div>
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
