/**
 * China Procurement Documentation System
 * Complete ATO-compliant purchase documentation with 10-section structure
 *
 * Features:
 * - 10 standardized documentation sections
 * - Multi-image upload for each section
 * - PDF generation with proper ordering
 * - ATO audit-compliant format
 * - File naming convention: CN_Purchase_YYYYMMDD_Complete_Package.pdf
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Input,
  Modal,
  Upload,
  message,
  Select,
  Image,
  Progress,
  Divider,
  Alert,
  InputNumber,
  Tag,
} from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import {
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  ShoppingCartOutlined,
  FolderOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const { TextArea } = Input;

// Documentation section types
interface DocSection {
  id: string;
  folderName: string;
  title: string;
  description: string;
  required: boolean;
  tag?: string;
  images: DocImage[];
}

interface DocImage {
  id: string;
  file: string;
  name: string;
  description: string;
  size: number;
  uploadTime: string;
}

interface PurchaseRecord {
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

interface PurchaseItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

// 10 Documentation sections based on folder structure
const DEFAULT_SECTIONS: Omit<DocSection, 'images'>[] = [
  {
    id: 'purchase-summary',
    folderName: '00_Purchase_Summary',
    title: 'Purchase Summary (Cover)',
    description: 'Purchase summary cover - basic info',
    required: true,
    tag: 'summary',
  },
  {
    id: 'platform-orders',
    folderName: '01_Pinduoduo_Orders',
    title: 'Platform Orders',
    description: 'Platform order screenshots',
    required: true,
    tag: 'order',
  },
  {
    id: 'payment-receipts',
    folderName: '02_Payment_Receipts',
    title: 'Payment Receipts',
    description: 'Payment proof screenshots',
    required: true,
    tag: 'payment',
  },
  {
    id: 'superbuy-docs',
    folderName: '03_Superbuy_Docs',
    title: 'Superbuy Documents',
    description: 'Superbuy order confirmation and docs',
    required: false,
    tag: 'superbuy',
  },
  {
    id: 'shipping',
    folderName: '04_Shipping',
    title: 'Shipping Documents',
    description: 'Waybills and tracking screenshots',
    required: false,
    tag: 'shipping',
  },
  {
    id: 'customs',
    folderName: '05_Customs',
    title: 'Customs Documents',
    description: 'Customs clearance documents',
    required: false,
    tag: 'customs',
  },
  {
    id: 'delivery',
    folderName: '06_Delivery',
    title: 'Delivery Photos',
    description: 'Received goods photos',
    required: true,
    tag: 'delivery',
  },
  {
    id: 'exchange-rates',
    folderName: '07_Exchange_Rates',
    title: 'Exchange Rate Proof',
    description: 'XE.com or other exchange rate proof',
    required: true,
    tag: 'rate',
  },
  {
    id: 'other-docs',
    folderName: '09_Other_Docs',
    title: 'Other Documents',
    description: 'Other supplementary documents',
    required: false,
    tag: 'other',
  },
];

const PLATFORMS = [
  { value: '1688', label: '1688.com' },
  { value: 'pinduoduo', label: 'Pinduoduo' },
  { value: 'taobao', label: 'Taobao' },
  { value: 'tmall', label: 'Tmall' },
  { value: 'jd', label: 'JD.com' },
  { value: 'alibaba', label: 'Alibaba.com' },
  { value: 'wechat', label: 'WeChat Store' },
  { value: 'other', label: 'Other Platform' },
];

const CATEGORIES = [
  { value: 'raw_materials', label: 'Raw Materials' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'office', label: 'Office Supplies' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

// Generate unique ID
const generateId = () =>
  `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9)}`;

// Generate folder structure info
const generateFolderStructure = (record: PurchaseRecord): string => {
  const date = dayjs(record.purchaseDate);
  const year = date.format('YYYY');
  const month = date.format('MM');
  const monthName = date.format('MMMM');
  const dateStr = date.format('YYYYMMDD');
  const cleanDesc = record.productName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);

  const sectionsStr = record.sections
    .map(s => `      ${s.folderName}/`)
    .join('\n');

  return `Sparkery Business Records/
  China Purchases/
    ${year}/
      ${month} ${monthName}/
        CN_Purchase_${dateStr}_${cleanDesc}/
${sectionsStr}
          COMBINED_FOR_XERO.pdf
`;
};

const ChinaProcurementReport: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  // Current form state
  const [currentRecord, setCurrentRecord] = useState<Partial<PurchaseRecord>>({
    purchaseDate: dayjs().format('YYYY-MM-DD'),
    supplierName: '',
    supplierPlatform: 'pinduoduo',
    productName: '',
    category: 'cleaning',
    amountCNY: 0,
    exchangeRate: 0.21,
    amountAUD: 0,
    notes: '',
    sections: DEFAULT_SECTIONS.map(s => ({ ...s, images: [] })),
  });

  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Purchase items state
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(() => {
    return [
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
    ];
  });
  const [gstEnabled, setGstEnabled] = useState(true);

  // Calculate subtotal for a single item
  const calculateItemSubtotal = (item: PurchaseItem) => {
    return item.unitPrice * item.quantity;
  };

  // Calculate total subtotal (without GST)
  const calculateTotalSubtotal = () => {
    return purchaseItems.reduce(
      (sum, item) => sum + calculateItemSubtotal(item),
      0
    );
  };

  // Calculate GST amount
  const calculateGstAmount = () => {
    const subtotal = calculateTotalSubtotal();
    return gstEnabled ? subtotal * 0.1 : 0;
  };

  // Calculate total with GST
  const calculateTotalWithGst = () => {
    return calculateTotalSubtotal() + calculateGstAmount();
  };

  // Update purchase item
  const updatePurchaseItem = (
    id: string,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setPurchaseItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Add new purchase item row
  const addPurchaseItem = () => {
    setPurchaseItems(prev => [
      ...prev,
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
    ]);
  };

  // Delete purchase item row
  const deletePurchaseItem = (id: string) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(prev => prev.filter(item => item.id !== id));
    } else {
      messageApi.warning('Keep at least one row');
    }
  };

  // Sync total to Amount (CNY) field
  const syncTotalToAmount = () => {
    const total = calculateTotalWithGst();
    setCurrentRecord(prev => ({
      ...prev,
      amountCNY: total,
      amountAUD: calculateAUD(total, prev.exchangeRate || 0.21),
    }));
    messageApi.success('Total synced to Amount field');
  };

  // Calculate AUD amount
  const calculateAUD = (cny: number, rate: number) => {
    return Number((cny * rate).toFixed(2));
  };

  // Handle image upload for a section
  const handleImageUpload = (sectionId: string, file: RcFile) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      const newImage: DocImage = {
        id: generateId(),
        file: result,
        name: file.name,
        description: '',
        size: file.size,
        uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      setCurrentRecord(prev => ({
        ...prev,
        sections:
          prev.sections?.map(section =>
            section.id === sectionId
              ? { ...section, images: [...section.images, newImage] }
              : section
          ) || [],
      }));

      messageApi.success(`Uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
    return false;
  };

  // Handle delete image
  const handleDeleteImage = (sectionId: string, imageId: string) => {
    setCurrentRecord(prev => ({
      ...prev,
      sections:
        prev.sections?.map(section =>
          section.id === sectionId
            ? {
                ...section,
                images: section.images.filter(img => img.id !== imageId),
              }
            : section
        ) || [],
    }));
  };

  // Handle image description change
  const handleImageDescriptionChange = (
    sectionId: string,
    imageId: string,
    description: string
  ) => {
    setCurrentRecord(prev => ({
      ...prev,
      sections:
        prev.sections?.map(section =>
          section.id === sectionId
            ? {
                ...section,
                images: section.images.map(img =>
                  img.id === imageId ? { ...img, description } : img
                ),
              }
            : section
        ) || [],
    }));
  };

  // Check if required fields are filled
  const checkRequiredFields = () => {
    const missingFields: string[] = [];

    if (!currentRecord.supplierName) missingFields.push('Supplier Name');
    if (!currentRecord.productName) missingFields.push('Product Name');
    if (!currentRecord.amountCNY || currentRecord.amountCNY <= 0)
      missingFields.push('Amount');

    // Check required sections have at least one image
    const missingRequiredSections = currentRecord.sections?.filter(
      s => s.required && s.images.length === 0
    );

    return {
      hasMissingFields:
        missingFields.length > 0 ||
        (missingRequiredSections && missingRequiredSections.length > 0),
      missingFields,
      missingRequiredSections: missingRequiredSections || [],
    };
  };

  // Generate PDF Report - simplified flow
  const handleGeneratePDFReport = () => {
    const { hasMissingFields, missingFields, missingRequiredSections } =
      checkRequiredFields();

    if (hasMissingFields) {
      const missingFieldsText =
        missingFields.length > 0
          ? `Missing required fields: ${missingFields.join(', ')}`
          : '';
      const missingSectionsText =
        missingRequiredSections.length > 0
          ? `Missing required images: ${missingRequiredSections.map(s => s.title).join(', ')}`
          : '';

      Modal.confirm({
        title: 'Some information is missing. Continue generating PDF?',
        content: (
          <div>
            {missingFieldsText && (
              <p style={{ color: '#ff4d4f' }}>{missingFieldsText}</p>
            )}
            {missingSectionsText && (
              <p style={{ color: '#ff4d4f' }}>{missingSectionsText}</p>
            )}
            <p style={{ marginTop: '12px' }}>
              Do you want to continue generating PDF?
            </p>
          </div>
        ),
        okText: 'Continue',
        cancelText: 'Go Back',
        onOk: () => {
          generatePDF();
        },
      });
    } else {
      generatePDF();
    }
  };

  // Get daily sequence number from localStorage
  const getDailySequence = (): number => {
    const today = dayjs().format('YYYYMMDD');
    const storageKey = `pdf_seq_${today}`;
    const currentSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const newSeq = currentSeq + 1;
    localStorage.setItem(storageKey, newSeq.toString());
    return newSeq;
  };

  // Generate PDF with all images
  const generatePDF = () => {
    setPdfGenerating(true);

    try {
      // Build record from current state
      const record: PurchaseRecord = {
        id: generateId(),
        purchaseDate:
          currentRecord.purchaseDate || dayjs().format('YYYY-MM-DD'),
        supplierName: currentRecord.supplierName || '',
        supplierPlatform: currentRecord.supplierPlatform || 'pinduoduo',
        productName: currentRecord.productName || '',
        category: currentRecord.category || 'cleaning',
        amountCNY: currentRecord.amountCNY || 0,
        amountAUD: calculateAUD(
          currentRecord.amountCNY || 0,
          currentRecord.exchangeRate || 0.21
        ),
        exchangeRate: currentRecord.exchangeRate || 0.21,
        notes: currentRecord.notes || '',
        sections:
          currentRecord.sections ||
          DEFAULT_SECTIONS.map(s => ({ ...s, images: [] })),
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      // Get daily sequence number
      const dailySeq = getDailySequence();
      const dailySeqStr = dailySeq.toString().padStart(3, '0');
      const dateStr = dayjs(record.purchaseDate).format('YYYYMMDD');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      let currentY = 20;
      let currentPage = 1;
      let globalImgIndex = 0;

      // Helper function to add header and footer
      const addHeaderFooter = (pageNum: number) => {
        pdf.setPage(pageNum);
        // Header
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`China Procurement Report - ${dateStr}`, pageWidth / 2, 10, {
          align: 'center',
        });
        pdf.line(margin, 12, pageWidth - margin, 12);
        // Footer
        pdf.setFontSize(8);
        pdf.text(
          `Page ${pageNum} of ${currentPage} - Generated for ATO Audit - Sparkery Business Records`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.setTextColor(0, 0, 0);
      };

      // Cover Page - Page 1
      pdf.setFontSize(28);
      pdf.setTextColor(0, 0, 128);
      pdf.text('China Procurement Report', pageWidth / 2, 40, {
        align: 'center',
      });
      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(14);
      pdf.text(`Purchase Documentation Package`, pageWidth / 2, 55, {
        align: 'center',
      });

      // Cover page info box
      currentY = 80;
      pdf.setFontSize(12);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 100, 'F');

      pdf.setFontSize(11);
      pdf.text(`Purchase ID: ${record.id}`, margin + 5, currentY + 5);
      pdf.text(
        `Purchase Date: ${record.purchaseDate}`,
        margin + 5,
        currentY + 15
      );
      pdf.text(`Supplier: ${record.supplierName}`, margin + 5, currentY + 25);
      pdf.text(
        `Platform: ${PLATFORMS.find(p => p.value === record.supplierPlatform)?.label || record.supplierPlatform}`,
        margin + 5,
        currentY + 35
      );
      pdf.text(`Product: ${record.productName}`, margin + 5, currentY + 45);
      pdf.text(
        `Category: ${CATEGORIES.find(c => c.value === record.category)?.label || record.category}`,
        margin + 5,
        currentY + 55
      );
      pdf.text(
        `Amount (CNY): ${record.amountCNY.toLocaleString()}`,
        margin + 5,
        currentY + 65
      );
      pdf.text(
        `Amount (AUD): $${record.amountAUD.toLocaleString()}`,
        margin + 5,
        currentY + 75
      );
      pdf.text(
        `Exchange Rate: ${record.exchangeRate}`,
        margin + 5,
        currentY + 85
      );

      // Add folder structure on cover page
      currentY = 190;
      pdf.setFontSize(10);
      pdf.text('Folder Structure:', margin, currentY);
      currentY += 8;
      pdf.setFontSize(9);
      const folderStructure = generateFolderStructure(record).split('\n');
      folderStructure.forEach((line, idx) => {
        if (currentY < pageHeight - 20) {
          pdf.text(line, margin, currentY);
          currentY += 5;
        }
      });

      // Process each section with images - each section starts on new page
      const sectionsWithImages = record.sections.filter(
        s => s.images.length > 0
      );

      sectionsWithImages.forEach((section, sectionIndex) => {
        // Add new page for each section
        pdf.addPage();
        currentPage++;
        currentY = 25;

        // Section title page - only title and description
        pdf.setFontSize(20);
        pdf.setTextColor(0, 0, 128);
        pdf.text(`${sectionIndex + 1}. ${section.title}`, margin, currentY);
        pdf.setTextColor(0, 0, 0);
        currentY += 3;

        pdf.setFontSize(7);
        pdf.text(
          `[${section.folderName}] ${section.description} | ${section.images.length} imgs`,
          margin,
          currentY
        );
        currentY += 2;
        pdf.setFontSize(10); // 恢复默认字号

        // Add images - max 2 images per page
        let imagesOnCurrentPage = 0;
        const maxImagesPerPage = 2;
        // 页面可用尺寸
        const availableWidth = pageWidth - 2 * margin; // 180mm
        const availableHeight = pageHeight - 30 - 20; // 247mm (扣除顶部标题和底部页脚)
        const pxToMm = 0.264; // 像素转毫米转换系数

        section.images.forEach((img, imgIndex) => {
          globalImgIndex++;

          // Check if we need a new page (max 2 images per page)
          if (
            imagesOnCurrentPage >= maxImagesPerPage ||
            currentY > pageHeight - 80
          ) {
            pdf.addPage();
            currentPage++;
            currentY = 25;
            imagesOnCurrentPage = 0;
          }

          // Try to add image with aspect ratio preserved
          try {
            const imgObj = document.createElement('img');
            imgObj.src = img.file;

            let imgWidth: number;
            let imgHeight: number;

            if (imgObj.width && imgObj.height) {
              // 转换为毫米，优先使用原始尺寸
              const originalWidth = imgObj.width * pxToMm;
              const originalHeight = imgObj.height * pxToMm;
              const aspectRatio = imgObj.width / imgObj.height;
              const isLandscape = imgObj.width >= imgObj.height;

              if (isLandscape) {
                // 横版图片逻辑
                if (originalWidth <= availableWidth) {
                  // 原始宽度在页面范围内，使用原始尺寸
                  imgWidth = originalWidth;
                  imgHeight = originalHeight;
                } else {
                  // 原始宽度超出页面，按页面宽度缩放
                  imgWidth = availableWidth;
                  imgHeight = imgWidth / aspectRatio;
                }
                // 确保高度不超出页面
                if (imgHeight > availableHeight) {
                  imgHeight = availableHeight;
                  imgWidth = imgHeight * aspectRatio;
                }
              } else {
                // 竖版图片逻辑
                if (originalHeight <= availableHeight) {
                  // 原始高度在页面范围内，使用原始尺寸
                  imgHeight = originalHeight;
                  imgWidth = originalWidth;
                } else {
                  // 原始高度超出页面，按页面高度缩放
                  imgHeight = availableHeight;
                  imgWidth = imgHeight * aspectRatio;
                }
                // 确保宽度不超出页面
                if (imgWidth > availableWidth) {
                  imgWidth = availableWidth;
                  imgHeight = imgWidth / aspectRatio;
                }
              }
            } else {
              // 无法获取原始尺寸时的回退方案
              imgWidth = availableWidth;
              imgHeight = 80;
            }

            // 居中显示
            const x = margin + (availableWidth - imgWidth) / 2;

            pdf.addImage(img.file, 'JPEG', x, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 5;

            // Image caption with new format: [Date]_[DailySeq]_[ImgSeq]
            const imgSeqStr = globalImgIndex.toString().padStart(3, '0');
            const imgRef = `${dateStr}_${dailySeqStr}_${imgSeqStr}`;
            pdf.setFontSize(8);
            pdf.text(
              `Ref: ${imgRef}${section.tag ? ` [${section.tag}]` : ''}${img.description ? ' - ' + img.description : ''}`,
              margin,
              currentY
            );
            currentY += 10;
            imagesOnCurrentPage++;
          } catch (e) {
            // If image fails, just add text
            pdf.setFontSize(10);
            const imgSeqStr = globalImgIndex.toString().padStart(3, '0');
            const imgRef = `${dateStr}_${dailySeqStr}_${imgSeqStr}`;
            pdf.text(`[Image: ${imgRef} - ${img.name}]`, margin, currentY);
            currentY += 3;
            imagesOnCurrentPage++;
          }
        });
      });

      // Add header and footer to all pages
      for (let i = 1; i <= currentPage; i++) {
        addHeaderFooter(i);
      }

      // Save PDF with daily sequence number
      const fileName = `CN_Purchase_${dateStr}_${dailySeqStr}_Complete_Package.pdf`;
      pdf.save(fileName);

      messageApi.success(`PDF generated: ${fileName}`);
    } catch (error) {
      console.error('PDF generation error:', error);
      messageApi.error('PDF generation failed');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Calculate progress for current record
  const calculateProgress = () => {
    if (!currentRecord.sections) return 0;
    const totalImages = currentRecord.sections.reduce(
      (sum, s) => sum + s.images.length,
      0
    );
    const minRequired = 30; // Estimate: 3 required sections with ~10 images each
    return Math.min(100, Math.round((totalImages / minRequired) * 100));
  };

  return (
    <div style={{ padding: '12px' }}>
      {contextHolder}

      <Title level={3}>
        <ShoppingCartOutlined style={{ marginRight: '8px' }} />
        China Procurement Documentation
      </Title>
      <Text type='secondary'>
        Complete ATO-compliant purchase documentation system with 10-section
        structure
      </Text>

      <div style={{ marginTop: '20px' }}>
        {/* Basic Info Card */}
        <Card
          title='Basic Information'
          size='small'
          style={{ marginBottom: '16px' }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Purchase Date *</Text>
                <Input
                  type='date'
                  value={currentRecord.purchaseDate}
                  onChange={e =>
                    setCurrentRecord(prev => ({
                      ...prev,
                      purchaseDate: e.target.value,
                    }))
                  }
                />
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Platform *</Text>
                <Select
                  style={{ width: '100%' }}
                  value={currentRecord.supplierPlatform || null}
                  onChange={val =>
                    setCurrentRecord(prev => ({
                      ...prev,
                      supplierPlatform: val,
                    }))
                  }
                >
                  {PLATFORMS.map(p => (
                    <Option key={p.value} value={p.value}>
                      {p.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Category *</Text>
                <Select
                  style={{ width: '100%' }}
                  value={currentRecord.category || null}
                  onChange={val =>
                    setCurrentRecord(prev => ({ ...prev, category: val }))
                  }
                >
                  {CATEGORIES.map(c => (
                    <Option key={c.value} value={c.value}>
                      {c.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Supplier Name *</Text>
                <Input
                  placeholder='e.g., Shanghai Trading Co.'
                  value={currentRecord.supplierName}
                  onChange={e =>
                    setCurrentRecord(prev => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Product Name *</Text>
                <Input
                  placeholder='e.g., Microfiber Cloths 1000pcs'
                  value={currentRecord.productName}
                  onChange={e =>
                    setCurrentRecord(prev => ({
                      ...prev,
                      productName: e.target.value,
                    }))
                  }
                />
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Amount (CNY) *</Text>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={currentRecord.amountCNY || null}
                  onChange={val => {
                    const cny = typeof val === 'number' ? val : 0;
                    setCurrentRecord(prev => ({
                      ...prev,
                      amountCNY: cny,
                      amountAUD: calculateAUD(cny, prev.exchangeRate || 0.21),
                    }));
                  }}
                />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Exchange Rate (CNY→AUD)</Text>
                <InputNumber
                  style={{ width: '100%' }}
                  step={0.01}
                  value={currentRecord.exchangeRate || null}
                  onChange={val => {
                    const rate = typeof val === 'number' ? val : 0.21;
                    setCurrentRecord(prev => ({
                      ...prev,
                      exchangeRate: rate,
                      amountAUD: calculateAUD(prev.amountCNY || 0, rate),
                    }));
                  }}
                />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong style={{ color: '#722ed1' }}>
                  Amount (AUD)
                </Text>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#722ed1',
                  }}
                >
                  $
                  {currentRecord.amountAUD?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </Col>
          </Row>

          <div style={{ marginBottom: '12px' }}>
            <Text strong>Notes</Text>
            <TextArea
              rows={2}
              placeholder='Additional notes...'
              value={currentRecord.notes}
              onChange={e =>
                setCurrentRecord(prev => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </Card>

        {/* Progress */}
        <Card size='small' style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong>Documentation Progress</Text>
            <Text>{calculateProgress()}%</Text>
          </div>
          <Progress
            percent={calculateProgress()}
            status={calculateProgress() >= 100 ? 'success' : 'active'}
          />
        </Card>

        {/* Purchase Items Table */}
        <Card
          title='Purchase Details'
          size='small'
          style={{ marginBottom: '16px' }}
          extra={
            <Space>
              <Button
                type='primary'
                size='small'
                icon={<PlusOutlined />}
                onClick={addPurchaseItem}
              >
                Add Item
              </Button>
            </Space>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'left',
                      width: '5%',
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'left',
                      width: '35%',
                    }}
                  >
                    Product Name
                  </th>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'right',
                      width: '20%',
                    }}
                  >
                    Unit Price (CNY)
                  </th>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'center',
                      width: '15%',
                    }}
                  >
                    Quantity
                  </th>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'right',
                      width: '20%',
                    }}
                  >
                    Subtotal (CNY)
                  </th>
                  <th
                    style={{
                      padding: '8px',
                      border: '1px solid #d9d9d9',
                      textAlign: 'center',
                      width: '5%',
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {purchaseItems.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                      <Input
                        placeholder='Enter product name'
                        value={item.productName}
                        onChange={e =>
                          updatePurchaseItem(
                            item.id,
                            'productName',
                            e.target.value
                          )
                        }
                        size='small'
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={val =>
                          updatePurchaseItem(
                            item.id,
                            'unitPrice',
                            typeof val === 'number' ? val : 0
                          )
                        }
                        size='small'
                      />
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={item.quantity}
                        onChange={val =>
                          updatePurchaseItem(
                            item.id,
                            'quantity',
                            typeof val === 'number' ? val : 1
                          )
                        }
                        size='small'
                      />
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        textAlign: 'right',
                      }}
                    >
                      <Text strong>
                        {calculateItemSubtotal(item).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </td>
                    <td
                      style={{
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        textAlign: 'center',
                      }}
                    >
                      <Button
                        type='text'
                        danger
                        size='small'
                        icon={<DeleteOutlined />}
                        onClick={() => deletePurchaseItem(item.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <Divider style={{ margin: '16px 0' }} />
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Space>
                <label>
                  <input
                    type='checkbox'
                    checked={gstEnabled}
                    onChange={e => setGstEnabled(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Enable GST (10%)
                </label>
              </Space>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text type='secondary'>Subtotal (excl. GST): </Text>
                  <Text strong style={{ marginLeft: '8px' }}>
                    CNY{' '}
                    {calculateTotalSubtotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </div>
                {gstEnabled && (
                  <div style={{ marginBottom: '8px' }}>
                    <Text type='secondary'>GST (10%): </Text>
                    <Text style={{ marginLeft: '8px' }}>
                      CNY{' '}
                      {calculateGstAmount().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </div>
                )}
                <div style={{ marginBottom: '8px' }}>
                  <Text strong style={{ fontSize: '16px' }}>
                    Total:{' '}
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: '18px',
                      color: '#1890ff',
                      marginLeft: '8px',
                    }}
                  >
                    CNY{' '}
                    {calculateTotalWithGst().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </div>
                <Button type='primary' size='small' onClick={syncTotalToAmount}>
                  Sync to Amount Field
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Documentation Sections */}
        <Card title='Documentation Sections (9 Parts)' size='small'>
          <Row gutter={[16, 16]}>
            {currentRecord.sections?.map((section, index) => (
              <Col span={8} key={section.id}>
                <Card
                  size='small'
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        {index + 1}. {section.title}
                        {section.required && (
                          <Text type='danger' style={{ marginLeft: '8px' }}>
                            *
                          </Text>
                        )}
                      </span>
                      <Tag
                        color={section.images.length > 0 ? 'green' : 'default'}
                      >
                        {section.images.length} images
                      </Tag>
                    </div>
                  }
                >
                  <div style={{ marginBottom: '12px' }}>
                    <Text type='secondary'>{section.description}</Text>
                    <br />
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      Folder: {section.folderName}/
                    </Text>
                  </div>

                  <Upload.Dragger
                    showUploadList={false}
                    beforeUpload={file =>
                      handleImageUpload(section.id, file as RcFile)
                    }
                    accept='image/*'
                    multiple
                    style={{ marginBottom: '12px' }}
                  >
                    <p className='ant-upload-drag-icon'>
                      <UploadOutlined />
                    </p>
                    <p className='ant-upload-text'>
                      Click or drag images to upload
                    </p>
                    <p className='ant-upload-hint'>
                      Support for multiple image files
                    </p>
                  </Upload.Dragger>

                  {section.images.length > 0 && (
                    <div>
                      <Row gutter={[8, 8]}>
                        {section.images.map((img, imgIndex) => (
                          <Col span={12} key={img.id}>
                            <div
                              style={{
                                border: '1px solid #d9d9d9',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                            >
                              <Image
                                src={img.file}
                                alt={img.name}
                                style={{
                                  width: '100%',
                                  height: '60px',
                                  objectFit: 'cover',
                                }}
                                preview={{ src: img.file }}
                              />
                              <Input
                                size='small'
                                placeholder='Description'
                                value={img.description}
                                onChange={e =>
                                  handleImageDescriptionChange(
                                    section.id,
                                    img.id,
                                    e.target.value
                                  )
                                }
                                style={{ marginTop: '4px', fontSize: '11px' }}
                              />
                              <Button
                                type='text'
                                danger
                                size='small'
                                icon={<DeleteOutlined />}
                                style={{ width: '100%', marginTop: '4px' }}
                                onClick={() =>
                                  handleDeleteImage(section.id, img.id)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Actions */}
        <Card size='small' style={{ marginTop: '16px' }}>
          <Space>
            <Button
              type='primary'
              size='large'
              icon={<FilePdfOutlined />}
              onClick={handleGeneratePDFReport}
              loading={pdfGenerating}
            >
              Generate PDF Report
            </Button>
            <Button
              size='large'
              icon={<FolderOutlined />}
              onClick={() => {
                if (currentRecord.productName) {
                  const record = {
                    ...currentRecord,
                    id: generateId(),
                    purchaseDate:
                      currentRecord.purchaseDate ||
                      dayjs().format('YYYY-MM-DD'),
                    supplierName: currentRecord.supplierName || '',
                    supplierPlatform:
                      currentRecord.supplierPlatform || 'pinduoduo',
                    productName: currentRecord.productName || '',
                    category: currentRecord.category || 'cleaning',
                    amountCNY: currentRecord.amountCNY || 0,
                    amountAUD: calculateAUD(
                      currentRecord.amountCNY || 0,
                      currentRecord.exchangeRate || 0.21
                    ),
                    exchangeRate: currentRecord.exchangeRate || 0.21,
                    notes: currentRecord.notes || '',
                    sections:
                      currentRecord.sections ||
                      DEFAULT_SECTIONS.map(s => ({ ...s, images: [] })),
                    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  } as PurchaseRecord;
                  const structure = generateFolderStructure(record);
                  Modal.info({
                    title: 'Recommended Folder Structure',
                    content: (
                      <pre
                        style={{
                          fontSize: '11px',
                          background: '#f5f5f5',
                          padding: '12px',
                          borderRadius: '4px',
                        }}
                      >
                        {structure}
                      </pre>
                    ),
                    width: 600,
                  });
                } else {
                  messageApi.warning('Please enter product name first');
                }
              }}
            >
              View Folder Structure
            </Button>
          </Space>
        </Card>
      </div>

      {/* Instructions */}
      <Alert
        message='ATO Documentation Requirements'
        description={
          <div>
            <p>
              <strong>Required Sections (must have images):</strong>
            </p>
            <ul>
              <li>Purchase Summary (Cover)</li>
              <li>Platform Orders</li>
              <li>Payment Receipts</li>
              <li>Delivery Photos</li>
              <li>Exchange Rate Proof</li>
            </ul>
            <p>
              <strong>PDF Output:</strong>{' '}
              CN_Purchase_YYYYMMDD_Complete_Package.pdf
            </p>
            <p>
              <strong>File Naming:</strong>{' '}
              [Type]_[Date]_[Description]_[Version].pdf
            </p>
          </div>
        }
        type='info'
        style={{ marginTop: '20px' }}
      />
    </div>
  );
};

export default ChinaProcurementReport;
