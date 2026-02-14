/**
 * China Procurement Documentation PDF Template System
 * Professional HTML-based PDF generation with Sparkery brand green styling
 *
 * Features:
 * - Sparkery brand green color scheme (#52c41a / #005901)
 * - Fixed layout: header (title + page number), content (image), footer (description)
 * - One image per page with corresponding description
 * - Responsive image sizing with aspect ratio preservation
 * - Print-optimized CSS for browser PDF conversion (A4)
 * - Purchase details table with automatic multi-page overflow
 * - Professional typography and spacing
 */

import dayjs from 'dayjs';

// ──────────────────────────── Interfaces ────────────────────────────

export interface DocImage {
  id: string;
  file: string;
  name: string;
  description: string;
  size: number;
  uploadTime: string;
}

export interface DocSection {
  id: string;
  folderName: string;
  title: string;
  description: string;
  required: boolean;
  tag?: string;
  images: DocImage[];
}

export interface PurchaseRecord {
  id: string;
  purchaseDate: string;
  supplierName: string;
  supplierPlatform: string;
  productName: string;
  category: string;
  amountCNY: number;
  amountAUD: number;
  exchangeRate: number;
  notes: string;
  sections: DocSection[];
  createdAt: string;
}

/** 采购明细条目（与 ChinaProcurementReport 中的 PurchaseItem 一致） */
export interface PdfPurchaseItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

// ──────────────────────────── Constants ─────────────────────────────

interface Platform {
  value: string;
  label: string;
}

interface Category {
  value: string;
  label: string;
}

const PLATFORMS: Platform[] = [
  { value: '1688', label: '1688.com' },
  { value: 'pinduoduo', label: 'Pinduoduo' },
  { value: 'taobao', label: 'Taobao' },
  { value: 'tmall', label: 'Tmall' },
  { value: 'jd', label: 'JD.com' },
  { value: 'alibaba', label: 'Alibaba.com' },
  { value: 'wechat', label: 'WeChat Store' },
  { value: 'other', label: 'Other Platform' },
];

const CATEGORIES: Category[] = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'office', label: 'Office Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

/**
 * Sparkery 品牌色板
 * Brand color tokens used throughout the PDF template
 */
const COLORS = {
  /** 品牌深绿（用于标题、边框、表头背景） */
  brandDark: '#005901',
  /** 品牌主绿（按钮、高亮、图标） */
  brandPrimary: '#52c41a',
  /** 品牌中绿 */
  brandMedium: '#389e0d',
  /** 浅绿背景 */
  greenBgLight: '#f6ffed',
  /** 浅绿边框 */
  greenBorder: '#d9f7be',
  /** 表头行背景 */
  tableHeaderBg: '#f4f8f4',
  /** 正文深色 */
  textDark: '#1a202c',
  /** 正文中色 */
  textMedium: '#4a5568',
  /** 正文浅色 */
  textLight: '#718096',
  /** 辅助浅色 */
  textMuted: '#a0aec0',
  /** 浅灰背景 */
  bgSubtle: '#f7fafc',
  /** 常规边框 */
  border: '#e8ecf1',
  /** 浅边框 */
  borderLight: '#edf2f7',
  /** 红色（金额） */
  red: '#cf1322',
  /** 白色 */
  white: '#ffffff',
};

// ──────────────────────── Main Entry Point ──────────────────────────

/**
 * Generate the complete HTML document for PDF printing
 * @param record  采购记录数据
 * @param dailySeq  当天序号
 * @param purchaseItems  采购明细列表（可选）
 */
export function generatePdfHtml(
  record: PurchaseRecord,
  dailySeq: number,
  purchaseItems?: PdfPurchaseItem[]
): string {
  const dateStr = dayjs(record.purchaseDate).format('YYYYMMDD');
  const dailySeqStr = dailySeq.toString().padStart(3, '0');
  const formattedDate = dayjs(record.purchaseDate).format('DD/MM/YYYY');
  const platformLabel =
    PLATFORMS.find(p => p.value === record.supplierPlatform)?.label ||
    record.supplierPlatform;
  const categoryLabel =
    CATEGORIES.find(c => c.value === record.category)?.label || record.category;

  // Filter sections with images
  const sectionsWithImages = record.sections.filter(s => s.images.length > 0);

  // Calculate total pages (cover + image pages)
  const totalImagePages = sectionsWithImages.reduce(
    (sum, s) => sum + s.images.length,
    0
  );
  const totalPages = 1 + totalImagePages;

  let currentPage = 1;
  let globalImgIndex = 0;

  // Filter valid purchase items (non-empty)
  const validPurchaseItems = (purchaseItems || []).filter(
    item =>
      item.productName.trim() !== '' || item.unitPrice > 0 || item.quantity > 1
  );

  // Generate cover page
  const coverPage = generateCoverPage(
    record,
    dateStr,
    dailySeqStr,
    formattedDate,
    platformLabel,
    categoryLabel,
    currentPage,
    totalPages,
    validPurchaseItems
  );
  currentPage++;

  // Generate image pages
  const imagePages: string[] = [];
  sectionsWithImages.forEach((section, sectionIndex) => {
    section.images.forEach(img => {
      globalImgIndex++;
      const imgSeqStr = globalImgIndex.toString().padStart(3, '0');
      const imgRef = `${dateStr}_${dailySeqStr}_${imgSeqStr}`;

      imagePages.push(
        generateImagePage(
          img,
          section,
          sectionIndex,
          imgRef,
          currentPage,
          totalPages
        )
      );
      currentPage++;
    });
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>China Procurement Report - ${dateStr}_${dailySeqStr}</title>
  <style>${generatePrintStyles()}</style>
</head>
<body>
  ${coverPage}
  ${imagePages.join('\n  ')}

  <script>
    window.onload = function() {
      // Wait for images to fully load before triggering print
      var imgs = document.querySelectorAll('img');
      var loaded = 0;
      var total = imgs.length;
      if (total === 0) { setTimeout(function(){ window.print(); }, 300); return; }
      imgs.forEach(function(img) {
        if (img.complete) { loaded++; }
        else { img.onload = img.onerror = function() { loaded++; if (loaded >= total) setTimeout(function(){ window.print(); }, 200); }; }
      });
      if (loaded >= total) setTimeout(function(){ window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

// ──────────────────────── Print Styles ──────────────────────────────

/**
 * Generate print-optimized CSS styles with Sparkery green theme
 * 全局样式表：包括重置、字体、A4 页面、封面、图片页、打印和屏幕预览
 */
function generatePrintStyles(): string {
  return `
    /* ── Reset ───────────────────────────────────── */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Base Typography ─────────────────────────── */
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue',
                   'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: ${COLORS.textDark};
      background: ${COLORS.white};
      -webkit-font-smoothing: antialiased;
    }

    /* ── A4 Page Setup ───────────────────────────── */
    @page { size: A4 portrait; margin: 0; }

    .page {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      position: relative;
      background: ${COLORS.white};
      overflow: hidden;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .page:last-child { page-break-after: auto; }

    /* ══════════════════════════════════════════════
       COVER PAGE
       ══════════════════════════════════════════════ */

    .cover-page {
      background: ${COLORS.white};
    }

    /* ── Cover Top Banner ──────────────────────── */
    .cover-banner {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 88mm;
      background: linear-gradient(135deg, ${COLORS.brandDark} 0%, ${COLORS.brandMedium} 60%, ${COLORS.brandPrimary} 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: ${COLORS.white};
      padding: 0 20mm;
    }

    .cover-brand {
      font-size: 11pt;
      font-weight: 500;
      letter-spacing: 6px;
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 4mm;
    }

    .cover-title {
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 3mm;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 11pt;
      font-weight: 400;
      opacity: 0.85;
      letter-spacing: 0.5px;
    }

    /* ── Decorative accent line below banner ──── */
    .cover-accent {
      position: absolute;
      top: 88mm; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, ${COLORS.brandPrimary}, ${COLORS.brandDark}, ${COLORS.brandPrimary});
    }

    /* ── Cover Content Area ────────────────────── */
    .cover-body {
      position: absolute;
      top: 96mm;
      left: 18mm;
      right: 18mm;
      bottom: 18mm;
      display: flex;
      flex-direction: column;
    }

    /* ── Info Grid ─────────────────────────────── */
    .info-section-title {
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${COLORS.brandDark};
      border-bottom: 2px solid ${COLORS.brandDark};
      padding-bottom: 2mm;
      margin-bottom: 4mm;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3.5mm 12mm;
      margin-bottom: 5mm;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      padding: 2mm 0;
    }

    .info-label {
      font-size: 7.5pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${COLORS.textLight};
      margin-bottom: 0.8mm;
    }

    .info-value {
      font-size: 10.5pt;
      font-weight: 600;
      color: ${COLORS.textDark};
      word-break: break-word;
    }

    .info-value.highlight {
      font-size: 13pt;
      color: ${COLORS.brandDark};
      font-weight: 700;
    }

    .info-value.amount-cny {
      color: ${COLORS.red};
      font-weight: 700;
    }

    /* ── Divider ───────────────────────────────── */
    .section-divider {
      height: 1px;
      background: ${COLORS.border};
      margin: 4mm 0;
    }

    /* ── Purchase Details Table ─────────────────── */
    .purchase-section-title {
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${COLORS.brandDark};
      border-bottom: 2px solid ${COLORS.brandDark};
      padding-bottom: 2mm;
      margin-bottom: 3mm;
    }

    .purchase-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      font-size: 9pt;
    }

    .purchase-table thead th {
      background: ${COLORS.tableHeaderBg};
      color: ${COLORS.brandDark};
      padding: 2.5mm 3mm;
      text-align: left;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid ${COLORS.brandDark};
    }

    .purchase-table thead th.col-num   { width: 24px; text-align: center; }
    .purchase-table thead th.col-name  { /* flexible */ }
    .purchase-table thead th.col-price { width: 68px; text-align: right; }
    .purchase-table thead th.col-qty   { width: 38px; text-align: center; }
    .purchase-table thead th.col-sub   { width: 78px; text-align: right; }

    .purchase-table tbody td {
      padding: 2mm 3mm;
      border-bottom: 1px solid ${COLORS.borderLight};
      vertical-align: middle;
      color: ${COLORS.textMedium};
    }

    .purchase-table tbody td.col-num  { text-align: center; color: ${COLORS.textLight}; }
    .purchase-table tbody td.col-name { color: ${COLORS.textDark}; font-weight: 500; }
    .purchase-table tbody td.col-price,
    .purchase-table tbody td.col-sub  { text-align: right; font-family: 'Consolas', 'Monaco', monospace; }
    .purchase-table tbody td.col-qty  { text-align: center; }

    .purchase-table tbody tr:last-child td { border-bottom: none; }

    .purchase-table tbody tr:nth-child(even) { background: ${COLORS.greenBgLight}; }

    .purchase-table tfoot td {
      padding: 2.5mm 3mm;
      border-top: 2px solid ${COLORS.brandDark};
      font-weight: 700;
      font-size: 9.5pt;
    }

    .total-label   { text-align: right; color: ${COLORS.textDark}; }
    .total-cny     { text-align: right; color: ${COLORS.red}; font-family: 'Consolas', monospace; }
    .total-aud     { text-align: right; color: ${COLORS.brandDark}; font-family: 'Consolas', monospace; }

    /* ── Folder Structure ──────────────────────── */
    .folder-section-title {
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${COLORS.brandDark};
      border-bottom: 2px solid ${COLORS.brandDark};
      padding-bottom: 2mm;
      margin-bottom: 3mm;
    }

    .folder-structure {
      background: ${COLORS.bgSubtle};
      border: 1px solid ${COLORS.border};
      border-radius: 3px;
      padding: 3mm 4mm;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 7.5pt;
      color: ${COLORS.textMedium};
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.7;
    }

    /* ── Notes ──────────────────────────────────── */
    .notes-box {
      background: ${COLORS.greenBgLight};
      border-left: 3px solid ${COLORS.brandPrimary};
      padding: 2.5mm 4mm;
      font-size: 8.5pt;
      color: ${COLORS.textMedium};
      border-radius: 0 3px 3px 0;
      line-height: 1.5;
      margin-top: 3mm;
    }

    /* ── Cover Footer ──────────────────────────── */
    .cover-footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 14mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${COLORS.bgSubtle};
      border-top: 1px solid ${COLORS.border};
      font-size: 7pt;
      color: ${COLORS.textMuted};
      letter-spacing: 0.3px;
    }

    /* ══════════════════════════════════════════════
       IMAGE PAGES
       ══════════════════════════════════════════════ */

    /* ── Page Header ───────────────────────────── */
    .page-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 28mm;
      padding: 6mm 18mm;
      background: linear-gradient(135deg, ${COLORS.brandDark} 0%, ${COLORS.brandMedium} 100%);
      color: ${COLORS.white};
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }

    .header-left { display: flex; flex-direction: column; }

    .header-title {
      font-size: 12pt;
      font-weight: 600;
      letter-spacing: 0.3px;
      line-height: 1.3;
    }

    .header-subtitle {
      font-size: 8pt;
      opacity: 0.7;
      margin-top: 1mm;
      font-weight: 400;
    }

    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .page-number {
      font-size: 20pt;
      font-weight: 700;
      line-height: 1;
    }

    .page-total {
      font-size: 7.5pt;
      opacity: 0.7;
      margin-top: 1mm;
    }

    /* ── Image Content Area ────────────────────── */
    .page-content {
      position: absolute;
      top: 32mm;
      left: 18mm;
      right: 18mm;
      bottom: 42mm;
      display: flex;
      justify-content: center;
      align-items: center;
      background: ${COLORS.bgSubtle};
      border: 1px solid ${COLORS.greenBorder};
      border-radius: 4px;
      overflow: hidden;
    }

    .page-content img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    /* ── Page Footer ───────────────────────────── */
    .page-footer {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 38mm;
      padding: 4mm 18mm 5mm;
      background: ${COLORS.white};
      border-top: 2px solid ${COLORS.brandPrimary};
    }

    .footer-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .footer-section-title {
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${COLORS.brandDark};
      margin-bottom: 1.5mm;
    }

    .footer-description {
      font-size: 9pt;
      color: ${COLORS.textMedium};
      line-height: 1.5;
      flex: 1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 2mm;
      border-top: 1px solid ${COLORS.borderLight};
      margin-top: auto;
    }

    .footer-meta-left {
      display: flex;
      gap: 2.5mm;
      align-items: center;
    }

    .footer-reference {
      font-size: 7.5pt;
      font-family: 'Consolas', 'Monaco', monospace;
      color: ${COLORS.textLight};
      background: ${COLORS.greenBgLight};
      padding: 0.8mm 2.5mm;
      border-radius: 2px;
      border: 1px solid ${COLORS.greenBorder};
    }

    .footer-tag {
      font-size: 7pt;
      color: ${COLORS.white};
      background: ${COLORS.brandPrimary};
      padding: 0.8mm 2.5mm;
      border-radius: 2px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .footer-file-info {
      font-size: 7pt;
      color: ${COLORS.textMuted};
    }

    /* ── Watermark ─────────────────────────────── */
    .watermark {
      position: absolute;
      bottom: 40mm; right: 18mm;
      font-size: 7pt;
      color: ${COLORS.textMuted};
      opacity: 0.5;
      transform: rotate(-90deg);
      transform-origin: bottom right;
      white-space: nowrap;
    }

    /* ══════════════════════════════════════════════
       PRINT & SCREEN MEDIA
       ══════════════════════════════════════════════ */

    @media print {
      html, body {
        width: 210mm;
        height: auto;
        overflow: visible;
        background: ${COLORS.white};
      }
      body { padding: 0; margin: 0; }
      .page {
        margin: 0;
        box-shadow: none;
        border: none;
      }
      /* Force background colors in print */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      /* Prevent orphan blank pages */
      .page:last-child { page-break-after: avoid; }
    }

    @media screen {
      html { background: #e2e8f0; }
      body {
        background: #e2e8f0;
        padding: 15mm 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .page {
        margin-bottom: 12mm;
        box-shadow:
          0 1px 3px rgba(0,0,0,0.08),
          0 8px 24px rgba(0,0,0,0.12);
        border-radius: 2px;
      }
    }
  `;
}

// ──────────────────────── Cover Page ────────────────────────────────

/**
 * Generate cover page HTML
 * 封面页：品牌横幅 + 采购信息网格 + 采购明细表 + 文件夹结构
 */
function generateCoverPage(
  record: PurchaseRecord,
  dateStr: string,
  dailySeqStr: string,
  formattedDate: string,
  platformLabel: string,
  categoryLabel: string,
  currentPage: number,
  totalPages: number,
  purchaseItems: PdfPurchaseItem[]
): string {
  const folderStructure = generateFolderStructure(record);

  // 生成采购明细表 HTML
  const purchaseDetailsHtml =
    purchaseItems.length > 0
      ? generatePurchaseDetailsTable(purchaseItems, record.exchangeRate)
      : '';

  // 备注区域
  const notesHtml = record.notes
    ? `<div class="notes-box">${record.notes}</div>`
    : '';

  return `
  <div class="page cover-page">
    <!-- ── Brand Banner ────────────────────────── -->
    <div class="cover-banner">
      <div class="cover-brand">Sparkery</div>
      <div class="cover-title">China Procurement Report</div>
      <div class="cover-subtitle">Purchase Documentation Package &nbsp;·&nbsp; ${formattedDate}</div>
    </div>
    <div class="cover-accent"></div>

    <!-- ── Content Body ────────────────────────── -->
    <div class="cover-body">

      <!-- Purchase Information -->
      <div class="info-section-title">Purchase Information</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Document ID</span>
          <span class="info-value">${record.id}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Purchase Date</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Supplier</span>
          <span class="info-value">${record.supplierName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Platform</span>
          <span class="info-value">${platformLabel}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Product</span>
          <span class="info-value">${record.productName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Category</span>
          <span class="info-value">${categoryLabel}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Amount (CNY)</span>
          <span class="info-value amount-cny">¥${record.amountCNY.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Amount (AUD)</span>
          <span class="info-value highlight">A$${record.amountAUD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Exchange Rate</span>
          <span class="info-value">1 CNY = ${record.exchangeRate} AUD</span>
        </div>
        <div class="info-item">
          <span class="info-label">File Reference</span>
          <span class="info-value" style="font-family: Consolas, Monaco, monospace; font-size: 9.5pt;">${dateStr}_${dailySeqStr}</span>
        </div>
      </div>

      ${notesHtml}

      <!-- Purchase Details Table -->
      ${purchaseDetailsHtml}

      <div class="section-divider"></div>

      <!-- Folder Structure -->
      <div class="folder-section-title">File Structure</div>
      <div class="folder-structure">${folderStructure}</div>
    </div>

    <!-- ── Footer ──────────────────────────────── -->
    <div class="cover-footer">
      Generated for ATO Audit Compliance &nbsp;&middot;&nbsp; Sparkery Business Records &nbsp;&middot;&nbsp; Page ${currentPage} of ${totalPages}
    </div>
  </div>`;
}

// ──────────────────── Purchase Details Table ────────────────────────

/**
 * 生成采购明细表 HTML
 * Generate purchase details table with professional styling
 */
function generatePurchaseDetailsTable(
  items: PdfPurchaseItem[],
  exchangeRate: number
): string {
  const totalCNY = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalAUD = totalCNY * exchangeRate;

  const rows = items
    .map(
      (item, index) => `
        <tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-name">${item.productName || '—'}</td>
          <td class="col-price">¥${item.unitPrice.toFixed(2)}</td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-sub">¥${(item.unitPrice * item.quantity).toFixed(2)}</td>
          <td class="col-sub">A$${(item.unitPrice * item.quantity * exchangeRate).toFixed(2)}</td>
        </tr>`
    )
    .join('');

  return `
      <div class="section-divider"></div>

      <div class="purchase-section-title">Purchase Details</div>
      <table class="purchase-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th class="col-name">Product Name</th>
            <th class="col-price">Unit Price</th>
            <th class="col-qty">Qty</th>
            <th class="col-sub">Subtotal (CNY)</th>
            <th class="col-sub">Subtotal (AUD)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Total</td>
            <td class="total-cny">¥${totalCNY.toFixed(2)}</td>
            <td class="total-aud">A$${totalAUD.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>`;
}

// ──────────────────────── Image Page ────────────────────────────────

/**
 * Generate image page HTML - one image per page with description
 * 图片页：绿色页眉 + 居中图片 + 描述页脚
 */
function generateImagePage(
  img: DocImage,
  section: DocSection,
  sectionIndex: number,
  imgRef: string,
  currentPage: number,
  totalPages: number
): string {
  const description =
    img.description || section.description || 'No description provided';

  return `
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="header-title">${sectionIndex + 1}. ${section.title}</div>
        <div class="header-subtitle">${section.folderName}</div>
      </div>
      <div class="header-right">
        <div class="page-number">${currentPage}</div>
        <div class="page-total">of ${totalPages}</div>
      </div>
    </div>

    <div class="page-content">
      <img src="${img.file}" alt="${img.name}" />
    </div>

    <div class="page-footer">
      <div class="footer-content">
        <div class="footer-section-title">Description</div>
        <div class="footer-description">${description}</div>
        <div class="footer-meta">
          <div class="footer-meta-left">
            <span class="footer-reference">Ref: ${imgRef}</span>
            ${section.tag ? `<span class="footer-tag">${section.tag}</span>` : ''}
          </div>
          <span class="footer-file-info">${img.name} &middot; ${img.uploadTime}</span>
        </div>
      </div>
    </div>

    <div class="watermark">SPARKERY PROCUREMENT DOCS</div>
  </div>`;
}

// ──────────────────── Folder Structure ──────────────────────────────

/**
 * Generate folder structure display string
 * 生成文件夹结构文本（用于封面展示）
 */
function generateFolderStructure(record: PurchaseRecord): string {
  const date = dayjs(record.purchaseDate);
  const year = date.format('YYYY');
  const month = date.format('MM');
  const monthName = date.format('MMMM');
  const dateStr = date.format('YYYYMMDD');
  const cleanDesc = record.productName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);

  const sectionsStr = record.sections
    .filter(s => s.images.length > 0)
    .map(s => `      ${s.folderName}/`)
    .join('\n');

  return `Sparkery Business Records/
  China Purchases/
    ${year}/
      ${month} ${monthName}/
        CN_Purchase_${dateStr}_${cleanDesc}/
${sectionsStr}
          COMBINED_FOR_XERO.pdf`;
}

// ──────────────────── Utility Exports ───────────────────────────────

/**
 * Open HTML in new window for printing
 */
export function openPrintWindow(htmlContent: string): Window | null {
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  return printWindow;
}

/**
 * Get daily sequence number from localStorage
 */
export function getDailySequence(): number {
  const today = dayjs().format('YYYYMMDD');
  const storageKey = `pdf_seq_${today}`;
  const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const newSeq = currentSeq + 1;
  localStorage.setItem(storageKey, newSeq.toString());
  return newSeq;
}

/**
 * Generate filename for the PDF
 */
export function generateFilename(
  record: PurchaseRecord,
  dailySeq: number
): string {
  const dateStr = dayjs(record.purchaseDate).format('YYYYMMDD');
  const dailySeqStr = dailySeq.toString().padStart(3, '0');
  return `CN_Purchase_${dateStr}_${dailySeqStr}_Complete_Package.pdf`;
}
