/**
 * China Procurement Documentation System
 * Complete ATO-compliant purchase documentation with 10-section structure
 *
 * Features:
 * - 10 standardized documentation sections
 * - Multi-image upload for each section
 * - PDF generation with proper ordering (HTML-based + jsPDF fallback)
 * - ATO audit-compliant format
 * - File naming convention: CN_Purchase_YYYYMMDD_Complete_Package.pdf
 * - Professional HTML template with one-image-per-page layout
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Tooltip,
  Drawer,
  Empty,
  Badge,
  Popconfirm,
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
  PrinterOutlined,
  FileImageOutlined,
  ScanOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import {
  generatePdfHtml,
  openPrintWindow,
  getDailySequence,
  generateFilename,
  type PurchaseRecord as PdfPurchaseRecord,
  type PdfPurchaseItem,
} from '@/utils/chinaProcurementPdfTemplate';
import {
  recognizeOrderItems,
  parseDataUrl,
} from '@/services/geminiVisionService';

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

// ──────────────────────── Draft System ──────────────────────────────

/** 草稿元数据（保存在索引列表中） */
interface DraftMeta {
  id: string;
  name: string;
  supplierName: string;
  productName: string;
  createdAt: string;
  updatedAt: string;
  /** 图片总数 */
  imageCount: number;
  /** 采购明细条数 */
  itemCount: number;
  /** 进度百分比 0-100 */
  progress: number;
}

/** 完整草稿数据（保存在单独的 localStorage key 中） */
interface DraftData {
  meta: DraftMeta;
  currentRecord: Partial<PurchaseRecord>;
  purchaseItems: PurchaseItem[];
  gstEnabled: boolean;
}

const DRAFT_INDEX_KEY = 'procurement_drafts_index';
const DRAFT_DATA_PREFIX = 'procurement_draft_';

/**
 * 获取所有草稿的元数据索引列表
 */
function loadDraftIndex(): DraftMeta[] {
  try {
    const raw = localStorage.getItem(DRAFT_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 保存草稿索引到 localStorage
 */
function saveDraftIndex(index: DraftMeta[]): void {
  localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(index));
}

/**
 * 加载单个草稿的完整数据
 */
function loadDraftData(draftId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_DATA_PREFIX + draftId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 保存单个草稿的完整数据到 localStorage
 * @returns true 如果成功，false 如果存储空间不足
 */
function saveDraftData(draft: DraftData): boolean {
  try {
    const json = JSON.stringify(draft);
    localStorage.setItem(DRAFT_DATA_PREFIX + draft.meta.id, json);
    return true;
  } catch (e) {
    // 通常是 QuotaExceededError
    console.error('[Draft] Save failed (storage full?):', e);
    return false;
  }
}

/**
 * 删除单个草稿
 */
function deleteDraftData(draftId: string): void {
  localStorage.removeItem(DRAFT_DATA_PREFIX + draftId);
  const index = loadDraftIndex().filter(d => d.id !== draftId);
  saveDraftIndex(index);
}

/**
 * 估算 localStorage 已用空间（近似值）
 */
function estimateStorageUsage(): { usedKB: number; totalKB: number } {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += key.length + (localStorage.getItem(key)?.length || 0);
    }
  }
  // localStorage 一般 5~10 MB，按 5MB 估算
  return { usedKB: Math.round((total * 2) / 1024), totalKB: 5120 };
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

  // ──────────────── Draft State ────────────────
  /** 当前正在编辑的草稿 ID（null = 全新报告） */
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  /** 草稿列表 Drawer 是否可见 */
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  /** 草稿索引列表 */
  const [draftIndex, setDraftIndex] = useState<DraftMeta[]>(() =>
    loadDraftIndex()
  );
  /** 自上次保存后是否有未保存的修改 */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** 自动保存定时器 */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 草稿重命名弹窗 */
  const [renamingDraftId, setRenamingDraftId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  /** 订单截图识别中的 loading 状态 */
  const [recognizing, setRecognizing] = useState(false);

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

  // ═══════════════════════════════════════════════
  //   DRAFT MANAGEMENT
  // ═══════════════════════════════════════════════

  /**
   * 计算当前报告的进度百分比（基于图片数量）
   */
  const calculateDraftProgress = useCallback(() => {
    const totalImages = (currentRecord.sections || []).reduce(
      (sum, s) => sum + s.images.length,
      0
    );
    const minRequired = 30;
    return Math.min(100, Math.round((totalImages / minRequired) * 100));
  }, [currentRecord.sections]);

  /**
   * 生成草稿名称（自动根据内容命名）
   */
  const generateDraftName = useCallback((): string => {
    const supplier = currentRecord.supplierName?.trim();
    const product = currentRecord.productName?.trim();
    const date = currentRecord.purchaseDate || dayjs().format('YYYY-MM-DD');
    if (supplier && product) return `${supplier} - ${product}`;
    if (supplier) return `${supplier} (${date})`;
    if (product) return `${product} (${date})`;
    return `Draft ${date} ${dayjs().format('HH:mm')}`;
  }, [
    currentRecord.supplierName,
    currentRecord.productName,
    currentRecord.purchaseDate,
  ]);

  /**
   * 构建 DraftData 对象
   */
  const buildDraftData = useCallback(
    (draftId: string, existingName?: string): DraftData => {
      const imageCount = (currentRecord.sections || []).reduce(
        (sum, s) => sum + s.images.length,
        0
      );
      const validItemCount = purchaseItems.filter(
        i => i.productName.trim() !== '' || i.unitPrice > 0
      ).length;

      return {
        meta: {
          id: draftId,
          name: existingName || generateDraftName(),
          supplierName: currentRecord.supplierName || '',
          productName: currentRecord.productName || '',
          createdAt:
            draftIndex.find(d => d.id === draftId)?.createdAt ||
            dayjs().format('YYYY-MM-DD HH:mm:ss'),
          updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          imageCount,
          itemCount: validItemCount,
          progress: calculateDraftProgress(),
        },
        currentRecord,
        purchaseItems,
        gstEnabled,
      };
    },
    [
      currentRecord,
      purchaseItems,
      gstEnabled,
      draftIndex,
      generateDraftName,
      calculateDraftProgress,
    ]
  );

  /**
   * 保存当前表单为草稿
   * @param silent 是否静默（不显示 message）
   */
  const handleSaveDraft = useCallback(
    (silent = false) => {
      const draftId = currentDraftId || generateId();
      const existingMeta = draftIndex.find(d => d.id === draftId);
      const draft = buildDraftData(draftId, existingMeta?.name);

      const success = saveDraftData(draft);
      if (!success) {
        messageApi.error(
          'Storage full! Unable to save draft. Please delete old drafts to free space.'
        );
        return;
      }

      // 更新索引
      const newIndex = draftIndex.filter(d => d.id !== draftId);
      newIndex.unshift(draft.meta); // 最新的排在前面
      saveDraftIndex(newIndex);
      setDraftIndex(newIndex);

      if (!currentDraftId) setCurrentDraftId(draftId);
      setHasUnsavedChanges(false);

      if (!silent) {
        messageApi.success('Draft saved successfully / 草稿已保存');
      }
    },
    [currentDraftId, draftIndex, buildDraftData, messageApi]
  );

  /**
   * 加载草稿到当前表单
   */
  const handleLoadDraft = useCallback(
    (draftId: string) => {
      const draft = loadDraftData(draftId);
      if (!draft) {
        messageApi.error('Draft not found or data corrupted');
        return;
      }

      // 确保 sections 包含所有默认 section（兼容旧草稿）
      const savedSections = draft.currentRecord.sections || [];
      const mergedSections = DEFAULT_SECTIONS.map(def => {
        const saved = savedSections.find(s => s.id === def.id);
        return saved || { ...def, images: [] };
      });

      setCurrentRecord({ ...draft.currentRecord, sections: mergedSections });
      setPurchaseItems(
        draft.purchaseItems?.length > 0
          ? draft.purchaseItems
          : [{ id: generateId(), productName: '', unitPrice: 0, quantity: 1 }]
      );
      setGstEnabled(draft.gstEnabled ?? true);
      setCurrentDraftId(draftId);
      setHasUnsavedChanges(false);
      setDraftDrawerOpen(false);

      messageApi.success(`Draft loaded: ${draft.meta.name} / 草稿已加载`);
    },
    [messageApi]
  );

  /**
   * 删除指定草稿
   */
  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      deleteDraftData(draftId);
      const newIndex = draftIndex.filter(d => d.id !== draftId);
      setDraftIndex(newIndex);

      // 如果删除的是当前正在编辑的草稿，断开关联
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
        setHasUnsavedChanges(true);
      }

      messageApi.success('Draft deleted / 草稿已删除');
    },
    [draftIndex, currentDraftId, messageApi]
  );

  /**
   * 重命名草稿
   */
  const handleRenameDraft = useCallback(
    (draftId: string, newName: string) => {
      const newIndex = draftIndex.map(d =>
        d.id === draftId ? { ...d, name: newName.trim() || d.name } : d
      );
      saveDraftIndex(newIndex);
      setDraftIndex(newIndex);

      // 同步更新 localStorage 中的完整数据
      const draft = loadDraftData(draftId);
      if (draft) {
        draft.meta.name = newName.trim() || draft.meta.name;
        saveDraftData(draft);
      }

      setRenamingDraftId(null);
      setRenameValue('');
      messageApi.success('Draft renamed / 草稿已重命名');
    },
    [draftIndex, messageApi]
  );

  /**
   * 新建空白报告（清空当前表单）
   */
  const handleNewReport = useCallback(() => {
    // 如果有未保存的更改，先提示
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: 'Unsaved changes / 有未保存的更改',
        icon: <ExclamationCircleOutlined />,
        content:
          'You have unsaved changes. Do you want to save before creating a new report? / 是否在新建前保存当前草稿？',
        okText: 'Save & New / 保存后新建',
        cancelText: 'Discard / 直接新建',
        onOk: () => {
          handleSaveDraft(true);
          resetToBlank();
        },
        onCancel: () => {
          resetToBlank();
        },
      });
    } else {
      resetToBlank();
    }
  }, [hasUnsavedChanges, handleSaveDraft]);

  /**
   * 重置所有表单状态为空白
   */
  const resetToBlank = () => {
    setCurrentRecord({
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
    setPurchaseItems([
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
      { id: generateId(), productName: '', unitPrice: 0, quantity: 1 },
    ]);
    setGstEnabled(true);
    setCurrentDraftId(null);
    setHasUnsavedChanges(false);
  };

  // ── 自动保存：表单变化时标记为未保存，debounce 60 秒后自动保存 ──
  useEffect(() => {
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 仅在有实际内容时自动保存（避免空表单创建草稿）
    const hasContent =
      (currentRecord.supplierName?.trim() || '') !== '' ||
      (currentRecord.productName?.trim() || '') !== '' ||
      (currentRecord.sections || []).some(s => s.images.length > 0) ||
      purchaseItems.some(i => i.productName.trim() !== '');

    if (hasContent) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveDraft(true); // silent auto-save
      }, 60000); // 60 秒自动保存
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRecord, purchaseItems, gstEnabled]);

  // ── 页面离开前提醒 ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  /**
   * 识别 Platform Orders 截图中的商品信息，自动填充到采购明细
   * 调用 Gemini Vision API，支持多 Key 自动轮询
   */
  const handleRecognizeOrders = useCallback(async () => {
    // 找到 platform-orders section
    const platformSection = currentRecord.sections?.find(
      s => s.id === 'platform-orders'
    );
    if (!platformSection || platformSection.images.length === 0) {
      messageApi.warning('请先在 Platform Orders 中上传订单截图');
      return;
    }

    setRecognizing(true);
    try {
      // 将所有图片转换为 Gemini API 需要的格式
      const images = platformSection.images.map(img => parseDataUrl(img.file));

      // 调用 Gemini Vision 识别
      const recognizedItems = await recognizeOrderItems(images);

      if (recognizedItems.length === 0) {
        messageApi.warning(
          '未从截图中识别到商品信息，请检查图片是否为订单截图'
        );
        return;
      }

      // 将识别结果填充到 purchaseItems
      setPurchaseItems(prev => {
        // 检查现有列表是否全部为空行（productName 为空且价格为 0）
        const hasOnlyEmptyRows = prev.every(
          item => !item.productName && item.unitPrice === 0
        );

        // 将识别结果映射为 PurchaseItem
        const newItems = recognizedItems.map(item => ({
          id: generateId(),
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        }));

        if (hasOnlyEmptyRows) {
          // 全部为空行时直接替换
          return newItems;
        } else {
          // 否则追加到末尾
          return [...prev, ...newItems];
        }
      });

      messageApi.success(
        `成功识别 ${recognizedItems.length} 个商品，已填充到采购明细`
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[RecognizeOrders] Failed:', error);
      messageApi.error(`订单识别失败: ${error.message}`);
    } finally {
      setRecognizing(false);
    }
  }, [currentRecord.sections, messageApi]);

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

  // Generate PDF using HTML template (new professional layout)
  const generatePDFViaHTML = () => {
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

      // Generate HTML content (pass purchaseItems for details table)
      const htmlContent = generatePdfHtml(
        record,
        dailySeq,
        purchaseItems as PdfPurchaseItem[]
      );

      // Open in new window for printing
      const printWindow = openPrintWindow(htmlContent);

      if (printWindow) {
        const fileName = generateFilename(record, dailySeq);
        messageApi.success(
          `PDF preview opened. Use Ctrl+P (Cmd+P on Mac) to save as PDF: ${fileName}`
        );
      } else {
        messageApi.error(
          'Unable to open print window. Please check popup blocker settings.'
        );
      }
    } catch (error) {
      console.error('HTML PDF generation error:', error);
      messageApi.error('PDF generation failed');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Handle HTML-based PDF generation with validation
  const handleGeneratePDFViaHTML = () => {
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
          generatePDFViaHTML();
        },
      });
    } else {
      generatePDFViaHTML();
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

  /** 当前编辑的草稿名称 */
  const currentDraftName = currentDraftId
    ? draftIndex.find(d => d.id === currentDraftId)?.name || 'Untitled Draft'
    : null;

  /** 存储空间信息 */
  const storageInfo = estimateStorageUsage();
  const storagePercent = Math.round(
    (storageInfo.usedKB / storageInfo.totalKB) * 100
  );

  return (
    <div style={{ padding: '12px' }}>
      {contextHolder}

      {/* ═══════════ Draft Management Toolbar ═══════════ */}
      <Card
        size='small'
        style={{
          marginBottom: '16px',
          background: currentDraftId ? '#f6ffed' : '#fafafa',
          borderColor: currentDraftId ? '#b7eb8f' : '#d9d9d9',
        }}
        bodyStyle={{ padding: '10px 16px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Left: Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            {currentDraftId ? (
              <>
                <Tag icon={<EditOutlined />} color='green'>
                  Editing Draft
                </Tag>
                <Text strong style={{ fontSize: '13px' }}>
                  {currentDraftName}
                </Text>
                {hasUnsavedChanges && (
                  <Tag color='orange' style={{ margin: 0 }}>
                    Unsaved Changes
                  </Tag>
                )}
              </>
            ) : (
              <>
                <Tag icon={<FileAddOutlined />} color='blue'>
                  New Report
                </Tag>
                <Text type='secondary' style={{ fontSize: '13px' }}>
                  Not saved as draft yet
                </Text>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <Space size='small' wrap>
            <Tooltip title='Save current form as draft / 保存为草稿'>
              <Button
                icon={<SaveOutlined />}
                type={hasUnsavedChanges ? 'primary' : 'default'}
                onClick={() => handleSaveDraft(false)}
                style={
                  hasUnsavedChanges
                    ? { background: '#52c41a', borderColor: '#52c41a' }
                    : {}
                }
              >
                Save Draft
              </Button>
            </Tooltip>
            <Tooltip title='Open saved drafts / 打开已保存草稿'>
              <Badge count={draftIndex.length} size='small' offset={[-4, 0]}>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => setDraftDrawerOpen(true)}
                >
                  My Drafts
                </Button>
              </Badge>
            </Tooltip>
            <Tooltip title='Start a blank new report / 新建空白报告'>
              <Button icon={<FileAddOutlined />} onClick={handleNewReport}>
                New Report
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Card>

      {/* ═══════════ Drafts Drawer ═══════════ */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpenOutlined />
            <span>Saved Drafts / 已保存的草稿</span>
            <Tag>{draftIndex.length}</Tag>
          </div>
        }
        placement='right'
        width={480}
        open={draftDrawerOpen}
        onClose={() => setDraftDrawerOpen(false)}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text type='secondary' style={{ fontSize: '12px' }}>
              <CloudOutlined style={{ marginRight: '4px' }} />
              Storage: {storageInfo.usedKB}KB / {storageInfo.totalKB}KB (
              {storagePercent}%)
            </Text>
            {storagePercent > 80 && (
              <Text type='danger' style={{ fontSize: '12px' }}>
                Storage nearly full!
              </Text>
            )}
          </div>
        }
      >
        {draftIndex.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='No saved drafts / 暂无保存的草稿'
          />
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {draftIndex.map(draft => (
              <Card
                key={draft.id}
                size='small'
                style={{
                  borderColor:
                    currentDraftId === draft.id ? '#52c41a' : '#d9d9d9',
                  background: currentDraftId === draft.id ? '#f6ffed' : '#fff',
                  cursor: 'pointer',
                }}
                bodyStyle={{ padding: '12px' }}
                onClick={() => handleLoadDraft(draft.id)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renamingDraftId === draft.id ? (
                      <Input
                        size='small'
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onPressEnter={() =>
                          handleRenameDraft(draft.id, renameValue)
                        }
                        onBlur={() => handleRenameDraft(draft.id, renameValue)}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                        style={{ marginBottom: '4px', maxWidth: '260px' }}
                      />
                    ) : (
                      <Text
                        strong
                        style={{
                          fontSize: '14px',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {draft.name}
                        {currentDraftId === draft.id && (
                          <Tag
                            color='green'
                            style={{
                              marginLeft: '8px',
                              verticalAlign: 'middle',
                            }}
                          >
                            Current
                          </Tag>
                        )}
                      </Text>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '4px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {draft.supplierName && (
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          Supplier: {draft.supplierName}
                        </Text>
                      )}
                      {draft.productName && (
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          Product: {draft.productName}
                        </Text>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        marginTop: '6px',
                        alignItems: 'center',
                      }}
                    >
                      <Tag style={{ margin: 0 }}>
                        <FileImageOutlined style={{ marginRight: '4px' }} />
                        {draft.imageCount} images
                      </Tag>
                      <Tag style={{ margin: 0 }}>
                        <ShoppingCartOutlined style={{ marginRight: '4px' }} />
                        {draft.itemCount} items
                      </Tag>
                      <Progress
                        percent={draft.progress}
                        size='small'
                        style={{ width: '80px', margin: 0 }}
                        strokeColor='#52c41a'
                      />
                    </div>

                    <Text
                      type='secondary'
                      style={{
                        fontSize: '11px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      <ClockCircleOutlined style={{ marginRight: '4px' }} />
                      Updated: {draft.updatedAt}
                    </Text>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginLeft: '8px',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Tooltip title='Open / 打开'>
                      <Button
                        type='primary'
                        size='small'
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleLoadDraft(draft.id)}
                        style={{
                          background: '#52c41a',
                          borderColor: '#52c41a',
                        }}
                      />
                    </Tooltip>
                    <Tooltip title='Rename / 重命名'>
                      <Button
                        size='small'
                        icon={<EditOutlined />}
                        onClick={() => {
                          setRenamingDraftId(draft.id);
                          setRenameValue(draft.name);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title='Delete this draft? / 删除此草稿？'
                      description='This action cannot be undone.'
                      onConfirm={() => handleDeleteDraft(draft.id)}
                      okText='Delete'
                      cancelText='Cancel'
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title='Delete / 删除'>
                        <Button size='small' danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Drawer>

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

                  {/* Platform Orders 识别按钮：上传图片后显示 */}
                  {section.id === 'platform-orders' &&
                    section.images.length > 0 && (
                      <Button
                        type='primary'
                        icon={<ScanOutlined />}
                        loading={recognizing}
                        onClick={handleRecognizeOrders}
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          background: '#52c41a',
                          borderColor: '#52c41a',
                        }}
                      >
                        {recognizing
                          ? '正在识别...'
                          : `识别订单 / Recognize Orders (${section.images.length} images)`}
                      </Button>
                    )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Actions */}
        <Card size='small' style={{ marginTop: '16px' }}>
          <Space wrap>
            <Tooltip title='Professional HTML template with one-image-per-page layout, optimized for browser printing'>
              <Button
                type='primary'
                size='large'
                icon={<PrinterOutlined />}
                onClick={handleGeneratePDFViaHTML}
                loading={pdfGenerating}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Generate PDF (HTML Template)
              </Button>
            </Tooltip>
            <Tooltip title='Legacy jsPDF generation - basic layout with multiple images per page'>
              <Button
                size='large'
                icon={<FilePdfOutlined />}
                onClick={handleGeneratePDFReport}
                loading={pdfGenerating}
              >
                Generate PDF (Legacy)
              </Button>
            </Tooltip>
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
              <strong>PDF Generation Options:</strong>
            </p>
            <ul>
              <li>
                <strong>HTML Template (Recommended):</strong> Professional
                layout with one image per page, fixed header/footer, and
                responsive image sizing. Opens in a new window for browser
                printing.
              </li>
              <li>
                <strong>Legacy Mode:</strong> Basic jsPDF generation with
                multiple images per page.
              </li>
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
