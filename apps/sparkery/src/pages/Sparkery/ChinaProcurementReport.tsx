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
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import JsPDF from 'jspdf';
import {
  generatePdfHtml,
  openPrintWindow,
  generateFilename,
  type PurchaseRecord as PdfPurchaseRecord,
  type PdfPurchaseItem,
} from '@/utils/chinaProcurementPdfTemplate';
import {
  recognizeOrderItems,
  parseDataUrl,
} from '@/services/geminiVisionService';
import {
  loadDraftIndex as loadDraftIndexFromCloud,
  saveDraft as saveDraftToCloud,
  loadDraftData as loadDraftDataFromCloud,
  deleteDraft as deleteDraftFromCloud,
  renameDraft as renameDraftInCloud,
  getDailySequence as getDailySequenceFromCloud,
} from '@/services/chinaProcurementService';
import './sparkery.css';

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

// 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ Draft System 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/** 鑽夌鍏冩暟鎹紙淇濆瓨鍦ㄧ储寮曞垪琛ㄤ腑锛?*/
interface DraftMeta {
  id: string;
  name: string;
  supplierName: string;
  productName: string;
  createdAt: string;
  updatedAt: string;
  /** 鍥剧墖鎬绘暟 */
  imageCount: number;
  /** 閲囪喘鏄庣粏鏉℃暟 */
  itemCount: number;
  /** 杩涘害鐧惧垎姣?0-100 */
  progress: number;
}

/** 瀹屾暣鑽夌鏁版嵁锛堜繚瀛樺湪鍗曠嫭鐨?localStorage key 涓級 */
interface DraftData {
  meta: DraftMeta;
  currentRecord: Partial<PurchaseRecord>;
  purchaseItems: PurchaseItem[];
  gstEnabled: boolean;
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
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const platformLabel = useCallback(
    (value: string) =>
      t(`sparkery.procurement.platforms.${value}`, {
        defaultValue:
          PLATFORMS.find(platform => platform.value === value)?.label || value,
      }),
    [t]
  );
  const categoryLabel = useCallback(
    (value: string) =>
      t(`sparkery.procurement.categories.${value}`, {
        defaultValue:
          CATEGORIES.find(category => category.value === value)?.label || value,
      }),
    [t]
  );
  const sectionMetaMap = useRef(
    new Map(DEFAULT_SECTIONS.map(section => [section.id, section]))
  );
  const sectionTitle = useCallback(
    (sectionId: string) => {
      const section = sectionMetaMap.current.get(sectionId);
      return t(`sparkery.procurement.sections.${sectionId}.title`, {
        defaultValue: section?.title || sectionId,
      });
    },
    [t]
  );
  const sectionDescription = useCallback(
    (sectionId: string) => {
      const section = sectionMetaMap.current.get(sectionId);
      return t(`sparkery.procurement.sections.${sectionId}.description`, {
        defaultValue: section?.description || '',
      });
    },
    [t]
  );
  const resolveSectionsWithLocale = useCallback(
    (sections?: DocSection[]): DocSection[] =>
      (sections || DEFAULT_SECTIONS.map(s => ({ ...s, images: [] }))).map(
        section => ({
          ...section,
          title: sectionTitle(section.id),
          description: sectionDescription(section.id),
        })
      ),
    [sectionDescription, sectionTitle]
  );

  // 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ Draft State 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  /** 褰撳墠姝ｅ湪缂栬緫鐨勮崏绋?ID锛坣ull = 鍏ㄦ柊鎶ュ憡锛?*/
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  /** 鑽夌鍒楄〃 Drawer 鏄惁鍙 */
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);
  /** 鑽夌绱㈠紩鍒楄〃 */
  const [draftIndex, setDraftIndex] = useState<DraftMeta[]>([]);
  /** 鑷笂娆′繚瀛樺悗鏄惁鏈夋湭淇濆瓨鐨勪慨鏀?*/
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** 鑷姩淇濆瓨瀹氭椂鍣?*/
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 鑽夌閲嶅懡鍚嶅脊绐?*/
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

  /** 璁㈠崟鎴浘璇嗗埆涓殑 loading 鐘舵€?*/
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

  useEffect(() => {
    let cancelled = false;
    loadDraftIndexFromCloud()
      .then(index => {
        if (!cancelled) {
          setDraftIndex(index as DraftMeta[]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          messageApi.error(
            t('sparkery.procurement.messages.loadCloudDraftsFailed', {
              defaultValue: 'Failed to load cloud drafts',
            })
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [messageApi, t]);

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
      messageApi.warning(
        t('sparkery.procurement.messages.keepAtLeastOneRow', {
          defaultValue: 'Keep at least one row',
        })
      );
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
    messageApi.success(
      t('sparkery.procurement.messages.totalSyncedToAmount', {
        defaultValue: 'Total synced to Amount field',
      })
    );
  };

  // Calculate AUD amount
  const calculateAUD = (cny: number, rate: number) => {
    return Number((cny * rate).toFixed(2));
  };

  // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?  //   DRAFT MANAGEMENT
  // 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
  /**
   * 璁＄畻褰撳墠鎶ュ憡鐨勮繘搴︾櫨鍒嗘瘮锛堝熀浜庡浘鐗囨暟閲忥級
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
   * 鐢熸垚鑽夌鍚嶇О锛堣嚜鍔ㄦ牴鎹唴瀹瑰懡鍚嶏級
   */
  const generateDraftName = useCallback((): string => {
    const supplier = currentRecord.supplierName?.trim();
    const product = currentRecord.productName?.trim();
    const date = currentRecord.purchaseDate || dayjs().format('YYYY-MM-DD');
    if (supplier && product) return `${supplier} - ${product}`;
    if (supplier) return `${supplier} (${date})`;
    if (product) return `${product} (${date})`;
    return t('sparkery.procurement.labels.autoDraftName', {
      defaultValue: 'Draft {{date}} {{time}}',
      date,
      time: dayjs().format('HH:mm'),
    });
  }, [
    currentRecord.supplierName,
    currentRecord.productName,
    currentRecord.purchaseDate,
    t,
  ]);

  /**
   * 鏋勫缓 DraftData 瀵硅薄
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
   * 淇濆瓨褰撳墠琛ㄥ崟涓鸿崏绋?   * @param silent 鏄惁闈欓粯锛堜笉鏄剧ず message锛?   */
  const handleSaveDraft = useCallback(
    async (silent = false) => {
      const draftId = currentDraftId || generateId();
      const existingMeta = draftIndex.find(d => d.id === draftId);
      const draft = buildDraftData(draftId, existingMeta?.name);

      try {
        await saveDraftToCloud(draft as any);
      } catch {
        messageApi.error(
          t('sparkery.procurement.messages.saveDraftFailed', {
            defaultValue: 'Save draft failed. Please check network and retry.',
          })
        );
        return;
      }

      const newIndex = draftIndex.filter(d => d.id !== draftId);
      newIndex.unshift(draft.meta);
      setDraftIndex(newIndex);

      if (!currentDraftId) setCurrentDraftId(draftId);
      setHasUnsavedChanges(false);

      if (!silent) {
        messageApi.success(
          t('sparkery.procurement.messages.draftSaved', {
            defaultValue: 'Draft saved successfully',
          })
        );
      }
    },
    [currentDraftId, draftIndex, buildDraftData, messageApi, t]
  );

  const handleLoadDraft = useCallback(
    async (draftId: string) => {
      const draft = await loadDraftDataFromCloud(draftId);
      if (!draft) {
        messageApi.error(
          t('sparkery.procurement.messages.draftNotFound', {
            defaultValue: 'Draft not found or data corrupted',
          })
        );
        return;
      }

      // Ensure all sections exist for backward compatibility.
      const savedSections = draft.currentRecord.sections || [];
      const mergedSections = DEFAULT_SECTIONS.map(def => {
        const saved = savedSections.find((s: any) => s.id === def.id);
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

      messageApi.success(
        t('sparkery.procurement.messages.draftLoaded', {
          defaultValue: 'Draft loaded: {{name}}',
          name: draft.meta.name,
        })
      );
    },
    [messageApi, t]
  );

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      await deleteDraftFromCloud(draftId);
      const newIndex = draftIndex.filter(d => d.id !== draftId);
      setDraftIndex(newIndex);

      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
        setHasUnsavedChanges(true);
      }

      messageApi.success(
        t('sparkery.procurement.messages.draftDeleted', {
          defaultValue: 'Draft deleted',
        })
      );
    },
    [draftIndex, currentDraftId, messageApi, t]
  );

  const handleRenameDraft = useCallback(
    async (draftId: string, newName: string) => {
      await renameDraftInCloud(draftId, newName);
      const newIndex = draftIndex.map(d =>
        d.id === draftId ? { ...d, name: newName.trim() || d.name } : d
      );
      setDraftIndex(newIndex);

      setRenamingDraftId(null);
      setRenameValue('');
      messageApi.success(
        t('sparkery.procurement.messages.draftRenamed', {
          defaultValue: 'Draft renamed',
        })
      );
    },
    [draftIndex, messageApi, t]
  );

  const handleNewReport = useCallback(() => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: t('sparkery.procurement.confirm.unsavedChangesTitle', {
          defaultValue: 'Unsaved changes',
        }),
        icon: <ExclamationCircleOutlined />,
        content: t('sparkery.procurement.confirm.unsavedChangesContent', {
          defaultValue:
            'You have unsaved changes. Do you want to save before creating a new report?',
        }),
        okText: t('sparkery.procurement.actions.saveAndNew', {
          defaultValue: 'Save & New',
        }),
        cancelText: t('sparkery.procurement.actions.discardAndNew', {
          defaultValue: 'Discard',
        }),
        onOk: () => {
          return handleSaveDraft(true).then(() => {
            resetToBlank();
          });
        },
        onCancel: () => {
          resetToBlank();
        },
      });
    } else {
      resetToBlank();
    }
  }, [hasUnsavedChanges, handleSaveDraft, t]);

  /**
   * 閲嶇疆鎵€鏈夎〃鍗曠姸鎬佷负绌虹櫧
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

  // Auto-save: mark dirty on form changes and debounce save to cloud.
  useEffect(() => {
    setHasUnsavedChanges(true);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save when there is meaningful content.
    const hasContent =
      (currentRecord.supplierName?.trim() || '') !== '' ||
      (currentRecord.productName?.trim() || '') !== '' ||
      (currentRecord.sections || []).some(s => s.images.length > 0) ||
      purchaseItems.some(i => i.productName.trim() !== '');

    if (hasContent) {
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveDraft(true); // silent auto-save
      }, 60000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRecord, purchaseItems, gstEnabled]);

  // Warn before leaving page with unsaved changes.
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

      messageApi.success(
        t('sparkery.procurement.messages.uploadedFile', {
          defaultValue: 'Uploaded: {{fileName}}',
          fileName: file.name,
        })
      );
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
   * 璇嗗埆 Platform Orders 鎴浘涓殑鍟嗗搧淇℃伅锛岃嚜鍔ㄥ～鍏呭埌閲囪喘鏄庣粏
   * 璋冪敤 Gemini Vision API锛屾敮鎸佸 Key 鑷姩杞
   */
  const handleRecognizeOrders = useCallback(async () => {
    // 鎵惧埌 platform-orders section
    const platformSection = currentRecord.sections?.find(
      s => s.id === 'platform-orders'
    );
    if (!platformSection || platformSection.images.length === 0) {
      messageApi.warning(
        t('sparkery.procurement.messages.uploadPlatformOrderScreenshotsFirst', {
          defaultValue:
            'Please upload order screenshots in Platform Orders first',
        })
      );
      return;
    }

    setRecognizing(true);
    try {
      // 灏嗘墍鏈夊浘鐗囪浆鎹负 Gemini API 闇€瑕佺殑鏍煎紡
      const images = platformSection.images.map(img => parseDataUrl(img.file));

      // 璋冪敤 Gemini Vision 璇嗗埆
      const recognizedItems = await recognizeOrderItems(images);

      if (recognizedItems.length === 0) {
        messageApi.warning(
          t('sparkery.procurement.messages.noOrderItemsRecognized', {
            defaultValue:
              'No product information was recognized from screenshots. Please check whether the images are order screenshots.',
          })
        );
        return;
      }

      // Fill recognized results into purchase items.
      setPurchaseItems(prev => {
        const hasOnlyEmptyRows = prev.every(
          item => !item.productName && item.unitPrice === 0
        );

        const newItems = recognizedItems.map(item => ({
          id: generateId(),
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        }));

        if (hasOnlyEmptyRows) {
          return newItems;
        }
        return [...prev, ...newItems];
      });

      messageApi.success(
        t('sparkery.procurement.messages.recognizedItemsFilled', {
          defaultValue:
            'Successfully recognized {{count}} items and filled them into purchase details',
          count: recognizedItems.length,
        })
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      messageApi.error(
        t('sparkery.procurement.messages.orderRecognitionFailed', {
          defaultValue: 'Order recognition failed: {{error}}',
          error: error.message,
        })
      );
    } finally {
      setRecognizing(false);
    }
  }, [currentRecord.sections, messageApi, t]);

  // Check if required fields are filled
  const checkRequiredFields = () => {
    const missingFields: string[] = [];

    if (!currentRecord.supplierName)
      missingFields.push(
        t('sparkery.procurement.fields.supplierName', {
          defaultValue: 'Supplier Name',
        })
      );
    if (!currentRecord.productName)
      missingFields.push(
        t('sparkery.procurement.fields.productName', {
          defaultValue: 'Product Name',
        })
      );
    if (!currentRecord.amountCNY || currentRecord.amountCNY <= 0)
      missingFields.push(
        t('sparkery.procurement.fields.amount', { defaultValue: 'Amount' })
      );

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
          ? `${t('sparkery.procurement.messages.missingRequiredFields', {
              defaultValue: 'Missing required fields',
            })}: ${missingFields.join(', ')}`
          : '';
      const missingSectionsText =
        missingRequiredSections.length > 0
          ? `${t('sparkery.procurement.messages.missingRequiredImages', {
              defaultValue: 'Missing required images',
            })}: ${missingRequiredSections.map(s => sectionTitle(s.id)).join(', ')}`
          : '';

      Modal.confirm({
        title: t('sparkery.procurement.messages.missingInfoContinueTitle', {
          defaultValue: 'Some information is missing. Continue generating PDF?',
        }),
        content: (
          <div>
            {missingFieldsText && (
              <p className='sparkery-procurement-missing-warning'>
                {missingFieldsText}
              </p>
            )}
            {missingSectionsText && (
              <p className='sparkery-procurement-missing-warning'>
                {missingSectionsText}
              </p>
            )}
            <p className='sparkery-procurement-missing-confirm'>
              {t('sparkery.procurement.messages.continueGeneratePdf', {
                defaultValue: 'Do you want to continue generating PDF?',
              })}
            </p>
          </div>
        ),
        okText: t('sparkery.procurement.actions.continue', {
          defaultValue: 'Continue',
        }),
        cancelText: t('sparkery.procurement.actions.goBack', {
          defaultValue: 'Go Back',
        }),
        onOk: () => {
          generatePDF();
        },
      });
    } else {
      generatePDF();
    }
  };

  // Generate PDF with all images
  const generatePDF = async () => {
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
        sections: resolveSectionsWithLocale(currentRecord.sections),
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      const dateStr = dayjs(record.purchaseDate).format('YYYYMMDD');
      // Get daily sequence number
      const dailySeq = await getDailySequenceFromCloud(dateStr);
      const dailySeqStr = dailySeq.toString().padStart(3, '0');

      const pdf = new JsPDF('p', 'mm', 'a4');
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
        pdf.text(
          t('sparkery.procurement.pdf.headerTitle', {
            defaultValue: 'China Procurement Report - {{date}}',
            date: dateStr,
          }),
          pageWidth / 2,
          10,
          { align: 'center' }
        );
        pdf.line(margin, 12, pageWidth - margin, 12);
        // Footer
        pdf.setFontSize(8);
        pdf.text(
          t('sparkery.procurement.pdf.footer', {
            defaultValue:
              'Page {{page}} of {{total}} - Generated for ATO Audit - Sparkery Business Records',
            page: pageNum,
            total: currentPage,
          }),
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        pdf.setTextColor(0, 0, 0);
      };

      // Cover Page - Page 1
      pdf.setFontSize(28);
      pdf.setTextColor(0, 0, 128);
      pdf.text(
        t('sparkery.procurement.pdf.coverTitle', {
          defaultValue: 'China Procurement Report',
        }),
        pageWidth / 2,
        40,
        {
          align: 'center',
        }
      );
      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(14);
      pdf.text(
        t('sparkery.procurement.pdf.coverSubtitle', {
          defaultValue: 'Purchase Documentation Package',
        }),
        pageWidth / 2,
        55,
        {
          align: 'center',
        }
      );

      // Cover page info box
      currentY = 80;
      pdf.setFontSize(12);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, currentY - 5, pageWidth - 2 * margin, 100, 'F');

      pdf.setFontSize(11);
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.purchaseId', {
          defaultValue: 'Purchase ID',
        })}: ${record.id}`,
        margin + 5,
        currentY + 5
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.purchaseDate', {
          defaultValue: 'Purchase Date',
        })}: ${record.purchaseDate}`,
        margin + 5,
        currentY + 15
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.supplier', {
          defaultValue: 'Supplier',
        })}: ${record.supplierName}`,
        margin + 5,
        currentY + 25
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.platform', {
          defaultValue: 'Platform',
        })}: ${platformLabel(record.supplierPlatform)}`,
        margin + 5,
        currentY + 35
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.product', {
          defaultValue: 'Product',
        })}: ${record.productName}`,
        margin + 5,
        currentY + 45
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.category', {
          defaultValue: 'Category',
        })}: ${categoryLabel(record.category)}`,
        margin + 5,
        currentY + 55
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.amountCny', {
          defaultValue: 'Amount (CNY)',
        })}: ${record.amountCNY.toLocaleString()}`,
        margin + 5,
        currentY + 65
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.amountAud', {
          defaultValue: 'Amount (AUD)',
        })}: $${record.amountAUD.toLocaleString()}`,
        margin + 5,
        currentY + 75
      );
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.exchangeRate', {
          defaultValue: 'Exchange Rate',
        })}: ${record.exchangeRate}`,
        margin + 5,
        currentY + 85
      );

      // Add folder structure on cover page
      currentY = 190;
      pdf.setFontSize(10);
      pdf.text(
        `${t('sparkery.procurement.pdf.labels.folderStructure', {
          defaultValue: 'Folder Structure',
        })}:`,
        margin,
        currentY
      );
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
          `[${section.folderName}] ${section.description} | ${t(
            'sparkery.procurement.pdf.labels.imagesShort',
            {
              defaultValue: '{{count}} imgs',
              count: section.images.length,
            }
          )}`,
          margin,
          currentY
        );
        currentY += 2;
        pdf.setFontSize(10); // 鎭㈠榛樿瀛楀彿

        // Add images - max 2 images per page
        let imagesOnCurrentPage = 0;
        const maxImagesPerPage = 2;
        // 椤甸潰鍙敤灏哄
        const availableWidth = pageWidth - 2 * margin; // 180mm
        const availableHeight = pageHeight - 30 - 20; // 247mm (鎵ｉ櫎椤堕儴鏍囬鍜屽簳閮ㄩ〉鑴?
        const pxToMm = 0.264; // 鍍忕礌杞绫宠浆鎹㈢郴鏁?
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
              const originalWidth = imgObj.width * pxToMm;
              const originalHeight = imgObj.height * pxToMm;
              const aspectRatio = imgObj.width / imgObj.height;
              const isLandscape = imgObj.width >= imgObj.height;

              if (isLandscape) {
                if (originalWidth <= availableWidth) {
                  imgWidth = originalWidth;
                  imgHeight = originalHeight;
                } else {
                  imgWidth = availableWidth;
                  imgHeight = imgWidth / aspectRatio;
                }
                if (imgHeight > availableHeight) {
                  imgHeight = availableHeight;
                  imgWidth = imgHeight * aspectRatio;
                }
              } else {
                if (originalHeight <= availableHeight) {
                  imgHeight = originalHeight;
                  imgWidth = originalWidth;
                } else {
                  imgHeight = availableHeight;
                  imgWidth = imgHeight * aspectRatio;
                }
                if (imgWidth > availableWidth) {
                  imgWidth = availableWidth;
                  imgHeight = imgWidth / aspectRatio;
                }
              }
            } else {
              imgWidth = availableWidth;
              imgHeight = 80;
            }

            // 灞呬腑鏄剧ず
            const x = margin + (availableWidth - imgWidth) / 2;

            pdf.addImage(img.file, 'JPEG', x, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 5;

            // Image caption with new format: [Date]_[DailySeq]_[ImgSeq]
            const imgSeqStr = globalImgIndex.toString().padStart(3, '0');
            const imgRef = `${dateStr}_${dailySeqStr}_${imgSeqStr}`;
            pdf.setFontSize(8);
            pdf.text(
              `${t('sparkery.procurement.pdf.labels.ref', {
                defaultValue: 'Ref',
              })}: ${imgRef}${section.tag ? ` [${section.tag}]` : ''}${img.description ? ' - ' + img.description : ''}`,
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
            pdf.text(
              `[${t('sparkery.procurement.pdf.labels.image', {
                defaultValue: 'Image',
              })}: ${imgRef} - ${img.name}]`,
              margin,
              currentY
            );
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

      messageApi.success(
        t('sparkery.procurement.messages.pdfGenerated', {
          defaultValue: 'PDF generated: {{fileName}}',
          fileName,
        })
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      messageApi.error(
        t('sparkery.procurement.messages.pdfGenerationFailed', {
          defaultValue: 'PDF generation failed: {{error}}',
          error,
        })
      );
    } finally {
      setPdfGenerating(false);
    }
  };

  // Generate PDF using HTML template (new professional layout)
  const generatePDFViaHTML = async () => {
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
        sections: resolveSectionsWithLocale(currentRecord.sections),
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      // Get daily sequence number
      const dateStr = dayjs(record.purchaseDate).format('YYYYMMDD');
      const dailySeq = await getDailySequenceFromCloud(dateStr);

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
          t('sparkery.procurement.messages.pdfPreviewOpened', {
            defaultValue:
              'PDF preview opened. Use Ctrl+P (Cmd+P on Mac) to save as PDF: {{fileName}}',
            fileName,
          })
        );
      } else {
        messageApi.error(
          t('sparkery.procurement.messages.openPrintWindowFailed', {
            defaultValue:
              'Unable to open print window. Please check popup blocker settings.',
          })
        );
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      messageApi.error(
        t('sparkery.procurement.messages.pdfGenerationFailed', {
          defaultValue: 'PDF generation failed: {{error}}',
          error,
        })
      );
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
          ? `${t('sparkery.procurement.messages.missingRequiredFields', {
              defaultValue: 'Missing required fields',
            })}: ${missingFields.join(', ')}`
          : '';
      const missingSectionsText =
        missingRequiredSections.length > 0
          ? `${t('sparkery.procurement.messages.missingRequiredImages', {
              defaultValue: 'Missing required images',
            })}: ${missingRequiredSections.map(s => sectionTitle(s.id)).join(', ')}`
          : '';

      Modal.confirm({
        title: t('sparkery.procurement.messages.missingInfoContinueTitle', {
          defaultValue: 'Some information is missing. Continue generating PDF?',
        }),
        content: (
          <div>
            {missingFieldsText && (
              <p className='sparkery-procurement-missing-warning'>
                {missingFieldsText}
              </p>
            )}
            {missingSectionsText && (
              <p className='sparkery-procurement-missing-warning'>
                {missingSectionsText}
              </p>
            )}
            <p className='sparkery-procurement-missing-confirm'>
              {t('sparkery.procurement.messages.continueGeneratePdf', {
                defaultValue: 'Do you want to continue generating PDF?',
              })}
            </p>
          </div>
        ),
        okText: t('sparkery.procurement.actions.continue', {
          defaultValue: 'Continue',
        }),
        cancelText: t('sparkery.procurement.actions.goBack', {
          defaultValue: 'Go Back',
        }),
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

  /** 褰撳墠缂栬緫鐨勮崏绋垮悕绉?*/
  const currentDraftName = currentDraftId
    ? draftIndex.find(d => d.id === currentDraftId)?.name ||
      t('sparkery.procurement.labels.untitledDraft', {
        defaultValue: 'Untitled Draft',
      })
    : null;

  const storagePercent = 0;

  return (
    <div className='sparkery-tool-page sparkery-procurement-page'>
      {contextHolder}

      {/* Draft Management Toolbar */}
      <Card
        size='small'
        className={`sparkery-procurement-draft-toolbar${currentDraftId ? ' sparkery-procurement-draft-toolbar-active' : ''}`}
      >
        <div className='sparkery-procurement-toolbar-row'>
          {/* Left: Status */}
          <div className='sparkery-procurement-toolbar-status'>
            {currentDraftId ? (
              <>
                <Tag icon={<EditOutlined />} color='green'>
                  {t('sparkery.procurement.labels.editingDraft', {
                    defaultValue: 'Editing Draft',
                  })}
                </Tag>
                <Text strong className='sparkery-procurement-meta-text'>
                  {currentDraftName}
                </Text>
                {hasUnsavedChanges && (
                  <Tag
                    color='orange'
                    className='sparkery-procurement-unsaved-tag'
                  >
                    {t('sparkery.procurement.labels.unsavedChanges', {
                      defaultValue: 'Unsaved Changes',
                    })}
                  </Tag>
                )}
              </>
            ) : (
              <>
                <Tag icon={<FileAddOutlined />} color='blue'>
                  {t('sparkery.procurement.actions.newReport', {
                    defaultValue: 'New Report',
                  })}
                </Tag>
                <Text
                  type='secondary'
                  className='sparkery-procurement-meta-text'
                >
                  {t('sparkery.procurement.labels.notSavedAsDraftYet', {
                    defaultValue: 'Not saved as draft yet',
                  })}
                </Text>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <Space size='small' wrap>
            <Tooltip
              title={t('sparkery.procurement.tooltips.saveCurrentAsDraft', {
                defaultValue: 'Save current form as draft',
              })}
            >
              <Button
                className={
                  hasUnsavedChanges
                    ? 'sparkery-procurement-save-btn sparkery-procurement-save-btn-active'
                    : 'sparkery-procurement-save-btn'
                }
                icon={<SaveOutlined />}
                type={hasUnsavedChanges ? 'primary' : 'default'}
                onClick={() => handleSaveDraft(false)}
              >
                {t('sparkery.procurement.actions.saveDraft', {
                  defaultValue: 'Save Draft',
                })}
              </Button>
            </Tooltip>
            <Tooltip
              title={t('sparkery.procurement.tooltips.openSavedDrafts', {
                defaultValue: 'Open saved drafts',
              })}
            >
              <Badge count={draftIndex.length} size='small' offset={[-4, 0]}>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => setDraftDrawerOpen(true)}
                >
                  {t('sparkery.procurement.actions.myDrafts', {
                    defaultValue: 'My Drafts',
                  })}
                </Button>
              </Badge>
            </Tooltip>
            <Tooltip
              title={t('sparkery.procurement.tooltips.startBlankReport', {
                defaultValue: 'Start a blank new report',
              })}
            >
              <Button icon={<FileAddOutlined />} onClick={handleNewReport}>
                {t('sparkery.procurement.actions.newReport', {
                  defaultValue: 'New Report',
                })}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Card>

      {/* Drafts Drawer */}
      <Drawer
        title={
          <div className='sparkery-procurement-drawer-title'>
            <FolderOpenOutlined />
            <span>
              {t('sparkery.procurement.drawer.savedDrafts', {
                defaultValue: 'Saved Drafts',
              })}
            </span>
            <Tag>{draftIndex.length}</Tag>
          </div>
        }
        placement='right'
        width={480}
        open={draftDrawerOpen}
        onClose={() => setDraftDrawerOpen(false)}
        footer={
          <div className='sparkery-procurement-drawer-footer'>
            <Text type='secondary' className='sparkery-procurement-drawer-note'>
              <CloudOutlined className='sparkery-procurement-drawer-icon' />
              {t('sparkery.procurement.drawer.cloudDraftsEnabled', {
                defaultValue: 'Cloud drafts enabled',
              })}
            </Text>
            {storagePercent > 80 && (
              <Text type='danger' className='sparkery-procurement-drawer-note'>
                {t('sparkery.procurement.drawer.storageNearlyFull', {
                  defaultValue: 'Storage nearly full!',
                })}
              </Text>
            )}
          </div>
        }
      >
        {draftIndex.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('sparkery.procurement.empty.noSavedDrafts', {
              defaultValue: 'No saved drafts',
            })}
          />
        ) : (
          <div className='sparkery-procurement-draft-list'>
            {draftIndex.map(draft => (
              <Card
                key={draft.id}
                size='small'
                className={`sparkery-procurement-draft-card${currentDraftId === draft.id ? ' sparkery-procurement-draft-card-current' : ''}`}
                onClick={() => handleLoadDraft(draft.id)}
              >
                <div className='sparkery-procurement-draft-item-row'>
                  <div className='sparkery-procurement-draft-main'>
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
                        className='sparkery-procurement-draft-rename-input'
                      />
                    ) : (
                      <Text strong className='sparkery-procurement-draft-name'>
                        {draft.name}
                        {currentDraftId === draft.id && (
                          <Tag
                            color='green'
                            className='sparkery-procurement-draft-current-tag'
                          >
                            {t('sparkery.procurement.labels.current', {
                              defaultValue: 'Current',
                            })}
                          </Tag>
                        )}
                      </Text>
                    )}

                    <div className='sparkery-procurement-draft-meta-row'>
                      {draft.supplierName && (
                        <Text
                          type='secondary'
                          className='sparkery-procurement-draft-meta-text'
                        >
                          {t('sparkery.procurement.labels.supplier', {
                            defaultValue: 'Supplier',
                          })}
                          : {draft.supplierName}
                        </Text>
                      )}
                      {draft.productName && (
                        <Text
                          type='secondary'
                          className='sparkery-procurement-draft-meta-text'
                        >
                          {t('sparkery.procurement.labels.product', {
                            defaultValue: 'Product',
                          })}
                          : {draft.productName}
                        </Text>
                      )}
                    </div>

                    <div className='sparkery-procurement-draft-stats-row'>
                      <Tag className='sparkery-procurement-draft-stat-tag'>
                        <FileImageOutlined className='sparkery-procurement-draft-stat-icon' />
                        {t('sparkery.procurement.labels.imageCount', {
                          defaultValue: '{{count}} images',
                          count: draft.imageCount,
                        })}
                      </Tag>
                      <Tag className='sparkery-procurement-draft-stat-tag'>
                        <ShoppingCartOutlined className='sparkery-procurement-draft-stat-icon' />
                        {t('sparkery.procurement.labels.itemCount', {
                          defaultValue: '{{count}} items',
                          count: draft.itemCount,
                        })}
                      </Tag>
                      <Progress
                        percent={draft.progress}
                        size='small'
                        className='sparkery-procurement-draft-progress'
                        strokeColor='#52c41a'
                      />
                    </div>

                    <Text
                      type='secondary'
                      className='sparkery-procurement-draft-updated'
                    >
                      <ClockCircleOutlined className='sparkery-procurement-draft-updated-icon' />
                      {t('sparkery.procurement.labels.updatedAt', {
                        defaultValue: 'Updated: {{value}}',
                        value: draft.updatedAt,
                      })}
                    </Text>
                  </div>

                  {/* Actions */}
                  <div
                    className='sparkery-procurement-draft-actions'
                    onClick={e => e.stopPropagation()}
                  >
                    <Tooltip
                      title={t('sparkery.procurement.tooltips.open', {
                        defaultValue: 'Open',
                      })}
                    >
                      <Button
                        type='primary'
                        size='small'
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleLoadDraft(draft.id)}
                        className='sparkery-procurement-draft-open-btn'
                      />
                    </Tooltip>
                    <Tooltip
                      title={t('sparkery.procurement.tooltips.rename', {
                        defaultValue: 'Rename',
                      })}
                    >
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
                      title={t(
                        'sparkery.procurement.confirm.deleteDraftTitle',
                        {
                          defaultValue: 'Delete this draft?',
                        }
                      )}
                      description={t(
                        'sparkery.procurement.confirm.deleteDraftDescription',
                        {
                          defaultValue: 'This action cannot be undone.',
                        }
                      )}
                      onConfirm={() => handleDeleteDraft(draft.id)}
                      okText={t('sparkery.procurement.actions.delete', {
                        defaultValue: 'Delete',
                      })}
                      cancelText={t('sparkery.procurement.actions.cancel', {
                        defaultValue: 'Cancel',
                      })}
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip
                        title={t('sparkery.procurement.tooltips.delete', {
                          defaultValue: 'Delete',
                        })}
                      >
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

      <Title level={3} className='sparkery-tool-page-title'>
        <ShoppingCartOutlined className='sparkery-procurement-page-icon' />
        {t('sparkery.procurement.title', {
          defaultValue: 'China Procurement Documentation',
        })}
      </Title>
      <Text className='sparkery-tool-page-subtitle' type='secondary'>
        {t('sparkery.procurement.subtitle', {
          defaultValue:
            'Complete ATO-compliant purchase documentation system with 10-section structure',
        })}
      </Text>

      <div className='sparkery-procurement-main'>
        {/* Basic Info Card */}
        <Card
          title={t('sparkery.procurement.cards.basicInformation', {
            defaultValue: 'Basic Information',
          })}
          size='small'
          className='sparkery-procurement-basic-card'
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.purchaseDate', {
                    defaultValue: 'Purchase Date',
                  })}{' '}
                  *
                </Text>
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
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.platform', {
                    defaultValue: 'Platform',
                  })}{' '}
                  *
                </Text>
                <Select
                  className='sparkery-procurement-full-width'
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
                      {platformLabel(p.value)}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.category', {
                    defaultValue: 'Category',
                  })}{' '}
                  *
                </Text>
                <Select
                  className='sparkery-procurement-full-width'
                  value={currentRecord.category || null}
                  onChange={val =>
                    setCurrentRecord(prev => ({ ...prev, category: val }))
                  }
                >
                  {CATEGORIES.map(c => (
                    <Option key={c.value} value={c.value}>
                      {categoryLabel(c.value)}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.supplierName', {
                    defaultValue: 'Supplier Name',
                  })}{' '}
                  *
                </Text>
                <Input
                  placeholder={t(
                    'sparkery.procurement.placeholders.supplierName',
                    {
                      defaultValue: 'e.g., Shanghai Trading Co.',
                    }
                  )}
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
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.productName', {
                    defaultValue: 'Product Name',
                  })}{' '}
                  *
                </Text>
                <Input
                  placeholder={t(
                    'sparkery.procurement.placeholders.productName',
                    {
                      defaultValue: 'e.g., Microfiber Cloths 1000pcs',
                    }
                  )}
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
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.amountCny', {
                    defaultValue: 'Amount (CNY)',
                  })}{' '}
                  *
                </Text>
                <InputNumber
                  className='sparkery-procurement-full-width'
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
              <div className='sparkery-procurement-field'>
                <Text strong>
                  {t('sparkery.procurement.fields.exchangeRate', {
                    defaultValue: 'Exchange Rate (CNY->AUD)',
                  })}
                </Text>
                <InputNumber
                  className='sparkery-procurement-full-width'
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
              <div className='sparkery-procurement-field'>
                <Text strong className='sparkery-procurement-aud-label'>
                  {t('sparkery.procurement.fields.amountAud', {
                    defaultValue: 'Amount (AUD)',
                  })}
                </Text>
                <div className='sparkery-procurement-aud-amount'>
                  $
                  {currentRecord.amountAUD?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </Col>
          </Row>

          <div className='sparkery-procurement-field'>
            <Text strong>
              {t('sparkery.procurement.fields.notes', {
                defaultValue: 'Notes',
              })}
            </Text>
            <TextArea
              rows={2}
              placeholder={t('sparkery.procurement.placeholders.notes', {
                defaultValue: 'Additional notes...',
              })}
              value={currentRecord.notes}
              onChange={e =>
                setCurrentRecord(prev => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </Card>

        {/* Progress */}
        <Card size='small' className='sparkery-procurement-progress-card'>
          <div className='sparkery-procurement-progress-row'>
            <Text strong>
              {t('sparkery.procurement.cards.documentationProgress', {
                defaultValue: 'Documentation Progress',
              })}
            </Text>
            <Text>{calculateProgress()}%</Text>
          </div>
          <Progress
            percent={calculateProgress()}
            status={calculateProgress() >= 100 ? 'success' : 'active'}
          />
        </Card>

        {/* Purchase Items Table */}
        <Card
          title={t('sparkery.procurement.cards.purchaseDetails', {
            defaultValue: 'Purchase Details',
          })}
          size='small'
          className='sparkery-procurement-purchase-card'
          extra={
            <Space>
              <Button
                type='primary'
                size='small'
                icon={<PlusOutlined />}
                onClick={addPurchaseItem}
              >
                {t('sparkery.procurement.actions.addItem', {
                  defaultValue: 'Add Item',
                })}
              </Button>
            </Space>
          }
        >
          <div className='sparkery-procurement-table-wrap'>
            <table className='sparkery-procurement-table'>
              <thead>
                <tr className='sparkery-procurement-table-head-row'>
                  <th className='sparkery-procurement-th sparkery-procurement-th-index'>
                    #
                  </th>
                  <th className='sparkery-procurement-th sparkery-procurement-th-name'>
                    {t('sparkery.procurement.table.productName', {
                      defaultValue: 'Product Name',
                    })}
                  </th>
                  <th className='sparkery-procurement-th sparkery-procurement-th-price'>
                    {t('sparkery.procurement.table.unitPriceCny', {
                      defaultValue: 'Unit Price (CNY)',
                    })}
                  </th>
                  <th className='sparkery-procurement-th sparkery-procurement-th-qty'>
                    {t('sparkery.procurement.table.quantity', {
                      defaultValue: 'Quantity',
                    })}
                  </th>
                  <th className='sparkery-procurement-th sparkery-procurement-th-subtotal'>
                    {t('sparkery.procurement.table.subtotalCny', {
                      defaultValue: 'Subtotal (CNY)',
                    })}
                  </th>
                  <th className='sparkery-procurement-th sparkery-procurement-th-actions'></th>
                </tr>
              </thead>
              <tbody>
                {purchaseItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className='sparkery-procurement-td'>{index + 1}</td>
                    <td className='sparkery-procurement-td'>
                      <Input
                        placeholder={t(
                          'sparkery.procurement.placeholders.enterProductName',
                          {
                            defaultValue: 'Enter product name',
                          }
                        )}
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
                    <td className='sparkery-procurement-td'>
                      <InputNumber
                        className='sparkery-procurement-full-width'
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
                    <td className='sparkery-procurement-td'>
                      <InputNumber
                        className='sparkery-procurement-full-width'
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
                    <td className='sparkery-procurement-td sparkery-procurement-td-right'>
                      <Text strong>
                        {calculateItemSubtotal(item).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </td>
                    <td className='sparkery-procurement-td sparkery-procurement-td-center'>
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
          <Divider className='sparkery-procurement-summary-divider' />
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Space>
                <label>
                  <input
                    type='checkbox'
                    checked={gstEnabled}
                    onChange={e => setGstEnabled(e.target.checked)}
                    className='sparkery-procurement-gst-checkbox'
                  />
                  {t('sparkery.procurement.labels.enableGst', {
                    defaultValue: 'Enable GST (10%)',
                  })}
                </label>
              </Space>
            </Col>
            <Col xs={24} sm={12}>
              <div className='sparkery-procurement-summary'>
                <div className='sparkery-procurement-summary-row'>
                  <Text type='secondary'>
                    {t('sparkery.procurement.labels.subtotalExclGst', {
                      defaultValue: 'Subtotal (excl. GST):',
                    })}{' '}
                  </Text>
                  <Text strong className='sparkery-procurement-summary-value'>
                    CNY{' '}
                    {calculateTotalSubtotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </div>
                {gstEnabled && (
                  <div className='sparkery-procurement-summary-row'>
                    <Text type='secondary'>
                      {t('sparkery.procurement.labels.gst10', {
                        defaultValue: 'GST (10%):',
                      })}{' '}
                    </Text>
                    <Text className='sparkery-procurement-summary-value'>
                      CNY{' '}
                      {calculateGstAmount().toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </div>
                )}
                <div className='sparkery-procurement-summary-row'>
                  <Text strong className='sparkery-procurement-total-label'>
                    {t('sparkery.procurement.labels.total', {
                      defaultValue: 'Total:',
                    })}{' '}
                  </Text>
                  <Text strong className='sparkery-procurement-total-value'>
                    CNY{' '}
                    {calculateTotalWithGst().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </div>
                <Button type='primary' size='small' onClick={syncTotalToAmount}>
                  {t('sparkery.procurement.actions.syncToAmountField', {
                    defaultValue: 'Sync to Amount Field',
                  })}
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Documentation Sections */}
        <Card
          title={t('sparkery.procurement.cards.documentationSections', {
            defaultValue: 'Documentation Sections ({{count}} Parts)',
            count: currentRecord.sections?.length || DEFAULT_SECTIONS.length,
          })}
          size='small'
        >
          <Row gutter={[16, 16]}>
            {currentRecord.sections?.map((section, index) => (
              <Col span={8} key={section.id}>
                <Card
                  size='small'
                  title={
                    <div className='sparkery-procurement-section-title-row'>
                      <span>
                        {index + 1}. {sectionTitle(section.id)}
                        {section.required && (
                          <Text
                            type='danger'
                            className='sparkery-procurement-required-mark'
                          >
                            *
                          </Text>
                        )}
                      </span>
                      <Tag
                        color={section.images.length > 0 ? 'green' : 'default'}
                      >
                        {t('sparkery.procurement.labels.imageCount', {
                          defaultValue: '{{count}} images',
                          count: section.images.length,
                        })}
                      </Tag>
                    </div>
                  }
                >
                  <div className='sparkery-procurement-section-desc'>
                    <Text type='secondary'>
                      {sectionDescription(section.id)}
                    </Text>
                    <br />
                    <Text
                      type='secondary'
                      className='sparkery-procurement-folder-note'
                    >
                      {t('sparkery.procurement.labels.folder', {
                        defaultValue: 'Folder',
                      })}
                      : {section.folderName}/
                    </Text>
                  </div>

                  <Upload.Dragger
                    showUploadList={false}
                    beforeUpload={file =>
                      handleImageUpload(section.id, file as RcFile)
                    }
                    accept='image/*'
                    multiple
                    className='sparkery-procurement-upload-dragger'
                  >
                    <p className='ant-upload-drag-icon'>
                      <UploadOutlined />
                    </p>
                    <p className='ant-upload-text'>
                      {t('sparkery.procurement.upload.clickOrDrag', {
                        defaultValue: 'Click or drag images to upload',
                      })}
                    </p>
                    <p className='ant-upload-hint'>
                      {t('sparkery.procurement.upload.supportMultiple', {
                        defaultValue: 'Support for multiple image files',
                      })}
                    </p>
                  </Upload.Dragger>

                  {section.images.length > 0 && (
                    <div>
                      <Row gutter={[8, 8]}>
                        {section.images.map((img, imgIndex) => (
                          <Col span={12} key={img.id}>
                            <div className='sparkery-procurement-image-card'>
                              <Image
                                src={img.file}
                                alt={img.name}
                                className='sparkery-procurement-image-thumb'
                                preview={{ src: img.file }}
                              />
                              <Input
                                size='small'
                                placeholder={t(
                                  'sparkery.procurement.placeholders.imageDescription',
                                  {
                                    defaultValue: 'Description',
                                  }
                                )}
                                value={img.description}
                                onChange={e =>
                                  handleImageDescriptionChange(
                                    section.id,
                                    img.id,
                                    e.target.value
                                  )
                                }
                                className='sparkery-procurement-image-desc-input'
                              />
                              <Button
                                type='text'
                                danger
                                size='small'
                                icon={<DeleteOutlined />}
                                className='sparkery-procurement-image-delete-btn'
                                onClick={() =>
                                  handleDeleteImage(section.id, img.id)
                                }
                              >
                                {t('sparkery.procurement.actions.delete', {
                                  defaultValue: 'Delete',
                                })}
                              </Button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}

                  {/* Show recognize button after platform order images are uploaded */}
                  {section.id === 'platform-orders' &&
                    section.images.length > 0 && (
                      <Button
                        type='primary'
                        icon={<ScanOutlined />}
                        loading={recognizing}
                        onClick={handleRecognizeOrders}
                        className='sparkery-procurement-recognize-btn'
                      >
                        {recognizing
                          ? t('sparkery.procurement.actions.recognizing', {
                              defaultValue: 'Recognizing...',
                            })
                          : t('sparkery.procurement.actions.recognizeOrders', {
                              defaultValue:
                                'Recognize Orders ({{count}} images)',
                              count: section.images.length,
                            })}
                      </Button>
                    )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Actions */}
        <Card size='small' className='sparkery-procurement-actions-card'>
          <Space wrap>
            <Tooltip
              title={t('sparkery.procurement.tooltips.htmlTemplate', {
                defaultValue:
                  'Professional HTML template with one-image-per-page layout, optimized for browser printing',
              })}
            >
              <Button
                type='primary'
                size='large'
                icon={<PrinterOutlined />}
                onClick={handleGeneratePDFViaHTML}
                loading={pdfGenerating}
                className='sparkery-procurement-primary-action'
              >
                {t('sparkery.procurement.actions.generatePdfHtml', {
                  defaultValue: 'Generate PDF (HTML Template)',
                })}
              </Button>
            </Tooltip>
            <Tooltip
              title={t('sparkery.procurement.tooltips.legacyPdf', {
                defaultValue:
                  'Legacy jsPDF generation - basic layout with multiple images per page',
              })}
            >
              <Button
                size='large'
                icon={<FilePdfOutlined />}
                onClick={handleGeneratePDFReport}
                loading={pdfGenerating}
              >
                {t('sparkery.procurement.actions.generatePdfLegacy', {
                  defaultValue: 'Generate PDF (Legacy)',
                })}
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
                    sections: resolveSectionsWithLocale(currentRecord.sections),
                    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  } as PurchaseRecord;
                  const structure = generateFolderStructure(record);
                  Modal.info({
                    title: t(
                      'sparkery.procurement.modal.recommendedFolderTitle',
                      {
                        defaultValue: 'Recommended Folder Structure',
                      }
                    ),
                    content: (
                      <pre className='sparkery-procurement-folder-structure-pre'>
                        {structure}
                      </pre>
                    ),
                    width: 600,
                  });
                } else {
                  messageApi.warning(
                    t('sparkery.procurement.messages.enterProductNameFirst', {
                      defaultValue: 'Please enter product name first',
                    })
                  );
                }
              }}
            >
              {t('sparkery.procurement.actions.viewFolderStructure', {
                defaultValue: 'View Folder Structure',
              })}
            </Button>
          </Space>
        </Card>
      </div>

      {/* Instructions */}
      <Alert
        message={t('sparkery.procurement.instructions.title', {
          defaultValue: 'ATO Documentation Requirements',
        })}
        description={
          <div>
            <p>
              <strong>
                {t('sparkery.procurement.instructions.requiredSectionsTitle', {
                  defaultValue: 'Required Sections (must have images):',
                })}
              </strong>
            </p>
            <ul>
              <li>{sectionTitle('purchase-summary')}</li>
              <li>{sectionTitle('platform-orders')}</li>
              <li>{sectionTitle('payment-receipts')}</li>
              <li>{sectionTitle('delivery')}</li>
              <li>{sectionTitle('exchange-rates')}</li>
            </ul>
            <p>
              <strong>
                {t('sparkery.procurement.instructions.pdfOptionsTitle', {
                  defaultValue: 'PDF Generation Options:',
                })}
              </strong>
            </p>
            <ul>
              <li>
                <strong>
                  {t('sparkery.procurement.instructions.htmlTemplateTitle', {
                    defaultValue: 'HTML Template (Recommended):',
                  })}
                </strong>{' '}
                {t('sparkery.procurement.instructions.htmlTemplateDesc', {
                  defaultValue:
                    'Professional layout with one image per page, fixed header/footer, and responsive image sizing. Opens in a new window for browser printing.',
                })}
              </li>
              <li>
                <strong>
                  {t('sparkery.procurement.instructions.legacyModeTitle', {
                    defaultValue: 'Legacy Mode:',
                  })}
                </strong>{' '}
                {t('sparkery.procurement.instructions.legacyModeDesc', {
                  defaultValue:
                    'Basic jsPDF generation with multiple images per page.',
                })}
              </li>
            </ul>
            <p>
              <strong>
                {t('sparkery.procurement.instructions.pdfOutputTitle', {
                  defaultValue: 'PDF Output:',
                })}
              </strong>{' '}
              CN_Purchase_YYYYMMDD_Complete_Package.pdf
            </p>
            <p>
              <strong>
                {t('sparkery.procurement.instructions.fileNamingTitle', {
                  defaultValue: 'File Naming:',
                })}
              </strong>{' '}
              [Type]_[Date]_[Description]_[Version].pdf
            </p>
          </div>
        }
        type='info'
        className='sparkery-procurement-instruction-alert'
      />
    </div>
  );
};

export default ChinaProcurementReport;
