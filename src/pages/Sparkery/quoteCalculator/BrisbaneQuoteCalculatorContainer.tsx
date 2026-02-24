/**
 * Brisbane Cleaning Quote Calculator
 * 布里斯班清洁报价计算器 - 针对多种清洁类型的报价生成器
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Typography,
  Button,
  Radio,
  Checkbox,
  Space,
  Row,
  Col,
  InputNumber,
  Divider,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  type InputNumberProps,
} from 'antd';
import {
  CalculatorOutlined,
  DollarOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  FileTextOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useQuoteDraft } from '../quoteDraftContext';
import { trackSparkeryEvent } from '@/services/sparkeryTelemetry';
import {
  DEFAULT_CONFIG,
  type ManualMeasurementAddon,
  type QuoteConfig,
  type RoomType,
  type ServiceUnitValue,
} from '../quoteCalculatorConfig';
import {
  SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
  renderTemplateBundle,
  type QuoteCustomDocumentType,
  type QuoteTemplateLanguage,
  type QuoteTemplateSingleLanguage,
} from './templateEngine';
import '../sparkery.css';

const { Title, Text, Paragraph } = Typography;

const BrisbaneQuoteCalculator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const currentUiLanguage: 'en' | 'cn' = isZh ? 'cn' : 'en';
  const templateLocaleByLang = useCallback(
    (lang: 'en' | 'cn'): 'en-US' | 'zh-CN' =>
      lang === 'cn' ? 'zh-CN' : 'en-US',
    []
  );
  const tForTemplate = useCallback(
    (
      lang: 'en' | 'cn',
      key: string,
      defaultValue: string,
      options?: Record<string, string | number>
    ) =>
      t(key, {
        lng: templateLocaleByLang(lang),
        defaultValue,
        ...options,
      }),
    [t, templateLocaleByLang]
  );
  const getDiscountLabel = useCallback(
    (lang: 'en' | 'cn', discount: 'new' | 'returning' | 'referral') => {
      if (discount === 'new') {
        return tForTemplate(
          lang,
          'sparkery.quoteCalculator.discount.new',
          'New Customer Discount'
        );
      }
      if (discount === 'returning') {
        return tForTemplate(
          lang,
          'sparkery.quoteCalculator.discount.returning',
          'Returning Customer Discount'
        );
      }
      return tForTemplate(
        lang,
        'sparkery.quoteCalculator.discount.referral',
        'Referral Discount'
      );
    },
    [tForTemplate]
  );

  const [config, setConfig] = useState<QuoteConfig>(() => {
    const saved = localStorage.getItem('brisbane-quote-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并保存的配置和默认配置，确保新字段存在
      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        extraRoomPrices:
          parsed.extraRoomPrices || DEFAULT_CONFIG.extraRoomPrices,
        sqmDefaultPrices:
          parsed.sqmDefaultPrices || DEFAULT_CONFIG.sqmDefaultPrices,
      };
      // 确保 workTypes 始终使用最新默认配置（包含 pricingType 等必要字段）
      mergedConfig.workTypes = DEFAULT_CONFIG.workTypes;
      // 确保 roomTypes 具备 steamCarpetPrice 字段
      if (parsed.roomTypes) {
        mergedConfig.roomTypes = DEFAULT_CONFIG.roomTypes.map(defaultRoom => {
          const savedRoom = parsed.roomTypes.find(
            (r: RoomType) => r.id === defaultRoom.id
          );
          if (savedRoom) {
            return {
              ...defaultRoom,
              prices: savedRoom.prices || defaultRoom.prices,
            };
          }
          return defaultRoom;
        });
      }
      // 确保 propertyTypes 使用最新配置（包含正确的 bondMultiplier）
      mergedConfig.propertyTypes = DEFAULT_CONFIG.propertyTypes;
      // 确保 addonOptions 使用最新配置
      if (parsed.addonOptions) {
        mergedConfig.addonOptions = DEFAULT_CONFIG.addonOptions;
      }
      // 确保 standardInclusions 字段存在
      if (!parsed.standardInclusions) {
        mergedConfig.standardInclusions = DEFAULT_CONFIG.standardInclusions;
      }
      return mergedConfig;
    }
    return DEFAULT_CONFIG;
  });

  // 用户选择状态
  const [selectedWorkType, setSelectedWorkType] = useState<string>('airbnb');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('studio');
  const [selectedPropertyType, setSelectedPropertyType] =
    useState<string>('apartment');
  const [selectedHouseLevel, setSelectedHouseLevel] =
    useState<string>('single');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [includeSteamCarpet, setIncludeSteamCarpet] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [extraBedrooms, setExtraBedrooms] = useState<number>(0);
  const [extraBathrooms, setExtraBathrooms] = useState<number>(0);
  const [glassDoorWindowCount, setGlassDoorWindowCount] = useState<number>(1);
  const [wallStainsCount, setWallStainsCount] = useState<number>(1);
  const [acFilterCount, setAcFilterCount] = useState<number>(1);
  const [blindsCount, setBlindsCount] = useState<number>(1);
  const [moldCount, setMoldCount] = useState<number>(1);
  const [steamCarpetRoomCount, setSteamCarpetRoomCount] = useState<number>(0);
  const [customRoomType, setCustomRoomType] = useState<string>('');
  const [includeGST, setIncludeGST] = useState<boolean>(true);
  const [pdfLanguage, setPdfLanguage] =
    useState<QuoteTemplateLanguage>(currentUiLanguage);
  const [livePreviewHTML, setLivePreviewHTML] = useState('');
  const [quoteId, setQuoteId] = useState<string>(() => {
    // Generate stable quote ID on initial render
    return (
      'Q-' +
      new Date().getFullYear() +
      '-' +
      Math.random().toString(36).substr(2, 6).toUpperCase()
    );
  });

  /** Invoice 表头模式：默认 Sparkery，可选自定义（如个人名义开票） */
  const [invoiceHeaderMode, setInvoiceHeaderMode] = useState<
    'sparkery' | 'custom'
  >('sparkery');
  /** 自定义 Invoice 表头内容（当 invoiceHeaderMode === 'custom' 时使用，含银行信息） */
  const [customInvoiceHeader, setCustomInvoiceHeader] = useState<{
    companyName: string;
    abn: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    accountName: string;
    bsb: string;
    accountNumber: string;
  }>({
    companyName: '',
    abn: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
  });

  /** Invoice 发票日期（可编辑），格式 YYYY-MM-DD */
  const [invoiceDate, setInvoiceDate] = useState<string>(() =>
    dayjs().format('YYYY-MM-DD')
  );
  /** Invoice 付款期限/到期日（可编辑），格式 YYYY-MM-DD */
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>(() =>
    dayjs().add(14, 'day').format('YYYY-MM-DD')
  );
  /** 自定义输出模块：默认打印 receipt，可切换为 quote */
  const [customReportType, setCustomReportType] =
    useState<QuoteCustomDocumentType>('receipt');

  // 折扣状态
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<
    'new' | 'returning' | 'referral'
  >('new');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // 平米计价状态
  const [sqmArea, setSqmArea] = useState<number>(0);
  const [sqmPrice, setSqmPrice] = useState<number>(5); // 默认$5/平米
  const [sqmMultiplier, setSqmMultiplier] = useState<number>(1.0);
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);
  const [customBasePrice, setCustomBasePrice] = useState<number>(0);

  // 服务包报价状态
  const [serviceItems, setServiceItems] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      amount: number;
      unit: string;
    }>
  >([]);
  const [manualMeasurementAddons, setManualMeasurementAddons] = useState<
    ManualMeasurementAddon[]
  >([]);

  // Use stable unit keys internally; keep backward compatibility for legacy stored CN values.
  const unitOptions = React.useMemo(
    () =>
      [
        {
          value: 'time',
          i18nKey: 'sparkery.quoteCalculator.units.time',
          defaultValue: 'time',
        },
        {
          value: 'hour',
          i18nKey: 'sparkery.quoteCalculator.units.hour',
          defaultValue: 'hour',
        },
        {
          value: 'room',
          i18nKey: 'sparkery.quoteCalculator.units.room',
          defaultValue: 'room',
        },
        {
          value: 'month',
          i18nKey: 'sparkery.quoteCalculator.units.month',
          defaultValue: 'month',
        },
        {
          value: 'sqm',
          i18nKey: 'sparkery.quoteCalculator.units.sqm',
          defaultValue: 'sqm',
        },
        {
          value: 'hourPerWeek',
          i18nKey: 'sparkery.quoteCalculator.units.hourPerWeek',
          defaultValue: 'hour/week',
        },
        {
          value: 'timePerMonth',
          i18nKey: 'sparkery.quoteCalculator.units.timePerMonth',
          defaultValue: 'time/month',
        },
        {
          value: 'item',
          i18nKey: 'sparkery.quoteCalculator.units.item',
          defaultValue: 'item',
        },
        {
          value: 'set',
          i18nKey: 'sparkery.quoteCalculator.units.set',
          defaultValue: 'set',
        },
        {
          value: 'visit',
          i18nKey: 'sparkery.quoteCalculator.units.visit',
          defaultValue: 'visit',
        },
      ] as Array<{
        value: ServiceUnitValue;
        i18nKey: string;
        defaultValue: string;
      }>,
    []
  );

  const legacyUnitValueMap: Record<string, ServiceUnitValue> = React.useMemo(
    () => ({
      次: 'time',
      time: 'time',
      小时: 'hour',
      hour: 'hour',
      间: 'room',
      room: 'room',
      月: 'month',
      month: 'month',
      平米: 'sqm',
      sqm: 'sqm',
      '小时/周': 'hourPerWeek',
      'hour/week': 'hourPerWeek',
      '次/月': 'timePerMonth',
      'time/month': 'timePerMonth',
      项: 'item',
      item: 'item',
      套: 'set',
      set: 'set',
      visit: 'visit',
    }),
    []
  );

  const normalizeServiceUnit = useCallback(
    (unit: string | undefined | null): ServiceUnitValue => {
      if (!unit) {
        return 'time';
      }
      return legacyUnitValueMap[unit] ?? 'time';
    },
    [legacyUnitValueMap]
  );

  const getServiceUnitLabel = useCallback(
    (unit: string | undefined | null, lang: 'en' | 'cn') => {
      const normalized = normalizeServiceUnit(unit);
      const option = unitOptions.find(item => item.value === normalized);
      if (!option) {
        return tForTemplate(
          lang,
          'sparkery.quoteCalculator.units.time',
          'time'
        );
      }
      return tForTemplate(lang, option.i18nKey, option.defaultValue);
    },
    [normalizeServiceUnit, tForTemplate, unitOptions]
  );

  useEffect(() => {
    setServiceItems(prevItems => {
      let hasChanges = false;
      const normalizedItems = prevItems.map(item => {
        const normalizedUnit = normalizeServiceUnit(item.unit);
        if (item.unit !== normalizedUnit) {
          hasChanges = true;
          return { ...item, unit: normalizedUnit };
        }
        return item;
      });
      return hasChanges ? normalizedItems : prevItems;
    });
  }, [normalizeServiceUnit]);

  // 添加服务项目
  const addServiceItem = () => {
    setServiceItems([
      ...serviceItems,
      {
        id: `service-${Date.now()}`,
        title: '',
        description: '',
        amount: 0,
        unit: 'time',
      },
    ]);
  };

  // 移除服务项目
  const removeServiceItem = (id: string) => {
    setServiceItems(serviceItems.filter(item => item.id !== id));
  };

  // 更新服务项目
  const updateServiceItem = (
    id: string,
    field: string,
    value: string | number
  ) => {
    setServiceItems(
      serviceItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addManualMeasurementAddon = () => {
    setManualMeasurementAddons(prev => [
      ...prev,
      {
        id: `manual-addon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        price: 0,
        hasQuantity: false,
        quantity: 1,
      },
    ]);
  };

  const removeManualMeasurementAddon = (id: string) => {
    setManualMeasurementAddons(prev => prev.filter(item => item.id !== id));
  };

  const updateManualMeasurementAddon = (
    id: string,
    patch: Partial<ManualMeasurementAddon>
  ) => {
    setManualMeasurementAddons(prev =>
      prev.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // 配置管理弹窗
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [form] = Form.useForm();

  const currentWorkType = config.workTypes.find(
    (w: { id: string }) => w.id === selectedWorkType
  );

  const getAddonOptionById = useCallback(
    (addonId: string) =>
      config.addonOptions.find(addon => addon.id === addonId),
    [config.addonOptions]
  );

  const getAddonDisplayName = useCallback(
    (addonId: string) => {
      const addon = getAddonOptionById(addonId);
      if (!addon) {
        return addonId;
      }
      return currentUiLanguage === 'cn' ? addon.nameCN : addon.name;
    },
    [currentUiLanguage, getAddonOptionById]
  );

  const getAddonPrice = useCallback(
    (addonId: string) => getAddonOptionById(addonId)?.price ?? 0,
    [getAddonOptionById]
  );

  const getAddonHours = useCallback(
    (addonId: string) => getAddonOptionById(addonId)?.hours ?? 0,
    [getAddonOptionById]
  );

  const generateQuotePDF = (language: QuoteTemplateLanguage) => {
    const startedAt = Date.now();
    const renderedHtml = renderTemplateBundle({
      language,
      renderSingleLanguage: lang =>
        generateQuoteHTML(lang as QuoteTemplateSingleLanguage),
    });
    trackSparkeryEvent('quote.print.started', {
      data: {
        language,
        quoteId,
        templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
      },
    });

    // Open print dialog to print the HTML report as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const titleLang: 'en' | 'cn' = language === 'cn' ? 'cn' : 'en';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${tForTemplate(titleLang, 'sparkery.quoteCalculator.template.window.quoteTitle', 'Quote')} - ${quoteId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
            ${getPageStyles(language)}
            @media print {
              @page {
                margin: 15mm 10mm;
                size: A4;
              }
              body { padding: 0; }
              .no-print { display: none !important; }
              .quote-container { page-break-inside: auto; }
              .quote-header { page-break-inside: avoid; page-break-after: avoid; }
              .quote-info { page-break-inside: avoid; page-break-after: avoid; }
              .quote-table { page-break-inside: auto; }
              .quote-table tr { page-break-inside: avoid; page-break-after: auto; }
              .quote-total { page-break-inside: avoid; page-break-before: avoid; }
              .quote-footer { page-break-inside: avoid; page-break-before: avoid; }
              .quote-notes { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${renderedHtml}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      trackSparkeryEvent('quote.print.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          language,
          quoteId,
          templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
        },
      });
    } else {
      trackSparkeryEvent('quote.print.failed', {
        success: false,
        durationMs: Date.now() - startedAt,
        data: {
          language,
          quoteId,
          reason: 'window_blocked',
          templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
        },
      });
      message.error(
        language === 'cn'
          ? t('sparkery.quoteCalculator.messages.printWindowBlockedCn', {
              defaultValue:
                'Cannot open print window. Please check popup blocker settings.',
            })
          : t('sparkery.quoteCalculator.messages.printWindowBlocked', {
              defaultValue:
                'Cannot open print window. Please check popup blocker settings.',
            })
      );
    }
  };

  // Get page styles based on language
  const getPageStyles = (language: QuoteTemplateLanguage): string => {
    return `
      .quote-container { max-width: 800px; margin: 0 auto; }
      .quote-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #005901; padding-bottom: 20px; }
      .quote-logo { max-height: 60px; margin-bottom: 10px; }
      .quote-title { font-size: 24px; color: #005901; margin: 10px 0; }
      .quote-id { font-size: 14px; color: #666; }
      .quote-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
      .quote-info-item { font-size: 12px; color: #333; }
      .quote-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .quote-table th, .quote-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      .quote-table th { background: #f5f5f5; }
      .col-desc { width: 50%; }
      .col-type, .col-hours, .col-amount { width: 16.66%; text-align: right; }
      .item-name { font-weight: 500; }
      .item-detail { display: block; font-size: 11px; color: #888; margin-top: 2px; }
      .quote-total { text-align: right; margin-top: 20px; }
      .quote-total-row { display: flex; justify-content: flex-end; gap: 20px; margin: 5px 0; font-size: 14px; }
      .quote-total-row.total { font-size: 18px; font-weight: bold; color: #005901; border-top: 2px solid #005901; padding-top: 10px; margin-top: 10px; }
      .quote-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
      .quote-notes { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
      .quote-notes-title { font-weight: bold; margin-bottom: 10px; }
      .sparkery-page-break { page-break-after: always; break-after: page; }
    `;
  };

  // 保存配置到localStorage
  useEffect(() => {
    localStorage.setItem('brisbane-quote-config', JSON.stringify(config));
  }, [config]);

  // Handle draft data from quote submissions
  const { draftData, setDraftData } = useQuoteDraft();

  // Auto-fill form when draftData changes
  useEffect(() => {
    if (draftData) {
      // Set work type to bond cleaning for quote requests
      setSelectedWorkType('bond');

      // Fill customer info
      setCustomerName(draftData.customerName);
      setCustomerAddress(draftData.propertyAddress);
      setNotes(
        draftData.additionalNotes +
          (draftData.preferredDate
            ? `\n${t('sparkery.quoteCalculator.messages.preferredDateLabel', {
                defaultValue: 'Preferred Date',
              })}: ${draftData.preferredDate}`
            : '') +
          (draftData.rubbishRemovalNotes
            ? `\n${t('sparkery.quoteCalculator.messages.rubbishRemovalLabel', {
                defaultValue: 'Rubbish Removal',
              })}: ${draftData.rubbishRemovalNotes}`
            : '')
      );

      // Set property type
      setSelectedPropertyType(draftData.propertyType);

      // Set house level if provided
      if (draftData.houseLevel) {
        setSelectedHouseLevel(draftData.houseLevel);
      }

      // Map room type from form to calculator
      const roomTypeMap: Record<string, string> = {
        studio: 'studio',
        '1_bed': '1_bed_1b',
        '2_bed_1b': '2_bed_1b',
        '2_bed_2b': '2_bed_2b',
        '3_bed_1b': '3_bed_1b',
        '3_bed_2b': '3_bed_2b',
        '4_bed_2b': '4_bed_2b',
        other: 'custom',
      };
      const mappedRoomType = roomTypeMap[draftData.roomType] || 'custom';
      setSelectedRoomType(mappedRoomType);
      if (mappedRoomType === 'custom' && draftData.customRoomType) {
        setCustomRoomType(draftData.customRoomType);
      }

      // Set carpet options
      setIncludeSteamCarpet(draftData.hasCarpet);
      setSteamCarpetRoomCount(draftData.carpetRooms);

      // Set addon counts
      setGlassDoorWindowCount(Math.max(1, draftData.glassDoorWindowCount || 1));
      setWallStainsCount(Math.max(1, draftData.wallStainsCount || 1));
      setAcFilterCount(Math.max(1, draftData.acFilterCount || 1));
      setBlindsCount(Math.max(1, draftData.blindsCount || 1));
      setMoldCount(Math.max(1, draftData.moldCount || 1));

      // Set addons based on boolean flags
      const addons: string[] = [];
      if (draftData.garage) addons.push('garage');
      if (draftData.oven) addons.push('oven');
      if (draftData.fridge) addons.push('fridge');
      if (draftData.heavySoiling) addons.push('heavy_soiling');
      if (draftData.rubbishRemoval) addons.push('rubbish_removal');
      if (draftData.glassDoorWindowCount > 0) addons.push('glass_door_window');
      if (draftData.wallStainsCount > 0) addons.push('wall_stains');
      if (draftData.acFilterCount > 0) addons.push('ac_filter');
      if (draftData.blindsCount > 0) addons.push('blinds');
      if (draftData.moldCount > 0) addons.push('mold');
      setSelectedAddons(addons);

      // Set discount for new customers
      if (draftData.isSparkeryNewCustomer) {
        setDiscountEnabled(true);
        setDiscountType('new');
      }

      // Clear draft data after applying
      message.success(
        t('sparkery.quoteCalculator.messages.draftAutoFilled', {
          defaultValue:
            'Quote form has been auto-filled from submission. Please review before generating quote.',
        })
      );
      setDraftData(null);
    }
  }, [draftData, setDraftData, t]);

  // 计算报价
  const calculateQuote = () => {
    const workType = config.workTypes.find(w => w.id === selectedWorkType);
    const roomType = config.roomTypes.find(r => r.id === selectedRoomType);
    const propertyType = config.propertyTypes.find(
      p => p.id === selectedPropertyType
    );
    const houseLevel = config.houseLevels.find(
      h => h.id === selectedHouseLevel
    );

    // 检查是否是服务包报价模式
    const isServicePackage = selectedWorkType === 'office-service';

    if (!workType && !isServicePackage)
      return {
        basePrice: 0,
        adjustments: 0,
        addons: 0,
        discount: 0,
        discountPercent: 0,
        discountType: null,
        subtotal: 0,
        gst: 0,
        total: 0,
        workHours: {
          base: 0,
          extraBedroom: 0,
          extraBathroom: 0,
          steamCarpet: 0,
          addons: 0,
          total: 0,
        },
        serviceItems: [],
      };

    let basePrice = 0;
    let adjustments = 0;
    let addonTotal = 0;

    if (isServicePackage) {
      // 服务包报价模式 - 基础价为 0，所有金额来自服务项目
      basePrice = 0;
      adjustments = 0;
    } else if (workType?.pricingType === 'sqm') {
      // 平米计价
      basePrice = sqmArea * sqmPrice * sqmMultiplier;
      adjustments = manualAdjustment;
    } else {
      // 房型计价（原有逻辑）
      if (!roomType && selectedRoomType !== 'custom') {
        return {
          basePrice: 0,
          adjustments: 0,
          addons: 0,
          discount: 0,
          discountPercent: 0,
          discountType: null,
          subtotal: 0,
          gst: 0,
          total: 0,
          workHours: {
            base: 0,
            extraBedroom: 0,
            extraBathroom: 0,
            steamCarpet: 0,
            addons: 0,
            total: 0,
          },
        };
      }

      // 根据清洁类型选择对应的基础价格
      if (selectedRoomType === 'custom') {
        // 自定义房型基础价来自手动输入
        basePrice = Math.max(0, customBasePrice || 0);
      } else if (roomType) {
        switch (selectedWorkType) {
          case 'airbnb':
            basePrice = roomType.prices.airbnb;
            break;
          case 'bond':
            basePrice = roomType.prices.bond;
            break;
          case 'regular':
            basePrice = roomType.prices.regular;
            break;
          default:
            basePrice = roomType.prices.regular;
        }
      }

      // 如果是住宅清洁，应用房产类型和层数加成
      if (workType?.isResidential) {
        // Bond清洁：所有房产类型都使用bondMultiplier系数
        // 地毯勾选后加到基础价，然后应用系数
        if (selectedWorkType === 'bond' && propertyType) {
          // 地毯勾选后加到基础价（steamCarpetPrice 为房型总价，不是按房间）
          if (includeSteamCarpet && roomType) {
            basePrice += roomType.steamCarpetPrice;
          }
          // Townhouse/House应用系数
          if (selectedPropertyType !== 'apartment') {
            basePrice = basePrice * propertyType.bondMultiplier;
          }
        } else if (propertyType) {
          // 非 Bond 清洁使用绝对值加成
          adjustments += propertyType.additionalPrice;
        }

        // House 层数加成（仅 House 类型）
        if (selectedPropertyType === 'house' && houseLevel) {
          adjustments += houseLevel.additionalPrice;
        }

        // 额外房间费用计算
        const extraBedroomCost =
          extraBedrooms * config.extraRoomPrices.extraBedroom;
        const extraBathroomCost =
          extraBathrooms * config.extraRoomPrices.extraBathroom;
        adjustments += extraBedroomCost + extraBathroomCost;
      }
    }

    const subtotalBeforeAddons = basePrice + adjustments;

    // 蒸洗地毯费用已在上面处理，这里不再重复计算

    // 附加选项 - 仅非服务包模式显示
    let totalAddonHours = 0;
    const addonHoursDetail: Array<{
      name: string;
      nameCN: string;
      hours: number;
      quantity: number;
    }> = [];
    let rows = '';

    if (!isServicePackage) {
      const regularAddonIds = new Set([
        'garage',
        'oven',
        'fridge',
        'rubbish_removal',
      ]);
      const regularAddonSelections: Array<{
        name: string;
        nameCN: string;
        quantity: number;
        hours: number;
        amount: number;
      }> = [];
      let nonRegularAddonRows = '';

      selectedAddons.forEach(addonId => {
        const addon = config.addonOptions.find(a => a.id === addonId);
        if (addon) {
          let quantity = 1;
          let quantityText = '';
          if (addon.id === 'glass_door_window') {
            quantity = Math.max(1, glassDoorWindowCount || 1);
            quantityText = ` x ${quantity}`;
          } else if (addon.id === 'wall_stains') {
            quantity = Math.max(1, wallStainsCount || 1);
            quantityText = ` x ${quantity}`;
          } else if (addon.id === 'ac_filter') {
            quantity = Math.max(1, acFilterCount || 1);
            quantityText = ` x ${quantity}`;
          } else if (addon.id === 'blinds') {
            quantity = Math.max(1, blindsCount || 1);
            quantityText = ` x ${quantity}`;
          } else if (addon.id === 'mold') {
            quantity = Math.max(1, moldCount || 1);
            quantityText = ` x ${quantity}`;
          }

          const hours = addon.hours * quantity;
          totalAddonHours += hours;
          addonHoursDetail.push({
            name: addon.name,
            nameCN: addon.nameCN,
            hours: hours,
            quantity: quantity,
          });

          // 计算附加服务费用
          const lineAmount =
            addon.type === 'percentage'
              ? subtotalBeforeAddons * addon.price
              : addon.price * quantity;

          if (addon.type === 'percentage') {
            addonTotal += subtotalBeforeAddons * addon.price;
          } else {
            addonTotal += addon.price * quantity;
          }

          if (regularAddonIds.has(addon.id)) {
            regularAddonSelections.push({
              name: addon.name,
              nameCN: addon.nameCN,
              quantity,
              hours,
              amount: lineAmount,
            });
            return;
          }

          // 生成HTML行 - 使用占位符，稍后根据语言替换
          // Note: item-detail with Chinese will be handled in generateQuoteHTML based on language
          nonRegularAddonRows += `
            <tr>
              <td class="col-desc">
                <span class="item-name">${addon.name}${quantityText}</span>
                <span class="item-detail" data-cn="${addon.nameCN}"></span>
              </td>
              <td class="col-type">__ADDON_TYPE__</td>
              <td class="col-hours">${hours.toFixed(1)} hrs</td>
              <td class="col-amount">$${lineAmount.toFixed(2)}</td>
            </tr>
          `;
        }
      });

      if (regularAddonSelections.length > 0) {
        const regularServicesEN = regularAddonSelections
          .map(item =>
            item.quantity > 1 ? `${item.name} x ${item.quantity}` : item.name
          )
          .join(', ');
        const regularServicesCN = regularAddonSelections
          .map(item =>
            item.quantity > 1
              ? `${item.nameCN} x ${item.quantity}`
              : item.nameCN
          )
          .join('、');
        const regularTotalHours = regularAddonSelections.reduce(
          (sum, item) => sum + item.hours,
          0
        );
        const regularTotalAmount = regularAddonSelections.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        rows += `
            <tr>
              <td class="col-desc">
                <span class="item-name">? Regular Services</span>
                <span class="item-detail" data-cn="? 常规服务：${regularServicesCN}">${regularServicesEN}</span>
              </td>
              <td class="col-type">__ADDON_TYPE__</td>
              <td class="col-hours">${regularTotalHours.toFixed(1)} hrs</td>
              <td class="col-amount">$${regularTotalAmount.toFixed(2)}</td>
            </tr>
          `;
      }

      rows += nonRegularAddonRows;

      const validManualMeasurementAddons = manualMeasurementAddons.filter(
        item => item.name.trim().length > 0 && Number(item.price) > 0
      );

      validManualMeasurementAddons.forEach(item => {
        const quantity = item.hasQuantity
          ? Math.max(1, Number(item.quantity || 1))
          : 1;
        const quantityText = item.hasQuantity ? ` x ${quantity}` : '';
        const lineTotal = Number(item.price) * quantity;
        addonTotal += lineTotal;

        rows += `
            <tr>
              <td class="col-desc">
                <span class="item-name">${item.name}${quantityText}</span>
                <span class="item-detail" data-cn="${item.name}"></span>
              </td>
              <td class="col-type">__ADDON_TYPE__</td>
              <td class="col-hours">-</td>
              <td class="col-amount">$${lineTotal.toFixed(2)}</td>
            </tr>
          `;
      });
    }

    // 璁＄畻鏈嶅姟鍖呮€讳环
    let servicePackageTotal = 0;
    if (isServicePackage) {
      servicePackageTotal = serviceItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );
    }

    let subtotal = subtotalBeforeAddons + addonTotal;

    // 如果是服务包模式，总价来自服务项目
    if (isServicePackage) {
      subtotal = servicePackageTotal;
    }

    // 计算总工时 - 仅非服务包模式
    let baseHours = 0;
    if (!isServicePackage && roomType) {
      if (selectedWorkType === 'airbnb') {
        baseHours = roomType.workHours.airbnb;
      } else if (selectedWorkType === 'bond') {
        baseHours = roomType.workHours.bond;
      } else {
        baseHours = roomType.workHours.regular;
      }
    }
    const extraBedroomHours = extraBedrooms * 0.5;
    const extraBathroomHours = extraBathrooms * 0.3;
    // 地毯工时 - 基于卧室数量计算 (Number of Bedrooms * 1 hour)
    // steamCarpetHours in config already represents the number of bedrooms
    const steamCarpetHours =
      !isServicePackage && includeSteamCarpet && roomType
        ? roomType.steamCarpetHours
        : 0;

    const totalHours =
      baseHours +
      extraBedroomHours +
      extraBathroomHours +
      steamCarpetHours +
      totalAddonHours;

    // 应用折扣
    let discountAmount = 0;
    if (discountEnabled && discountPercent > 0) {
      discountAmount = subtotal * (discountPercent / 100);
      subtotal = subtotal - discountAmount;
    }

    const gst = includeGST ? subtotal * config.gstRate : 0;
    const total = subtotal + gst;

    return {
      basePrice,
      adjustments,
      addons: addonTotal,
      discount: discountAmount || 0,
      discountPercent: discountEnabled ? discountPercent : 0,
      discountType: discountEnabled ? discountType : null,
      subtotal,
      gst,
      total,
      workHours: {
        base: baseHours,
        extraBedroom: extraBedroomHours,
        extraBathroom: extraBathroomHours,
        steamCarpet: steamCarpetHours,
        addons: totalAddonHours,
        total: totalHours,
      },
      htmlRows: rows,
      servicePackageTotal,
      isServicePackage,
    };
  };

  const quote = calculateQuote();

  // 生成 HTML 内容的辅助函数
  const generateQuoteHTML = useCallback(
    (lang: 'en' | 'cn') => {
      const currentDate = new Date().toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const validDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const workTypeName =
        config.workTypes.find(w => w.id === selectedWorkType)?.name || '';
      const roomTypeObj = config.roomTypes.find(r => r.id === selectedRoomType);
      const roomTypeName =
        selectedRoomType === 'custom'
          ? customRoomType
          : roomTypeObj?.name || '';
      const roomTypeMatch = roomTypeName.match(/(\d+)\s*Bed.*(\d+)\s*Bath/);
      const shortRoomType = roomTypeMatch
        ? `${roomTypeMatch[1]}B${roomTypeMatch[2]}B`
        : roomTypeName;

      const propertyTypeName =
        config.propertyTypes.find(p => p.id === selectedPropertyType)?.name ||
        '';

      // 判断是否为服务包模式
      const isServicePackage = quote.isServicePackage;
      const serviceItemFallback = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.serviceItem',
        'Service Item'
      );
      const baseServiceLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.baseService',
        'Base Service'
      );
      const addOnLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.addOn',
        'Add-on'
      );
      const adjustmentLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.adjustment',
        'Adjustment'
      );
      const includedLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.included',
        '(Included)'
      );
      const areaLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.area',
        'Area'
      );
      const multiplierLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.multiplier',
        'Multiplier'
      );
      const sqmUnitLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.sqmUnit',
        'sqm'
      );
      const hoursUnitLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.units.hoursShort',
        'hrs'
      );
      const servicesSubtotalLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.servicesSubtotal',
        'Services Subtotal'
      );
      const subtotalLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.summary.subtotal',
        'Subtotal'
      );
      const gstLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.summary.gst',
        'GST (10%)'
      );
      const totalHoursLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.summary.totalWorkHours',
        'Total Work Hours'
      );
      const totalLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.summary.total',
        'Total'
      );
      const sqmPricingLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.sqmPricing',
        'SQM Pricing'
      );
      const baseServiceNameLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.bondServiceName',
        'Bond Cleaning Service (End of Lease)'
      );
      const propertyTypeLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.propertyType',
        'Property Type'
      );
      const baseServiceIncludesLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.bondServiceIncludes',
        'Includes: Kitchen, Bathrooms, Living Areas, Windows (Internal), Floors.'
      );
      const steamCarpetNameLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.steamCarpetName',
        'Carpet Steam Cleaning'
      );
      const steamCarpetDescLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.steamCarpetDesc',
        'Professional hot water extraction for all carpeted areas'
      );
      const extraRoomAdjustmentLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.extraRoomAdjustment',
        'Extra Rooms Adjustment'
      );
      const discountLabel = getDiscountLabel(
        lang,
        (quote.discountType as 'new' | 'returning' | 'referral') || 'new'
      );

      // 根据不同模式生成表格内容
      let tableContent = '';
      let serviceItemRows = '';

      if (isServicePackage) {
        // Service package mode - list service items
        serviceItems.forEach(item => {
          // Handle line breaks in description
          const formattedDescription = (item.description || '-')
            .replace(/\n/g, '<br>')
            .replace(/\r\n/g, '<br>');
          const unitLabel = getServiceUnitLabel(item.unit, lang);

          serviceItemRows += `
          <tr>
            <td class="col-desc">
              <span class="item-name">${item.title || serviceItemFallback}</span>
              <span class="item-detail">${formattedDescription}</span>
            </td>
            <td class="col-type">${unitLabel}</td>
            <td class="col-hours">-</td>
            <td class="col-amount">$${item.amount.toFixed(2)}</td>
          </tr>
        `;
        });
        tableContent = serviceItemRows;
      } else {
        // 标准模式 - 原有逻辑
        // 基础服务
        let baseServiceRow = '';
        if (
          selectedWorkType !== 'office' &&
          selectedWorkType !== 'construction' &&
          selectedWorkType !== 'commercial'
        ) {
          baseServiceRow = `
          <tr>
            <td class="col-desc">
              <span class="item-name">${baseServiceNameLabel}</span>
              <span class="item-detail">${propertyTypeLabel}: ${propertyTypeName} (${shortRoomType})<br>${baseServiceIncludesLabel}</span>
            </td>
            <td class="col-type">${baseServiceLabel}</td>
            <td class="col-hours">${quote.workHours.base.toFixed(1)} ${hoursUnitLabel}</td>
            <td class="col-amount">$${quote.basePrice.toFixed(2)}</td>
          </tr>
        `;
        } else {
          // 平米计价模式
          baseServiceRow = `
          <tr>
            <td class="col-desc">
              <span class="item-name">${workTypeName}</span>
              <span class="item-detail">${areaLabel}: ${sqmArea} ${sqmUnitLabel} x $${sqmPrice}/${sqmUnitLabel}${sqmMultiplier !== 1 ? `<br>${multiplierLabel}: x${sqmMultiplier}` : ''}</span>
            </td>
            <td class="col-type">${sqmPricingLabel}</td>
            <td class="col-hours">-</td>
            <td class="col-amount">$${quote.basePrice.toFixed(2)}</td>
          </tr>
        `;
        }

        // 地毯清洁
        const steamCarpetRow =
          quote.workHours.steamCarpet > 0
            ? `
        <tr>
          <td class="col-desc">
            <span class="item-name">${steamCarpetNameLabel}</span>
            <span class="item-detail">${steamCarpetDescLabel}</span>
          </td>
          <td class="col-type">${addOnLabel}</td>
          <td class="col-hours">${quote.workHours.steamCarpet.toFixed(1)} ${hoursUnitLabel}</td>
          <td class="col-amount">${includedLabel}</td>
        </tr>
      `
            : '';

        // 额外房间调整
        const adjustmentRow =
          quote.adjustments > 0
            ? `
        <tr>
          <td class="col-desc">
            <span class="item-name">${extraRoomAdjustmentLabel}</span>
          </td>
          <td class="col-type">${adjustmentLabel}</td>
          <td class="col-hours">-</td>
          <td class="col-amount">$${quote.adjustments.toFixed(2)}</td>
        </tr>
      `
            : '';

        // 附加服务
        const addonRows = (quote.htmlRows || '')
          .replace(/__ADDON_TYPE__/g, addOnLabel)
          .replace(
            /<span class="item-detail" data-cn="([^"]*)">([\s\S]*?)<\/span>/g,
            (_match, cnText, enText) =>
              lang === 'cn'
                ? cnText
                  ? `<span class="item-detail">${cnText}</span>`
                  : ''
                : enText
                  ? `<span class="item-detail">${enText}</span>`
                  : ''
          );

        tableContent =
          baseServiceRow + steamCarpetRow + adjustmentRow + addonRows;
      }

      // 根据不同模式生成总计区域
      let totalSection = '';
      if (isServicePackage) {
        // Service package mode total
        totalSection = `
        <div class="total-section">
          <div class="total-row">
            <span>${servicesSubtotalLabel}</span>
            <span>$${quote.servicePackageTotal.toFixed(2)}</span>
          </div>
          ${
            quote.discount > 0
              ? `
          <div class="total-row total-row-discount">
            <span>${discountLabel} (${quote.discountPercent}%)</span>
            <span>-$${quote.discount.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            includeGST
              ? `
          <div class="total-row total-row-gst">
            <span>${gstLabel}</span>
            <span>$${quote.gst.toFixed(2)}</span>
          </div>`
              : ''
          }
          <div class="total-row grand-total">
            <span>${totalLabel}</span>
            <span>$${quote.total.toFixed(2)}</span>
          </div>
        </div>
      `;
      } else {
        // Standard mode total
        totalSection = `
        <div class="total-section">
          <div class="total-row">
            <span>${subtotalLabel}</span>
            <span>$${(quote.subtotal + quote.discount).toFixed(2)}</span>
          </div>
          ${
            quote.discount > 0
              ? `
          <div class="total-row total-row-discount">
            <span>${discountLabel} (${quote.discountPercent}%)</span>
            <span>-$${quote.discount.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            includeGST
              ? `
          <div class="total-row total-row-gst">
            <span>${gstLabel}</span>
            <span>$${quote.gst.toFixed(2)}</span>
          </div>`
              : ''
          }
          <div class="total-row total-row-hours">
            <span>${totalHoursLabel}</span>
            <span>${quote.workHours.total.toFixed(1)} ${hoursUnitLabel}</span>
          </div>
          <div class="total-row grand-total">
            <span>${totalLabel}</span>
            <span>$${quote.total.toFixed(2)}</span>
          </div>
        </div>
      `;
      }

      const documentTitle = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.documentTitleService',
            'Sparkery Service Quote'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.documentTitle',
            'Sparkery Quote'
          );
      const quoteForLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.quoteFor',
        'Quote For'
      );
      const customerNamePlaceholder = tForTemplate(
        lang,
        'sparkery.quoteCalculator.placeholders.customerName',
        'Customer Name'
      );
      const addressPlaceholder = tForTemplate(
        lang,
        'sparkery.quoteCalculator.placeholders.address',
        'Address'
      );
      const quoteHeadingLabel = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.serviceQuoteHeading',
            'SERVICE QUOTE'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.quoteHeading',
            'QUOTE'
          );
      const quoteDateLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.quoteDate',
        'Quote Date'
      );
      const validUntilLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.validUntil',
        'Valid Until'
      );
      const referenceLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.reference',
        'Reference'
      );
      const descriptionLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.description',
        'Description'
      );
      const unitLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.fields.unit',
        'Unit'
      );
      const hoursLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.hours',
        'Hours'
      );
      const amountLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.amountAud',
        'Amount (AUD)'
      );
      const termsLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.terms',
        'Terms & Conditions'
      );
      const guaranteeTitleLabel = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.serviceGuaranteeTitle',
            'Satisfaction Guarantee'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.bondGuaranteeTitle',
            'Bond Back Guarantee'
          );
      const guaranteeDescLabel = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.serviceGuaranteeDesc',
            'We pride ourselves on quality. If you are dissatisfied with any aspect of our service, please notify us within 24 hours, and we will return to rectify the issue at no extra charge.'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.bondGuaranteeDesc',
            'We offer a 72-hour rectification guarantee for any cleaning issues raised by your agent.'
          );
      const accessTitleLabel = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.serviceAccessTitle',
            'Access & Security'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.accessTitle',
            'Access'
          );
      const accessDescLabel = isServicePackage
        ? tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.serviceAccessDesc',
            'Client to provide necessary keys/access cards and alarm codes. All keys are held securely and coded for anonymity.'
          )
        : tForTemplate(
            lang,
            'sparkery.quoteCalculator.template.quote.accessDesc',
            'Please ensure electricity and hot water are connected.'
          );
      const bankTransferLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.bankTransferDetails',
        'BANK TRANSFER DETAILS'
      );
      const accountNameLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.accountName',
        'Account Name'
      );
      const accountLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.common.account',
        'Account'
      );
      const thankYouLabel = tForTemplate(
        lang,
        'sparkery.quoteCalculator.template.quote.thankYou',
        'Thank you for choosing Sparkery - Making Brisbane Sparkle!'
      );

      return `<!DOCTYPE html>
<html lang="${lang === 'cn' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <title>${documentTitle}</title>
    <style>
        /* 页面基础设置：A4 尺寸 */
        @page {
            size: A4;
            margin: 0;
        }
        body {
            font-family: ${isServicePackage ? '' : lang === 'cn' ? "'Microsoft YaHei', 'PingFang SC', " : ''}'Segoe UI', Tahoma, Geneva, Verdana, sans-serif';
            margin: 0;
            padding: 0;
            background: #fff;
            color: #333;
            -webkit-print-color-adjust: exact;
        }
        .page-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm 20mm;
            box-sizing: border-box;
            position: relative;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #005901;
            padding-bottom: 5px;
        }
        .logo-section img {
            height: 80px;
            width: auto;
        }
        .company-details {
            text-align: right;
            font-size: 13px;
            line-height: 1.5;
            color: #555;
        }
        .company-name {
            font-size: 18px;
            font-weight: 700;
            color: #005901;
            margin-bottom: 5px;
        }
        .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .recipient-box, .quote-meta-box {
            width: 48%;
        }
        h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 1px;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }
        .client-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .client-address {
            font-size: 14px;
            color: #555;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
        }
        .meta-label { font-weight: 600; color: #555; }
        .quote-title {
            font-size: 28px;
            color: #005901;
            font-weight: 300;
            text-align: right;
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        thead th {
            background-color: #f4f8f4;
            color: #005901;
            padding: 12px 10px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid #005901;
        }
        tbody td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
            vertical-align: top;
        }
        .col-desc { width: 50%; }
        .col-type { width: 15%; color: #666; font-size: 12px; }
        .col-hours { width: 15%; text-align: center; color: #666; font-size: 12px; }
        .col-amount { width: 20%; text-align: right; font-weight: 600; }
        .th-hours { text-align: center !important; }
        .th-amount { text-align: right !important; }
        .item-name { font-weight: 600; display: block; }
        .item-detail { display: block; font-size: 12px; color: #888; margin-top: 2px; white-space: normal; word-wrap: break-word; line-height: 1.5; margin-left: 0; padding-left: 0; text-indent: 0; }
        .total-section {
            width: 40%;
            margin-left: auto;
            border-top: 2px solid #005901;
            padding-top: 10px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .total-row-discount { color: #005901; }
        .total-row-gst { color: #666; }
        .total-row-hours { color: #005901; font-weight: 600; }
        .grand-total {
            font-size: 20px;
            font-weight: 700;
            color: #005901;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        }
        .footer-note {
            margin-top: 50px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
            line-height: 1.6;
        }
        .bank-details {
            margin-top: 10px;
            font-weight: 600;
            color: #333;
        }
        .terms-list {
            margin: 5px 0;
            padding-left: 20px;
        }
        .sparkery-page-break {
            page-break-after: always;
            break-after: page;
        }
        .page-footer {
            position: absolute;
            bottom: 15mm;
            left: 20mm;
            right: 20mm;
            text-align: center;
            font-size: 11px;
            color: #aaa;
            border-top: 1px solid #eee;
            padding-top: 10px;
        }
        @media screen and (max-width: 768px) {
            .page-container {
                width: 100%;
                min-height: auto;
                padding: 12px 12px 18px;
            }
            header {
                flex-direction: column;
                gap: 10px;
                margin-bottom: 18px;
            }
            .logo-section img {
                height: 56px;
            }
            .company-details {
                text-align: left;
                font-size: 11px;
            }
            .info-grid {
                flex-direction: column;
                gap: 10px;
                margin-bottom: 18px;
            }
            .recipient-box, .quote-meta-box {
                width: 100%;
            }
            .quote-title {
                text-align: left;
                font-size: 22px;
                margin-bottom: 8px;
            }
            table {
                table-layout: fixed;
                margin-bottom: 16px;
            }
            thead th, tbody td {
                padding: 8px 6px;
                font-size: 11px;
            }
            .col-desc {
                width: 48%;
            }
            .col-type, .col-hours, .col-amount {
                font-size: 10px;
            }
            .item-name {
                font-size: 12px;
                line-height: 1.35;
            }
            .item-detail {
                font-size: 10px;
                line-height: 1.35;
            }
            .total-section {
                width: 100%;
            }
            .footer-note {
                margin-top: 20px;
                padding: 12px;
            }
            .terms-list {
                padding-left: 16px;
            }
            .page-footer {
                position: static;
                margin-top: 16px;
                padding-top: 8px;
            }
        }
    </style>
</head>
<body>

<div class="page-container">
    <!-- 头部 -->
    <header>
        <div class="logo-section">
            <img src="https://sparkery.com.au/wp-content/uploads/2025/11/logo.png" alt="Sparkery Logo">
        </div>
        <div class="company-details">
            <div class="company-name">Sparkery (Wendeal Pty Ltd)</div>
            <div>ABN: 23632257535</div>
            <div>52 Wecker Road, Mansfield QLD 4122</div>
            <div>E: info@sparkery.com.au</div>
            <div>P: 0478 540 915</div>
            <div>W: www.sparkery.com.au</div>
        </div>
    </header>

    <!-- 客户信息 -->
    <div class="info-grid">
        <div class="recipient-box">
            <h3>${quoteForLabel}</h3>
            <div class="client-name">${customerName || customerNamePlaceholder}</div>
            <div class="client-address">${customerAddress || addressPlaceholder}</div>
        </div>
        <div class="quote-meta-box">
            <div class="quote-title">${quoteHeadingLabel}</div>
            <div class="meta-row">
                <span class="meta-label">${quoteDateLabel}:</span>
                <span>${currentDate}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${validUntilLabel}:</span>
                <span>${validDate}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${referenceLabel}:</span>
                <span>#${quoteId}</span>
            </div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>${descriptionLabel}</th>
                <th>${unitLabel}</th>
                <th class="th-hours">${hoursLabel}</th>
                <th class="th-amount">${amountLabel}</th>
            </tr>
        </thead>
        <tbody>
            ${tableContent}
        </tbody>
    </table>
    ${totalSection}

    <!-- Footer Notes -->
    <div class="footer-note">
        <strong>${termsLabel}:</strong>
        <ul class="terms-list">
            <li><strong>${guaranteeTitleLabel}:</strong> ${guaranteeDescLabel}</li>
            <li><strong>${accessTitleLabel}:</strong> ${accessDescLabel}</li>
        </ul>
        ${
          includeGST
            ? `<div class="bank-details">
            ${bankTransferLabel}:<br>
            ${accountNameLabel}: WENDEAL PTY LTD<br>
            BSB: 013711  | ${accountLabel}: 332166314
        </div>`
            : ''
        }
    </div>

    <div class="page-footer">
        ${thankYouLabel}
    </div>
    </div>
</body>
</html>`;
    },
    [
      config,
      selectedWorkType,
      selectedRoomType,
      selectedPropertyType,
      customRoomType,
      quote,
      serviceItems,
      getServiceUnitLabel,
      customerName,
      customerAddress,
      quoteId,
      sqmArea,
      sqmPrice,
      sqmMultiplier,
      includeGST,
      tForTemplate,
      getDiscountLabel,
    ]
  );

  /**
   * ?? Invoice ??? HTML?????????????? Sparkery ?????
   * @param lang ?? 'en' | 'cn'
   * @returns ?? Invoice HTML ???
   */

  const generateInvoiceHTML = (
    lang: 'en' | 'cn',
    documentType: QuoteCustomDocumentType = 'receipt'
  ) => {
    const isCustomQuote = documentType === 'quote';
    const invoiceDateFormatted = invoiceDate
      ? dayjs(invoiceDate).format('DD MMM YYYY')
      : dayjs().format('DD MMM YYYY');
    const dueDateFormatted = invoiceDueDate
      ? dayjs(invoiceDueDate).format('DD MMM YYYY')
      : dayjs().add(14, 'day').format('DD MMM YYYY');

    const workTypeName =
      config.workTypes.find(w => w.id === selectedWorkType)?.name || '';
    const roomTypeObj = config.roomTypes.find(r => r.id === selectedRoomType);
    const roomTypeName =
      selectedRoomType === 'custom' ? customRoomType : roomTypeObj?.name || '';
    const roomTypeMatch = roomTypeName.match(/(\d+)\s*Bed.*(\d+)\s*Bath/);
    const shortRoomType = roomTypeMatch
      ? `${roomTypeMatch[1]}B${roomTypeMatch[2]}B`
      : roomTypeName;
    const propertyTypeName =
      config.propertyTypes.find(p => p.id === selectedPropertyType)?.name || '';
    const isServicePackage = quote.isServicePackage;
    const serviceItemFallback = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.serviceItem',
      'Service Item'
    );
    const baseServiceLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.baseService',
      'Base Service'
    );
    const addOnLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.addOn',
      'Add-on'
    );
    const adjustmentLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.adjustment',
      'Adjustment'
    );
    const includedLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.included',
      '(Included)'
    );
    const areaLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.area',
      'Area'
    );
    const multiplierLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.multiplier',
      'Multiplier'
    );
    const sqmUnitLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.sqmUnit',
      'sqm'
    );
    const hoursUnitLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.units.hoursShort',
      'hrs'
    );
    const servicesSubtotalLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.servicesSubtotal',
      'Services Subtotal'
    );
    const subtotalLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.summary.subtotal',
      'Subtotal'
    );
    const gstLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.summary.gst',
      'GST (10%)'
    );
    const totalHoursLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.summary.totalWorkHours',
      'Total Work Hours'
    );
    const totalLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.summary.total',
      'Total'
    );
    const sqmPricingLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.sqmPricing',
      'SQM Pricing'
    );
    const baseServiceNameLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.bondServiceName',
      'Bond Cleaning Service (End of Lease)'
    );
    const propertyTypeLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.propertyType',
      'Property Type'
    );
    const baseServiceIncludesLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.bondServiceIncludes',
      'Includes: Kitchen, Bathrooms, Living Areas, Windows (Internal), Floors.'
    );
    const steamCarpetNameLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.steamCarpetName',
      'Carpet Steam Cleaning'
    );
    const steamCarpetDescLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.steamCarpetDesc',
      'Professional hot water extraction for all carpeted areas'
    );
    const extraRoomAdjustmentLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.quote.extraRoomAdjustment',
      'Extra Rooms Adjustment'
    );
    const discountLabel = getDiscountLabel(
      lang,
      (quote.discountType as 'new' | 'returning' | 'referral') || 'new'
    );

    let tableContent = '';
    let serviceItemRows = '';
    if (isServicePackage) {
      serviceItems.forEach(item => {
        const formattedDescription = (item.description || '-')
          .replace(/\n/g, '<br>')
          .replace(/\r\n/g, '<br>');
        const unitLabel = getServiceUnitLabel(item.unit, lang);
        serviceItemRows += `
          <tr>
            <td class="col-desc">
              <span class="item-name">${item.title || serviceItemFallback}</span>
              <span class="item-detail">${formattedDescription}</span>
            </td>
            <td class="col-type">${unitLabel}</td>
            <td class="col-hours">-</td>
            <td class="col-amount">$${item.amount.toFixed(2)}</td>
          </tr>
        `;
      });
      tableContent = serviceItemRows;
    } else {
      let baseServiceRow = '';
      if (
        selectedWorkType !== 'office' &&
        selectedWorkType !== 'construction' &&
        selectedWorkType !== 'commercial'
      ) {
        baseServiceRow = `
          <tr>
            <td class="col-desc">
              <span class="item-name">${baseServiceNameLabel}</span>
              <span class="item-detail">${propertyTypeLabel}: ${propertyTypeName} (${shortRoomType})<br>${baseServiceIncludesLabel}</span>
            </td>
            <td class="col-type">${baseServiceLabel}</td>
            <td class="col-hours">${quote.workHours.base.toFixed(1)} ${hoursUnitLabel}</td>
            <td class="col-amount">$${quote.basePrice.toFixed(2)}</td>
          </tr>
        `;
      } else {
        baseServiceRow = `
          <tr>
            <td class="col-desc">
              <span class="item-name">${workTypeName}</span>
              <span class="item-detail">${areaLabel}: ${sqmArea} ${sqmUnitLabel} x $${sqmPrice}/${sqmUnitLabel}${sqmMultiplier !== 1 ? `<br>${multiplierLabel}: x${sqmMultiplier}` : ''}</span>
            </td>
            <td class="col-type">${sqmPricingLabel}</td>
            <td class="col-hours">-</td>
            <td class="col-amount">$${quote.basePrice.toFixed(2)}</td>
          </tr>
        `;
      }
      const steamCarpetRow =
        quote.workHours.steamCarpet > 0
          ? `
        <tr>
          <td class="col-desc">
            <span class="item-name">${steamCarpetNameLabel}</span>
            <span class="item-detail">${steamCarpetDescLabel}</span>
          </td>
          <td class="col-type">${addOnLabel}</td>
          <td class="col-hours">${quote.workHours.steamCarpet.toFixed(1)} ${hoursUnitLabel}</td>
          <td class="col-amount">${includedLabel}</td>
        </tr>
      `
          : '';
      const adjustmentRow =
        quote.adjustments > 0
          ? `
        <tr>
          <td class="col-desc">
            <span class="item-name">${extraRoomAdjustmentLabel}</span>
          </td>
          <td class="col-type">${adjustmentLabel}</td>
          <td class="col-hours">-</td>
          <td class="col-amount">$${quote.adjustments.toFixed(2)}</td>
        </tr>
      `
          : '';
      const addonRows = (quote.htmlRows || '')
        .replace(/__ADDON_TYPE__/g, addOnLabel)
        .replace(
          /<span class="item-detail" data-cn="([^"]*)">([\s\S]*?)<\/span>/g,
          (_match, cnText, enText) =>
            lang === 'cn'
              ? cnText
                ? `<span class="item-detail">${cnText}</span>`
                : ''
              : enText
                ? `<span class="item-detail">${enText}</span>`
                : ''
        );
      tableContent =
        baseServiceRow + steamCarpetRow + adjustmentRow + addonRows;
    }

    let totalSection = '';
    if (isServicePackage) {
      totalSection = `
        <div class="total-section">
          <div class="total-row">
            <span>${servicesSubtotalLabel}</span>
            <span>$${quote.servicePackageTotal.toFixed(2)}</span>
          </div>
          ${
            quote.discount > 0
              ? `
          <div class="total-row total-row-discount">
            <span>${discountLabel} (${quote.discountPercent}%)</span>
            <span>-$${quote.discount.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            includeGST
              ? `
          <div class="total-row total-row-gst">
            <span>${gstLabel}</span>
            <span>$${quote.gst.toFixed(2)}</span>
          </div>`
              : ''
          }
          <div class="total-row grand-total">
            <span>${totalLabel}</span>
            <span>$${quote.total.toFixed(2)}</span>
          </div>
        </div>
      `;
    } else {
      totalSection = `
        <div class="total-section">
          <div class="total-row">
            <span>${subtotalLabel}</span>
            <span>$${(quote.subtotal + quote.discount).toFixed(2)}</span>
          </div>
          ${
            quote.discount > 0
              ? `
          <div class="total-row total-row-discount">
            <span>${discountLabel} (${quote.discountPercent}%)</span>
            <span>-$${quote.discount.toFixed(2)}</span>
          </div>`
              : ''
          }
          ${
            includeGST
              ? `
          <div class="total-row total-row-gst">
            <span>${gstLabel}</span>
            <span>$${quote.gst.toFixed(2)}</span>
          </div>`
              : ''
          }
          <div class="total-row total-row-hours">
            <span>${totalHoursLabel}</span>
            <span>${quote.workHours.total.toFixed(1)} ${hoursUnitLabel}</span>
          </div>
          <div class="total-row grand-total">
            <span>${totalLabel}</span>
            <span>$${quote.total.toFixed(2)}</span>
          </div>
        </div>
      `;
    }

    const customDocumentTitle = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.customQuote.documentTitle',
          'Custom Quote'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.documentTitle',
          'Custom Receipt'
        );
    const recipientLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.quote.quoteFor',
          'Quote For'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.invoiceTo',
          'Receipt To'
        );
    const customerNamePlaceholder = tForTemplate(
      lang,
      'sparkery.quoteCalculator.placeholders.customerName',
      'Customer Name'
    );
    const addressPlaceholder = tForTemplate(
      lang,
      'sparkery.quoteCalculator.placeholders.address',
      'Address'
    );
    const documentHeadingLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.quote.quoteHeading',
          'QUOTE'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.receiptHeading',
          'RECEIPT'
        );
    const primaryDateLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.quote.quoteDate',
          'Quote Date'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.fields.invoiceDate',
          'Receipt Date'
        );
    const secondaryDateLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.quote.validUntil',
          'Valid Until'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.fields.dueDate',
          'Due Date'
        );
    const referenceLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.reference',
      'Reference'
    );
    const descriptionLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.description',
      'Description'
    );
    const unitLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.fields.unit',
      'Unit'
    );
    const hoursLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.hours',
      'Hours'
    );
    const amountLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.amountAud',
      'Amount (AUD)'
    );
    const paymentTermsLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.quote.terms',
          'Quote Notes'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.paymentTerms',
          'Payment Terms'
        );
    const paymentDueHintLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.customQuote.note',
          'This quote is based on current scope. Any scope changes may require a requote.'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.paymentDueHint',
          'Please pay by the due date.'
        );
    const bankTransferLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.bankTransferDetails',
      'BANK TRANSFER DETAILS'
    );
    const accountNameLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.accountName',
      'Account Name'
    );
    const accountLabel = tForTemplate(
      lang,
      'sparkery.quoteCalculator.template.common.account',
      'Account'
    );
    const thankYouLabel = isCustomQuote
      ? tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.customQuote.thankYou',
          'Thank you for considering us.'
        )
      : tForTemplate(
          lang,
          'sparkery.quoteCalculator.template.invoice.thankYou',
          'Thank you for your business.'
        );
    const invoiceHeaderHTML =
      invoiceHeaderMode === 'sparkery'
        ? `
    <header>
        <div class="logo-section">
            <img src="https://sparkery.com.au/wp-content/uploads/2025/11/logo.png" alt="Sparkery Logo">
        </div>
        <div class="company-details">
            <div class="company-name">Sparkery (Wendeal Pty Ltd)</div>
            <div>ABN: 23632257535</div>
            <div>52 Wecker Road, Mansfield QLD 4122</div>
            <div>E: info@sparkery.com.au</div>
            <div>P: 0478 540 915</div>
            <div>W: www.sparkery.com.au</div>
        </div>
    </header>`
        : `
    <header>
        <div class="company-details company-details-full">
            ${customInvoiceHeader.companyName ? `<div class="company-name">${customInvoiceHeader.companyName}</div>` : ''}
            ${customInvoiceHeader.abn ? `<div>ABN: ${customInvoiceHeader.abn}</div>` : ''}
            ${customInvoiceHeader.address ? `<div>${customInvoiceHeader.address}</div>` : ''}
            ${customInvoiceHeader.email ? `<div>E: ${customInvoiceHeader.email}</div>` : ''}
            ${customInvoiceHeader.phone ? `<div>P: ${customInvoiceHeader.phone}</div>` : ''}
            ${customInvoiceHeader.website ? `<div>W: ${customInvoiceHeader.website}</div>` : ''}
        </div>
    </header>`;

    return `<!DOCTYPE html>
<html lang="${lang === 'cn' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <title>${customDocumentTitle}</title>
    <style>
        @page { size: A4; margin: 0; }
        body {
            font-family: ${lang === 'cn' ? "'Microsoft YaHei', 'PingFang SC', " : ''}'Segoe UI', Tahoma, Geneva, Verdana, sans-serif';
            margin: 0; padding: 0; background: #fff; color: #333;
            -webkit-print-color-adjust: exact;
        }
        .page-container {
            width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm 20mm; box-sizing: border-box; position: relative;
        }
        header {
            display: flex; justify-content: space-between; align-items: flex-start;
            margin-bottom: 40px; border-bottom: 2px solid #005901; padding-bottom: 5px;
        }
        .logo-section img { height: 80px; width: auto; }
        .company-details { text-align: right; font-size: 13px; line-height: 1.5; color: #555; }
        .company-name { font-size: 18px; font-weight: 700; color: #005901; margin-bottom: 5px; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .recipient-box, .quote-meta-box { width: 48%; }
        h3 { font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .client-name { font-size: 18px; font-weight: 600; margin-bottom: 5px; }
        .client-address { font-size: 14px; color: #555; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
        .meta-label { font-weight: 600; color: #555; }
        .quote-title { font-size: 28px; color: #005901; font-weight: 300; text-align: right; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        thead th {
            background-color: #f4f8f4; color: #005901; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #005901;
        }
        tbody td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
        .col-desc { width: 50%; }
        .col-type { width: 15%; color: #666; font-size: 12px; }
        .col-hours { width: 15%; text-align: center; color: #666; font-size: 12px; }
        .col-amount { width: 20%; text-align: right; font-weight: 600; }
        .th-hours { text-align: center !important; }
        .th-amount { text-align: right !important; }
        .item-name { font-weight: 600; display: block; }
        .item-detail { display: block; font-size: 12px; color: #888; margin-top: 2px; white-space: normal; word-wrap: break-word; line-height: 1.5; margin-left: 0; padding-left: 0; text-indent: 0; }
        .company-details-full { width: 100%; }
        .total-section { width: 40%; margin-left: auto; border-top: 2px solid #005901; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .total-row-discount { color: #005901; }
        .total-row-gst { color: #666; }
        .total-row-hours { color: #005901; font-weight: 600; }
        .grand-total { font-size: 20px; font-weight: 700; color: #005901; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
        .footer-note { margin-top: 50px; padding: 20px; background-color: #f9f9f9; border-radius: 5px; font-size: 12px; color: #666; line-height: 1.6; }
        .bank-details { margin-top: 10px; font-weight: 600; color: #333; }
        .terms-list { margin: 5px 0; padding-left: 20px; }
        .sparkery-page-break { page-break-after: always; break-after: page; }
        .page-footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
        @media screen and (max-width: 768px) {
            .page-container { width: 100%; min-height: auto; padding: 12px 12px 18px; }
            header { flex-direction: column; gap: 10px; margin-bottom: 18px; }
            .logo-section img { height: 56px; }
            .company-details { text-align: left; font-size: 11px; }
            .info-grid { flex-direction: column; gap: 10px; margin-bottom: 18px; }
            .recipient-box, .quote-meta-box { width: 100%; }
            .quote-title { text-align: left; font-size: 22px; margin-bottom: 8px; }
            table { table-layout: fixed; margin-bottom: 16px; }
            thead th, tbody td { padding: 8px 6px; font-size: 11px; }
            .col-desc { width: 48%; }
            .col-type, .col-hours, .col-amount { font-size: 10px; }
            .item-name { font-size: 12px; line-height: 1.35; }
            .item-detail { font-size: 10px; line-height: 1.35; }
            .total-section { width: 100%; }
            .footer-note { margin-top: 20px; padding: 12px; }
            .terms-list { padding-left: 16px; }
            .page-footer { position: static; margin-top: 16px; padding-top: 8px; }
        }
    </style>
</head>
<body>
<div class="page-container">
    ${invoiceHeaderHTML}

    <div class="info-grid">
        <div class="recipient-box">
            <h3>${recipientLabel}</h3>
            <div class="client-name">${customerName || customerNamePlaceholder}</div>
            <div class="client-address">${customerAddress || addressPlaceholder}</div>
        </div>
        <div class="quote-meta-box">
            <div class="quote-title">${documentHeadingLabel}</div>
            <div class="meta-row">
                <span class="meta-label">${primaryDateLabel}:</span>
                <span>${invoiceDateFormatted}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${secondaryDateLabel}:</span>
                <span>${dueDateFormatted}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${referenceLabel}:</span>
                <span>#${quoteId}</span>
            </div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>${descriptionLabel}</th>
                <th>${unitLabel}</th>
                <th class="th-hours">${hoursLabel}</th>
                <th class="th-amount">${amountLabel}</th>
            </tr>
        </thead>
        <tbody>${tableContent}</tbody>
    </table>
    ${totalSection}

    <div class="footer-note">
        <strong>${paymentTermsLabel}:</strong>
        <ul class="terms-list">
            <li>${paymentDueHintLabel}</li>
        </ul>
        ${
          !isCustomQuote && includeGST
            ? `<div class="bank-details">
            ${bankTransferLabel}:<br>
            ${
              invoiceHeaderMode === 'custom' &&
              (customInvoiceHeader.accountName ||
                customInvoiceHeader.bsb ||
                customInvoiceHeader.accountNumber)
                ? (customInvoiceHeader.accountName
                    ? accountNameLabel +
                      ': ' +
                      customInvoiceHeader.accountName +
                      '<br>'
                    : '') +
                  (customInvoiceHeader.bsb || customInvoiceHeader.accountNumber
                    ? 'BSB: ' +
                      (customInvoiceHeader.bsb || '-') +
                      '  | ' +
                      accountLabel +
                      ': ' +
                      (customInvoiceHeader.accountNumber || '-')
                    : '')
                : accountNameLabel +
                  ': ' +
                  'WENDEAL PTY LTD<br>BSB: 013711  | ' +
                  accountLabel +
                  ': ' +
                  '332166314'
            }
        </div>`
            : ''
        }
    </div>

    <div class="page-footer">
        ${thankYouLabel}
    </div>
</div>
</body>
</html>`;
  };

  /**
   * 打开打印窗口输出 Invoice PDF（与报价单相同的呈现方式）
   */
  const generateInvoicePDF = (
    language: QuoteTemplateLanguage,
    documentType: QuoteCustomDocumentType = 'receipt'
  ) => {
    const startedAt = Date.now();
    trackSparkeryEvent('quote.custom_report.print.started', {
      data: {
        language,
        documentType,
        quoteId,
        templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
      },
    });
    const html = renderTemplateBundle({
      language,
      renderSingleLanguage: lang =>
        generateInvoiceHTML(lang as QuoteTemplateSingleLanguage, documentType),
    });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const titleLang: 'en' | 'cn' = language === 'cn' ? 'cn' : 'en';
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${
            documentType === 'quote'
              ? tForTemplate(
                  titleLang,
                  'sparkery.quoteCalculator.template.window.quoteTitle',
                  'Quote'
                )
              : tForTemplate(
                  titleLang,
                  'sparkery.quoteCalculator.template.window.invoiceTitle',
                  'Receipt'
                )
          } - ${quoteId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
            ${getPageStyles(language)}
            @media print {
              @page { margin: 15mm 10mm; size: A4; }
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      trackSparkeryEvent('quote.custom_report.print.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          language,
          documentType,
          quoteId,
          templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
        },
      });
    } else {
      trackSparkeryEvent('quote.custom_report.print.failed', {
        success: false,
        durationMs: Date.now() - startedAt,
        data: {
          language,
          documentType,
          quoteId,
          reason: 'window_blocked',
          templateEngineVersion: SPARKERY_QUOTE_TEMPLATE_ENGINE_VERSION,
        },
      });
      message.error(
        language === 'cn'
          ? t('sparkery.quoteCalculator.messages.printWindowBlockedCn', {
              defaultValue:
                'Cannot open print window. Please check popup blocker settings.',
            })
          : t('sparkery.quoteCalculator.messages.printWindowBlocked', {
              defaultValue:
                'Cannot open print window. Please check popup blocker settings.',
            })
      );
    }
  };

  // 生成实时HTML预览
  useEffect(() => {
    if (!quote) return;

    const html = renderTemplateBundle({
      language: pdfLanguage,
      renderSingleLanguage: lang =>
        generateQuoteHTML(lang as QuoteTemplateSingleLanguage),
    });

    setLivePreviewHTML(html);
  }, [
    quote,
    customerName,
    customerAddress,
    selectedWorkType,
    selectedRoomType,
    selectedPropertyType,
    config,
    includeGST,
    notes,
    pdfLanguage,
    serviceItems,
    sqmArea,
    sqmPrice,
    sqmMultiplier,
    generateQuoteHTML,
  ]);

  return (
    <div className='sparkery-tool-page sparkery-quote-calculator-page sparkery-quote-calc-shell'>
      <Title level={3} className='sparkery-tool-page-title'>
        <CalculatorOutlined className='sparkery-quote-calc-title-icon' />
        {t('sparkery.quoteCalculator.title', {
          defaultValue: 'Brisbane Cleaning Quote Calculator',
        })}
      </Title>
      <Text className='sparkery-tool-page-subtitle' type='secondary'>
        {t('sparkery.quoteCalculator.subtitle', {
          defaultValue:
            'Professional cleaning quote generator for Brisbane market',
        })}
      </Text>

      <Row gutter={24} className='sparkery-quote-calc-main-row'>
        {/* 左侧：选择区域 */}
        <Col xs={24} lg={16}>
          <Card
            title={t('sparkery.quoteCalculator.sections.quoteConfig', {
              defaultValue: 'Quote Configuration',
            })}
            className='sparkery-quote-calc-config-card'
          >
            {/* 客户信息 */}
            <Row gutter={16} className='sparkery-quote-calc-row-gap'>
              <Col xs={24} sm={12}>
                <div className='sparkery-quote-calc-field-gap'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.customerName', {
                      defaultValue: 'Customer Name',
                    })}
                  </Text>
                  <Input
                    placeholder={t(
                      'sparkery.quoteCalculator.placeholders.customerName',
                      {
                        defaultValue: 'Enter customer name',
                      }
                    )}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className='sparkery-quote-calc-field-gap'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.address', {
                      defaultValue: 'Address',
                    })}
                  </Text>
                  <Input
                    placeholder={t(
                      'sparkery.quoteCalculator.placeholders.address',
                      {
                        defaultValue: 'Enter address',
                      }
                    )}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                  />
                </div>
              </Col>
            </Row>

            <Divider />

            {/* 工作类型 */}
            <div className='sparkery-quote-calc-section'>
              <Text strong>
                {t('sparkery.quoteCalculator.fields.workType', {
                  defaultValue: 'Work Type',
                })}
              </Text>
              <Radio.Group
                value={selectedWorkType}
                onChange={e => {
                  const newWorkType = config.workTypes.find(
                    w => w.id === e.target.value
                  );
                  setSelectedWorkType(e.target.value);
                  // 重置住宅相关选项
                  if (!newWorkType?.isResidential) {
                    setSelectedPropertyType('apartment');
                    setSelectedHouseLevel('single');
                  }
                  // 根据工作类型设置默认平米单价
                  if (newWorkType?.pricingType === 'sqm') {
                    const defaultPrice =
                      config.sqmDefaultPrices[
                        newWorkType.id as keyof typeof config.sqmDefaultPrices
                      ];
                    if (defaultPrice) {
                      setSqmPrice(defaultPrice);
                    }
                  }
                }}
                className='sparkery-quote-calc-worktype-grid'
              >
                {config.workTypes.map(workType => (
                  <Radio
                    key={workType.id}
                    value={workType.id}
                    className='sparkery-quote-calc-radio-no-margin'
                  >
                    {currentUiLanguage === 'cn'
                      ? workType.nameCN
                      : workType.name}
                    {workType.isResidential && (
                      <Tag color='blue' className='sparkery-quote-calc-res-tag'>
                        {t('sparkery.quoteCalculator.tags.residential', {
                          defaultValue: 'Res',
                        })}
                      </Tag>
                    )}
                  </Radio>
                ))}
              </Radio.Group>
            </div>

            {/* 住宅清洁特有选项 */}
            {currentWorkType?.pricingType === 'room' && (
              <>
                <Divider />

                {/* 房型选择 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.baseRoomType', {
                      defaultValue: 'Base Room Type',
                    })}
                  </Text>
                  <Radio.Group
                    value={selectedRoomType}
                    onChange={e => setSelectedRoomType(e.target.value)}
                    className='sparkery-quote-calc-roomtype-grid'
                  >
                    {config.roomTypes.map(roomType => {
                      const match = roomType.name.match(
                        /(\d+)\s*Bed.*(\d+)\s*Bath/
                      );
                      const shortName = match
                        ? `${match[1]}B${match[2]}B`
                        : roomType.name;
                      return (
                        <Radio.Button
                          key={roomType.id}
                          value={roomType.id}
                          className='sparkery-quote-calc-roomtype-btn'
                        >
                          {shortName}
                        </Radio.Button>
                      );
                    })}
                    <Radio.Button
                      value='custom'
                      className='sparkery-quote-calc-roomtype-btn sparkery-quote-calc-roomtype-btn-custom'
                    >
                      {t('sparkery.quoteCalculator.actions.customRoom', {
                        defaultValue: '+ Custom',
                      })}
                    </Radio.Button>
                  </Radio.Group>
                  {selectedRoomType === 'custom' && (
                    <>
                      <Input
                        placeholder={t(
                          'sparkery.quoteCalculator.placeholders.customRoomType',
                          {
                            defaultValue: 'e.g., 5 Bed 2 Bath',
                          }
                        )}
                        value={customRoomType}
                        onChange={e => setCustomRoomType(e.target.value)}
                        className='sparkery-quote-calc-custom-room-input'
                      />
                      <InputNumber
                        placeholder={t(
                          'sparkery.quoteCalculator.placeholders.customPrice',
                          {
                            defaultValue: 'Custom price',
                          }
                        )}
                        min={0}
                        precision={2}
                        value={
                          Number.isFinite(customBasePrice) ? customBasePrice : 0
                        }
                        onChange={value =>
                          setCustomBasePrice(
                            typeof value === 'number' && Number.isFinite(value)
                              ? value
                              : 0
                          )
                        }
                        className='sparkery-quote-calc-custom-price-input'
                        prefix='$'
                      />
                    </>
                  )}
                  {/* 地毯勾选 - 仅 Bond 清洁显示 */}
                  {selectedWorkType === 'bond' &&
                    selectedRoomType !== 'custom' && (
                      <div className='sparkery-quote-calc-inline-note'>
                        <Checkbox
                          checked={includeSteamCarpet}
                          onChange={e =>
                            setIncludeSteamCarpet(e.target.checked)
                          }
                        >
                          <Text>
                            {t(
                              'sparkery.quoteCalculator.fields.includeSteamCarpet',
                              {
                                defaultValue: 'Include carpet steam cleaning',
                              }
                            )}
                          </Text>
                          <Text
                            type='secondary'
                            className='sparkery-quote-calc-inline-secondary'
                          >
                            (+$
                            {
                              config.roomTypes.find(
                                r => r.id === selectedRoomType
                              )?.steamCarpetPrice
                            }
                            )
                          </Text>
                        </Checkbox>
                      </div>
                    )}
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-helper-text'
                  >
                    {t('sparkery.quoteCalculator.summary.basePrice', {
                      defaultValue: 'Base Price',
                    })}
                    : $
                    {selectedRoomType === 'custom'
                      ? customBasePrice > 0
                        ? customBasePrice.toFixed(2)
                        : t(
                            'sparkery.quoteCalculator.messages.inputCustomPrice',
                            {
                              defaultValue: 'Please input custom price',
                            }
                          )
                      : selectedWorkType === 'bond'
                        ? (() => {
                            const room = config.roomTypes.find(
                              r => r.id === selectedRoomType
                            );
                            const prop = config.propertyTypes.find(
                              p => p.id === selectedPropertyType
                            );
                            if (room && prop) {
                              let price = room.prices.bond;
                              if (includeSteamCarpet) {
                                price += room.steamCarpetPrice;
                              }
                              if (selectedPropertyType !== 'apartment') {
                                price = price * prop.bondMultiplier;
                              }
                              return price.toFixed(0);
                            }
                            return room?.prices.bond;
                          })()
                        : config.roomTypes.find(r => r.id === selectedRoomType)
                            ?.prices[
                            selectedWorkType as keyof RoomType['prices']
                          ]}
                    {' | '}
                    {selectedRoomType !== 'custom' && (
                      <>
                        <ClockCircleOutlined className='sparkery-quote-calc-icon-gap' />
                        {
                          config.roomTypes.find(r => r.id === selectedRoomType)
                            ?.workHours[
                            selectedWorkType as keyof RoomType['workHours']
                          ]
                        }{' '}
                        {t('sparkery.quoteCalculator.units.hoursShort', {
                          defaultValue: 'hrs',
                        })}
                      </>
                    )}
                  </Text>
                </div>

                {/* 房产类型 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.propertyType', {
                      defaultValue: 'Property Type',
                    })}
                  </Text>
                  <Radio.Group
                    value={selectedPropertyType}
                    onChange={e => setSelectedPropertyType(e.target.value)}
                    className='sparkery-quote-calc-radio-row'
                  >
                    {config.propertyTypes.map(propertyType => (
                      <Radio.Button
                        key={propertyType.id}
                        value={propertyType.id}
                      >
                        {propertyType.name}
                        {selectedWorkType === 'bond'
                          ? propertyType.bondMultiplier > 1.0 && (
                              <Tag
                                color='blue'
                                className='sparkery-quote-calc-tag-inline'
                              >
                                x{propertyType.bondMultiplier}
                              </Tag>
                            )
                          : propertyType.additionalPrice > 0 && (
                              <Tag
                                color='orange'
                                className='sparkery-quote-calc-tag-inline'
                              >
                                +${propertyType.additionalPrice}
                              </Tag>
                            )}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                {/* House层数选择 */}
                {selectedPropertyType === 'house' && (
                  <div className='sparkery-quote-calc-section'>
                    <Text strong>
                      {t('sparkery.quoteCalculator.fields.storey', {
                        defaultValue: 'Storey',
                      })}
                    </Text>
                    <Radio.Group
                      value={selectedHouseLevel}
                      onChange={e => setSelectedHouseLevel(e.target.value)}
                      className='sparkery-quote-calc-radio-row'
                    >
                      {config.houseLevels.map(level => (
                        <Radio.Button key={level.id} value={level.id}>
                          {level.name}
                          {level.additionalPrice > 0 && (
                            <Tag
                              color='red'
                              className='sparkery-quote-calc-tag-inline'
                            >
                              +${level.additionalPrice}
                            </Tag>
                          )}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                )}
              </>
            )}

            {/* 平米计价特有选项 */}
            {currentWorkType?.pricingType === 'sqm' && (
              <>
                <Divider />

                {/* 面积输入 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.areaSqm', {
                      defaultValue: 'Area (Square Meters)',
                    })}
                  </Text>
                  <InputNumber
                    min={0}
                    value={sqmArea}
                    onChange={value => setSqmArea(value || 0)}
                    className='sparkery-quote-calc-input-block'
                    placeholder={t(
                      'sparkery.quoteCalculator.placeholders.areaSqm',
                      {
                        defaultValue: 'Enter area in square meters',
                      }
                    )}
                    addonAfter='sqm'
                  />
                </div>

                {/* 平米单价 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.pricePerSqm', {
                      defaultValue: 'Price per Square Meter',
                    })}
                  </Text>
                  <InputNumber
                    min={0}
                    value={sqmPrice}
                    onChange={value => setSqmPrice(value || 0)}
                    className='sparkery-quote-calc-input-block'
                    addonBefore='$'
                    addonAfter='/sqm'
                  />
                </div>

                {/* 系数输入 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.multiplier', {
                      defaultValue: 'Multiplier',
                    })}
                  </Text>
                  <InputNumber
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={sqmMultiplier}
                    onChange={value => setSqmMultiplier(value || 1)}
                    className='sparkery-quote-calc-input-block'
                    placeholder={t(
                      'sparkery.quoteCalculator.placeholders.multiplier',
                      {
                        defaultValue:
                          'e.g., 1.0 for standard, 1.5 for heavy soiling',
                      }
                    )}
                  />
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-text-xs'
                  >
                    {t('sparkery.quoteCalculator.hints.multiplier', {
                      defaultValue:
                        'Adjust for job complexity (e.g., 1.0 standard, 1.5 heavy soiling)',
                    })}
                  </Text>
                </div>

                {/* 人工调整 */}
                <div className='sparkery-quote-calc-section'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.fields.manualAdjustment', {
                      defaultValue: 'Manual Adjustment',
                    })}
                  </Text>
                  <InputNumber
                    min={-1000}
                    max={1000}
                    value={manualAdjustment}
                    onChange={value => setManualAdjustment(value || 0)}
                    className='sparkery-quote-calc-input-block'
                    addonBefore='$'
                    placeholder={t(
                      'sparkery.quoteCalculator.placeholders.manualAdjustment',
                      {
                        defaultValue: 'Additional adjustment amount',
                      }
                    )}
                  />
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-text-xs'
                  >
                    {t('sparkery.quoteCalculator.hints.manualAdjustment', {
                      defaultValue:
                        'Positive or negative adjustment to the calculated price',
                    })}
                  </Text>
                </div>
              </>
            )}

            {/* Service Package Pricing Options */}
            {currentWorkType?.pricingType === 'service' && (
              <>
                <Divider />

                <div className='sparkery-quote-calc-section'>
                  <Text strong className='sparkery-quote-calc-section-title'>
                    {t('sparkery.quoteCalculator.sections.serviceItemsList', {
                      defaultValue: 'Service Items List',
                    })}
                  </Text>
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-section-subtitle'
                  >
                    {t('sparkery.quoteCalculator.sections.serviceItemsHint', {
                      defaultValue:
                        'Add service items, each with independent title, description, amount, and unit',
                    })}
                  </Text>

                  {/* Service items list */}
                  {serviceItems.map((item, index) => (
                    <Card
                      key={item.id}
                      size='small'
                      title={t(
                        'sparkery.quoteCalculator.sections.serviceItemN',
                        {
                          defaultValue: 'Service Item {{index}}',
                          index: index + 1,
                        }
                      )}
                      extra={
                        <Button
                          type='text'
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeServiceItem(item.id)}
                        >
                          {t('sparkery.quoteCalculator.actions.delete', {
                            defaultValue: 'Delete',
                          })}
                        </Button>
                      }
                      className='sparkery-quote-calc-card-soft'
                    >
                      <Row gutter={12}>
                        <Col span={24} className='sparkery-quote-calc-gap-8'>
                          <Text>
                            {t('sparkery.quoteCalculator.fields.serviceTitle', {
                              defaultValue: 'Service Title',
                            })}
                          </Text>
                          <Input
                            placeholder={t(
                              'sparkery.quoteCalculator.placeholders.serviceTitle',
                              {
                                defaultValue: 'e.g., Regular Cleaning Service',
                              }
                            )}
                            value={item.title}
                            onChange={e =>
                              updateServiceItem(
                                item.id,
                                'title',
                                e.target.value
                              )
                            }
                          />
                        </Col>
                        <Col span={24} className='sparkery-quote-calc-gap-8'>
                          <Text>
                            {t(
                              'sparkery.quoteCalculator.fields.serviceDescription',
                              {
                                defaultValue: 'Service Description',
                              }
                            )}
                          </Text>
                          <Input.TextArea
                            rows={10}
                            placeholder={t(
                              'sparkery.quoteCalculator.placeholders.serviceDescription',
                              {
                                defaultValue:
                                  'Detailed description of service content...',
                              }
                            )}
                            value={item.description}
                            onChange={e =>
                              updateServiceItem(
                                item.id,
                                'description',
                                e.target.value
                              )
                            }
                          />
                        </Col>
                        <Col
                          xs={24}
                          sm={12}
                          className='sparkery-quote-calc-gap-8'
                        >
                          <Text>
                            {t('sparkery.quoteCalculator.fields.amountAud', {
                              defaultValue: 'Amount (AUD)',
                            })}
                          </Text>
                          <InputNumber
                            min={0}
                            className='sparkery-quote-calc-full-width'
                            addonBefore='$'
                            value={item.amount}
                            onChange={value =>
                              updateServiceItem(item.id, 'amount', value || 0)
                            }
                          />
                        </Col>
                        <Col
                          xs={24}
                          sm={12}
                          className='sparkery-quote-calc-gap-8'
                        >
                          <Text>
                            {t('sparkery.quoteCalculator.fields.unit', {
                              defaultValue: 'Unit',
                            })}
                          </Text>
                          <Select
                            value={normalizeServiceUnit(item.unit)}
                            onChange={value =>
                              updateServiceItem(item.id, 'unit', value)
                            }
                            className='sparkery-quote-calc-full-width'
                            options={unitOptions.map(u => ({
                              value: u.value,
                              label: t(u.i18nKey, {
                                defaultValue: u.defaultValue,
                              }),
                            }))}
                          />
                        </Col>
                      </Row>
                      <div className='sparkery-quote-calc-right-summary'>
                        <Text strong>
                          {t('sparkery.quoteCalculator.summary.subtotal', {
                            defaultValue: 'Subtotal',
                          })}
                          : ${item.amount.toFixed(2)}{' '}
                          {getServiceUnitLabel(item.unit, currentUiLanguage)}
                        </Text>
                      </div>
                    </Card>
                  ))}

                  {/* Add service item button */}
                  <Button
                    type='dashed'
                    onClick={addServiceItem}
                    block
                    icon={<PlusOutlined />}
                  >
                    {t('sparkery.quoteCalculator.actions.addServiceItem', {
                      defaultValue: 'Add Service Item',
                    })}
                  </Button>

                  {/* Service items total */}
                  {serviceItems.length > 0 && (
                    <div className='sparkery-quote-calc-service-total'>
                      <Row justify='space-between' align='middle'>
                        <Col>
                          <Text
                            strong
                            className='sparkery-quote-calc-service-total-label'
                          >
                            {t(
                              'sparkery.quoteCalculator.summary.serviceItemsTotal',
                              {
                                defaultValue: 'Service Items Total',
                              }
                            )}
                            :
                          </Text>
                        </Col>
                        <Col>
                          <Text
                            strong
                            className='sparkery-quote-calc-service-total-value'
                          >
                            $
                            {serviceItems
                              .reduce((sum, item) => sum + item.amount, 0)
                              .toFixed(2)}
                          </Text>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              </>
            )}

            <Divider />

            {/* 附加选项 - 重新整理布局 */}
            <div className='sparkery-quote-calc-section'>
              <Text strong className='sparkery-quote-calc-section-title'>
                {t('sparkery.quoteCalculator.sections.addOns', {
                  defaultValue: 'Additional Services',
                })}
              </Text>

              {/* 常规附加服务 - 简单勾选 */}
              <Card
                size='small'
                title={t('sparkery.quoteCalculator.sections.regularServices', {
                  defaultValue: 'Regular Services',
                })}
                extra={
                  <Tag color='green'>
                    {t('sparkery.quoteCalculator.tags.fixedPrice', {
                      defaultValue: 'Fixed Price',
                    })}
                  </Tag>
                }
                className='sparkery-quote-calc-card-soft sparkery-quote-calc-regular-addon-card'
              >
                <Checkbox.Group
                  value={selectedAddons}
                  onChange={values => setSelectedAddons(values as string[])}
                  className='sparkery-quote-calc-addon-grid'
                >
                  {config.addonOptions
                    .filter(a =>
                      ['garage', 'oven', 'fridge', 'rubbish_removal'].includes(
                        a.id
                      )
                    )
                    .map(addon => (
                      <Checkbox
                        key={addon.id}
                        value={addon.id}
                        className='sparkery-quote-calc-checkbox-tight'
                      >
                        <div className='sparkery-quote-calc-addon-option'>
                          <Text
                            className='sparkery-quote-calc-addon-option-title'
                            title={getAddonDisplayName(addon.id)}
                          >
                            {getAddonDisplayName(addon.id)}
                          </Text>
                          <div className='sparkery-quote-calc-addon-option-meta'>
                            <Tag
                              color='green'
                              className='sparkery-quote-calc-text-xxs'
                            >
                              +${addon.price}
                            </Tag>
                            <Text
                              type='secondary'
                              className='sparkery-quote-calc-addon-meta'
                            >
                              <ClockCircleOutlined /> {addon.hours}
                              {t('sparkery.quoteCalculator.units.hoursShort', {
                                defaultValue: 'hrs',
                              })}
                            </Text>
                          </div>
                        </div>
                      </Checkbox>
                    ))}
                </Checkbox.Group>
              </Card>

              {/* 特殊服务 - 闇€瑕佽緭鍏ユ暟閲?*/}
              <Card
                size='small'
                title={t('sparkery.quoteCalculator.sections.meteredServices', {
                  defaultValue: 'Metered Services',
                })}
                extra={
                  <Tag color='orange'>
                    {t('sparkery.quoteCalculator.tags.byQuantity', {
                      defaultValue: 'By Quantity',
                    })}
                  </Tag>
                }
                className='sparkery-quote-calc-card-soft sparkery-quote-calc-measurement-addon-card'
              >
                <div className='sparkery-quote-calc-measurement-grid'>
                  {/* 钀藉湴绐?鐜荤拑闂?*/}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('glass_door_window')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'glass_door_window']
                          : selectedAddons.filter(
                              id => id !== 'glass_door_window'
                            );
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('glass_door_window')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('glass_door_window')}/
                          {t('sparkery.quoteCalculator.units.panel', {
                            defaultValue: 'panel',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined />{' '}
                          {getAddonHours('glass_door_window')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('glass_door_window') && (
                      <InputNumber
                        min={1}
                        max={20}
                        value={glassDoorWindowCount}
                        onChange={value => setGlassDoorWindowCount(value || 1)}
                        className='sparkery-quote-calc-full-width'
                        addonAfter={t('sparkery.quoteCalculator.units.panel', {
                          defaultValue: 'panel',
                        })}
                      />
                    )}
                  </div>

                  {/* 墙面污渍 */}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('wall_stains')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'wall_stains']
                          : selectedAddons.filter(id => id !== 'wall_stains');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('wall_stains')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('wall_stains')}/
                          {t('sparkery.quoteCalculator.units.spot', {
                            defaultValue: 'spot',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined /> {getAddonHours('wall_stains')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('wall_stains') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={wallStainsCount}
                        onChange={value => setWallStainsCount(value || 1)}
                        className='sparkery-quote-calc-full-width'
                        addonAfter={t('sparkery.quoteCalculator.units.spot', {
                          defaultValue: 'spot',
                        })}
                      />
                    )}
                  </div>

                  {/* 空调滤网 */}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('ac_filter')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'ac_filter']
                          : selectedAddons.filter(id => id !== 'ac_filter');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('ac_filter')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('ac_filter')}/
                          {t('sparkery.quoteCalculator.units.unit', {
                            defaultValue: 'unit',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined /> {getAddonHours('ac_filter')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('ac_filter') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={acFilterCount}
                        onChange={value => setAcFilterCount(value || 1)}
                        className='sparkery-quote-calc-full-width'
                        addonAfter={t('sparkery.quoteCalculator.units.unit', {
                          defaultValue: 'unit',
                        })}
                      />
                    )}
                  </div>

                  {/* 鐧惧彾绐?*/}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('blinds')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'blinds']
                          : selectedAddons.filter(id => id !== 'blinds');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('blinds')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('blinds')}/
                          {t('sparkery.quoteCalculator.units.panel', {
                            defaultValue: 'panel',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined /> {getAddonHours('blinds')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('blinds') && (
                      <InputNumber
                        min={1}
                        max={20}
                        value={blindsCount}
                        onChange={value => setBlindsCount(value || 1)}
                        className='sparkery-quote-calc-full-width'
                        addonAfter={t('sparkery.quoteCalculator.units.panel', {
                          defaultValue: 'panel',
                        })}
                      />
                    )}
                  </div>

                  {/* 除霉 */}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('mold')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'mold']
                          : selectedAddons.filter(id => id !== 'mold');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('mold')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('mold')}/
                          {t('sparkery.quoteCalculator.units.spot', {
                            defaultValue: 'spot',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined /> {getAddonHours('mold')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('mold') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={moldCount}
                        onChange={value => setMoldCount(value || 1)}
                        className='sparkery-quote-calc-full-width'
                        addonAfter={t('sparkery.quoteCalculator.units.spot', {
                          defaultValue: 'spot',
                        })}
                      />
                    )}
                  </div>

                  {/* 特脏加费 */}
                  <div className='sparkery-quote-calc-addon-item'>
                    <Checkbox
                      checked={selectedAddons.includes('heavy_soiling')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'heavy_soiling']
                          : selectedAddons.filter(id => id !== 'heavy_soiling');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4} wrap>
                        <Text>{getAddonDisplayName('heavy_soiling')}</Text>
                        <Tag
                          color='cyan'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          +${getAddonPrice('heavy_soiling')}/
                          {t('sparkery.quoteCalculator.units.time', {
                            defaultValue: 'time',
                          })}
                        </Tag>
                        <Text
                          type='secondary'
                          className='sparkery-quote-calc-text-xxs'
                        >
                          <ClockCircleOutlined />{' '}
                          {getAddonHours('heavy_soiling')}
                          {t('sparkery.quoteCalculator.units.hoursShort', {
                            defaultValue: 'hrs',
                          })}
                        </Text>
                      </Space>
                    </Checkbox>
                  </div>
                </div>

                <Divider className='sparkery-quote-calc-divider-wide' />
                <div className='sparkery-quote-calc-manual-addon-header'>
                  <Text strong>
                    {t('sparkery.quoteCalculator.sections.manualAddon', {
                      defaultValue: 'Manual Add-on',
                    })}
                  </Text>
                  <Button
                    type='dashed'
                    size='small'
                    icon={<PlusOutlined />}
                    onClick={addManualMeasurementAddon}
                  >
                    {t('sparkery.quoteCalculator.actions.addItem', {
                      defaultValue: 'Add Item',
                    })}
                  </Button>
                </div>

                {manualMeasurementAddons.length === 0 ? (
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-text-xs'
                  >
                    {t('sparkery.quoteCalculator.empty.manualAddons', {
                      defaultValue:
                        'No manual add-ons yet. Add one when you need a custom charge.',
                    })}
                  </Text>
                ) : (
                  manualMeasurementAddons.map(item => {
                    const safeQuantity = Math.max(
                      1,
                      Number(item.quantity || 1)
                    );
                    const lineTotal =
                      Number(item.price || 0) *
                      (item.hasQuantity ? safeQuantity : 1);
                    return (
                      <Card
                        key={item.id}
                        size='small'
                        className='sparkery-quote-calc-manual-addon-card'
                      >
                        <Row gutter={[8, 8]} align='middle'>
                          <Col xs={24} md={8}>
                            <Input
                              placeholder={t(
                                'sparkery.quoteCalculator.placeholders.itemName',
                                {
                                  defaultValue: 'Item name',
                                }
                              )}
                              value={item.name}
                              onChange={e =>
                                updateManualMeasurementAddon(item.id, {
                                  name: e.target.value,
                                })
                              }
                            />
                          </Col>
                          <Col xs={12} md={5}>
                            <InputNumber
                              min={0}
                              value={item.price}
                              onChange={value =>
                                updateManualMeasurementAddon(item.id, {
                                  price: Number(value || 0),
                                })
                              }
                              className='sparkery-quote-calc-full-width'
                              prefix='$'
                            />
                          </Col>
                          <Col xs={12} md={5}>
                            <Checkbox
                              checked={item.hasQuantity}
                              onChange={e =>
                                updateManualMeasurementAddon(item.id, {
                                  hasQuantity: e.target.checked,
                                  quantity: e.target.checked
                                    ? Math.max(1, Number(item.quantity || 1))
                                    : 1,
                                })
                              }
                            >
                              {t('sparkery.quoteCalculator.fields.qty', {
                                defaultValue: 'Qty',
                              })}
                            </Checkbox>
                          </Col>
                          <Col xs={12} md={4}>
                            {item.hasQuantity ? (
                              <InputNumber
                                min={1}
                                value={safeQuantity}
                                onChange={value =>
                                  updateManualMeasurementAddon(item.id, {
                                    quantity: Math.max(1, Number(value || 1)),
                                  })
                                }
                                className='sparkery-quote-calc-full-width'
                                addonAfter='x'
                              />
                            ) : (
                              <Text type='secondary'>
                                {t('sparkery.quoteCalculator.labels.qtyOne', {
                                  defaultValue: 'x1',
                                })}
                              </Text>
                            )}
                          </Col>
                          <Col
                            xs={12}
                            md={2}
                            className='sparkery-quote-calc-text-right'
                          >
                            <Button
                              type='text'
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                removeManualMeasurementAddon(item.id)
                              }
                            />
                          </Col>
                        </Row>
                        <div className='sparkery-quote-calc-right-summary-sm'>
                          <Text type='secondary'>
                            {t('sparkery.quoteCalculator.labels.lineTotal', {
                              defaultValue: 'Line Total',
                            })}
                            : ${lineTotal.toFixed(2)}
                          </Text>
                        </div>
                      </Card>
                    );
                  })
                )}
              </Card>
            </div>

            {/* 折扣选项 */}
            <div className='sparkery-quote-calc-section'>
              <Checkbox
                checked={discountEnabled}
                onChange={e => setDiscountEnabled(e.target.checked)}
                className='sparkery-quote-calc-gap-8'
              >
                <Text strong>
                  {t('sparkery.quoteCalculator.fields.applyDiscount', {
                    defaultValue: 'Apply Discount',
                  })}
                </Text>
              </Checkbox>

              {discountEnabled && (
                <>
                  <Radio.Group
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    className='sparkery-quote-calc-radio-wrap'
                  >
                    <Radio value='new'>
                      {t('sparkery.quoteCalculator.discount.new', {
                        defaultValue: 'New Customer Discount',
                      })}
                    </Radio>
                    <Radio value='returning'>
                      {t('sparkery.quoteCalculator.discount.returning', {
                        defaultValue: 'Returning Customer Discount',
                      })}
                    </Radio>
                    <Radio value='referral'>
                      {t('sparkery.quoteCalculator.discount.referral', {
                        defaultValue: 'Referral Discount',
                      })}
                    </Radio>
                  </Radio.Group>
                  <div>
                    <Text>
                      {t('sparkery.quoteCalculator.fields.discountPercent', {
                        defaultValue: 'Discount % (e.g., 20 = 20% off):',
                      })}
                    </Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={value => setDiscountPercent(value || 0)}
                      className='sparkery-quote-calc-discount-input'
                      addonAfter='%'
                    />
                  </div>
                </>
              )}
            </div>

            {/* 备注 */}
            <div className='sparkery-quote-calc-section'>
              <Text strong>
                {t('sparkery.quoteCalculator.fields.notes', {
                  defaultValue: 'Notes',
                })}
              </Text>
              <Input.TextArea
                rows={9}
                placeholder={t('sparkery.quoteCalculator.placeholders.notes', {
                  defaultValue: 'Additional notes or special requirements...',
                })}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </Card>
        </Col>

        {/* 右侧：报价显示 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div className='sparkery-quote-calc-summary-title'>
                <span>
                  <DollarOutlined />{' '}
                  {t('sparkery.quoteCalculator.sections.quoteSummary', {
                    defaultValue: 'Quote Summary',
                  })}
                </span>
                <Button
                  type='link'
                  icon={<SettingOutlined />}
                  onClick={() => setConfigModalVisible(true)}
                >
                  {t('sparkery.quoteCalculator.actions.config', {
                    defaultValue: 'Config',
                  })}
                </Button>
              </div>
            }
            className='sparkery-quote-calc-sticky-card'
          >
            <div className='sparkery-quote-calc-section'>
              <Row justify='space-between'>
                <Text>
                  {t('sparkery.quoteCalculator.summary.basePrice', {
                    defaultValue: 'Base Price',
                  })}
                  :
                </Text>
                <Text>${quote.basePrice.toFixed(2)}</Text>
              </Row>

              {quote.adjustments > 0 && (
                <Row
                  justify='space-between'
                  className='sparkery-quote-calc-top-8'
                >
                  <Text type='secondary'>
                    {t('sparkery.quoteCalculator.summary.adjustments', {
                      defaultValue: 'Adjustments',
                    })}
                    :
                  </Text>
                  <Text type='secondary'>+${quote.adjustments.toFixed(2)}</Text>
                </Row>
              )}

              {quote.addons > 0 && (
                <Row
                  justify='space-between'
                  className='sparkery-quote-calc-top-8'
                >
                  <Text type='secondary'>
                    {t('sparkery.quoteCalculator.summary.addOns', {
                      defaultValue: 'Add-ons',
                    })}
                    :
                  </Text>
                  <Text type='secondary'>+${quote.addons.toFixed(2)}</Text>
                </Row>
              )}

              {quote.discount > 0 && (
                <Row
                  justify='space-between'
                  className='sparkery-quote-calc-top-8'
                >
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-discount-text'
                  >
                    {t('sparkery.quoteCalculator.summary.discount', {
                      defaultValue: 'Discount',
                    })}{' '}
                    ({quote.discountPercent}%):
                  </Text>
                  <Text
                    type='secondary'
                    className='sparkery-quote-calc-discount-text'
                  >
                    -${quote.discount.toFixed(2)}
                  </Text>
                </Row>
              )}

              <Divider className='sparkery-quote-calc-divider' />

              <Row
                justify='space-between'
                className='sparkery-quote-calc-top-8'
              >
                <Text strong>
                  {t('sparkery.quoteCalculator.summary.totalWorkHours', {
                    defaultValue: 'Total Work Hours',
                  })}
                  :
                </Text>
                <Text strong>
                  {quote.workHours.total.toFixed(1)}{' '}
                  {t('sparkery.quoteCalculator.units.hoursShort', {
                    defaultValue: 'hrs',
                  })}
                </Text>
              </Row>

              <Checkbox
                checked={includeGST}
                onChange={e => setIncludeGST(e.target.checked)}
                className='sparkery-quote-calc-gap-8'
              >
                <Text>
                  {t('sparkery.quoteCalculator.fields.includeGst', {
                    defaultValue: 'Include GST (10%)',
                  })}
                </Text>
              </Checkbox>

              {includeGST && (
                <Row
                  justify='space-between'
                  className='sparkery-quote-calc-top-8'
                >
                  <Text type='secondary'>
                    {t('sparkery.quoteCalculator.summary.gst', {
                      defaultValue: 'GST (10%)',
                    })}
                    :
                  </Text>
                  <Text type='secondary'>${quote.gst.toFixed(2)}</Text>
                </Row>
              )}

              <Divider className='sparkery-quote-calc-divider' />

              <Row justify='space-between'>
                <Title level={3} className='sparkery-quote-calc-total-title'>
                  {t('sparkery.quoteCalculator.summary.total', {
                    defaultValue: 'Total',
                  })}
                  :
                </Title>
                <Title level={3} className='sparkery-quote-calc-total-title'>
                  ${quote.total.toFixed(2)}
                </Title>
              </Row>
            </div>

            <div className='sparkery-quote-calc-gap-8'>
              <Text strong className='sparkery-quote-calc-label-compact'>
                {t('sparkery.quoteCalculator.fields.reportLanguage', {
                  defaultValue: 'Report Language',
                })}
              </Text>
              <Select
                value={pdfLanguage}
                onChange={value => setPdfLanguage(value)}
                className='sparkery-quote-calc-full-width sparkery-quote-calc-gap-8'
                options={[
                  {
                    value: 'en',
                    label: t('sparkery.quoteCalculator.language.english', {
                      defaultValue: 'English',
                    }),
                  },
                  {
                    value: 'cn',
                    label: t('sparkery.quoteCalculator.language.chinese', {
                      defaultValue: 'Chinese',
                    }),
                  },
                  {
                    value: 'both',
                    label: t('sparkery.quoteCalculator.language.bilingual', {
                      defaultValue: 'Bilingual',
                    }),
                  },
                ]}
              />
              <Button
                type='primary'
                size='large'
                block
                icon={<FileTextOutlined />}
                onClick={() => generateQuotePDF(pdfLanguage)}
              >
                {pdfLanguage === 'cn'
                  ? t('sparkery.quoteCalculator.actions.printQuoteCn', {
                      defaultValue: 'Print Quote (CN)',
                    })
                  : t('sparkery.quoteCalculator.actions.printQuote', {
                      defaultValue: 'Print Quote',
                    })}
              </Button>
            </div>

            <Divider />

            <div className='sparkery-quote-calc-gap-8'>
              <Text strong className='sparkery-quote-calc-label'>
                {t('sparkery.quoteCalculator.sections.customReport', {
                  defaultValue:
                    currentUiLanguage === 'cn' ? '自定义报告' : 'Custom Report',
                })}
              </Text>

              <Text type='secondary' className='sparkery-quote-calc-caption'>
                {t('sparkery.quoteCalculator.fields.reportType', {
                  defaultValue:
                    currentUiLanguage === 'cn' ? '报告类型' : 'Report Type',
                })}
              </Text>
              <Radio.Group
                value={customReportType}
                onChange={e =>
                  setCustomReportType(e.target.value as QuoteCustomDocumentType)
                }
                className='sparkery-quote-calc-radio-row'
              >
                <Radio.Button value='receipt'>
                  {t('sparkery.quoteCalculator.reportType.receiptOption', {
                    defaultValue:
                      currentUiLanguage === 'cn' ? '收据' : 'Receipt',
                  })}
                </Radio.Button>
                <Radio.Button value='quote'>
                  {t('sparkery.quoteCalculator.reportType.quoteOption', {
                    defaultValue:
                      currentUiLanguage === 'cn' ? '报价单' : 'Quote',
                  })}
                </Radio.Button>
              </Radio.Group>

              <>
                <Text type='secondary' className='sparkery-quote-calc-caption'>
                  {customReportType === 'quote'
                    ? t('sparkery.quoteCalculator.template.quote.quoteDate', {
                        defaultValue:
                          currentUiLanguage === 'cn'
                            ? '报价日期'
                            : 'Quote Date',
                      })
                    : t('sparkery.quoteCalculator.fields.invoiceDate', {
                        defaultValue:
                          currentUiLanguage === 'cn'
                            ? '收据日期'
                            : 'Receipt Date',
                      })}
                </Text>
                <DatePicker
                  value={invoiceDate ? dayjs(invoiceDate) : null}
                  onChange={(_, dateStr) =>
                    setInvoiceDate(
                      (typeof dateStr === 'string' ? dateStr : dateStr?.[0]) ||
                        dayjs().format('YYYY-MM-DD')
                    )
                  }
                  format='YYYY-MM-DD'
                  className='sparkery-quote-calc-full-width sparkery-quote-calc-gap-8'
                />
                <Text type='secondary' className='sparkery-quote-calc-caption'>
                  {customReportType === 'quote'
                    ? t('sparkery.quoteCalculator.template.quote.validUntil', {
                        defaultValue:
                          currentUiLanguage === 'cn'
                            ? '有效期至'
                            : 'Valid Until',
                      })
                    : t('sparkery.quoteCalculator.fields.dueDate', {
                        defaultValue:
                          currentUiLanguage === 'cn' ? '到期日' : 'Due Date',
                      })}
                </Text>
                <DatePicker
                  value={invoiceDueDate ? dayjs(invoiceDueDate) : null}
                  onChange={(_, dateStr) =>
                    setInvoiceDueDate(
                      (typeof dateStr === 'string' ? dateStr : dateStr?.[0]) ||
                        dayjs().add(14, 'day').format('YYYY-MM-DD')
                    )
                  }
                  format='YYYY-MM-DD'
                  className='sparkery-quote-calc-full-width sparkery-quote-calc-gap-8'
                />
                <Text
                  type='secondary'
                  className='sparkery-quote-calc-caption-lg'
                >
                  {customReportType === 'quote'
                    ? t('sparkery.quoteCalculator.fields.quoteHeader', {
                        defaultValue:
                          currentUiLanguage === 'cn'
                            ? '报价抬头'
                            : 'Quote Header',
                      })
                    : t('sparkery.quoteCalculator.fields.invoiceHeader', {
                        defaultValue:
                          currentUiLanguage === 'cn'
                            ? '收据抬头'
                            : 'Receipt Header',
                      })}
                </Text>
                <Radio.Group
                  value={invoiceHeaderMode}
                  onChange={e => setInvoiceHeaderMode(e.target.value)}
                  className='sparkery-quote-calc-radio-block'
                >
                  <Radio value='sparkery'>
                    {t('sparkery.quoteCalculator.invoiceHeader.sparkery', {
                      defaultValue:
                        currentUiLanguage === 'cn'
                          ? 'Sparkery（默认）'
                          : 'Sparkery (default)',
                    })}
                  </Radio>
                  <Radio value='custom'>
                    {t('sparkery.quoteCalculator.invoiceHeader.custom', {
                      defaultValue:
                        currentUiLanguage === 'cn' ? '自定义' : 'Custom',
                    })}
                  </Radio>
                </Radio.Group>
                {invoiceHeaderMode === 'custom' && (
                  <div className='sparkery-quote-calc-panel-soft'>
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.companyName',
                        {
                          defaultValue: 'Company / Name',
                        }
                      )}
                      value={customInvoiceHeader.companyName}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          companyName: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.abnOptional',
                        {
                          defaultValue: 'ABN (optional)',
                        }
                      )}
                      value={customInvoiceHeader.abn}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          abn: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.address',
                        {
                          defaultValue: 'Address',
                        }
                      )}
                      value={customInvoiceHeader.address}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          address: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.email',
                        {
                          defaultValue: 'Email',
                        }
                      )}
                      value={customInvoiceHeader.email}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          email: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.phone',
                        {
                          defaultValue: 'Phone',
                        }
                      )}
                      value={customInvoiceHeader.phone}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          phone: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.website',
                        {
                          defaultValue: 'Website',
                        }
                      )}
                      value={customInvoiceHeader.website}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          website: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Divider className='sparkery-quote-calc-divider-compact' />
                    <Text
                      type='secondary'
                      className='sparkery-quote-calc-caption-lg'
                    >
                      {t(
                        'sparkery.quoteCalculator.fields.bankTransferDetails',
                        {
                          defaultValue: 'Bank transfer details',
                        }
                      )}
                    </Text>
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.accountName',
                        {
                          defaultValue: 'Account Name',
                        }
                      )}
                      value={customInvoiceHeader.accountName}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          accountName: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.bsb',
                        {
                          defaultValue: 'BSB',
                        }
                      )}
                      value={customInvoiceHeader.bsb}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          bsb: e.target.value,
                        })
                      }
                      className='sparkery-quote-calc-gap-6'
                    />
                    <Input
                      placeholder={t(
                        'sparkery.quoteCalculator.placeholders.accountNumber',
                        {
                          defaultValue: 'Account Number',
                        }
                      )}
                      value={customInvoiceHeader.accountNumber}
                      onChange={e =>
                        setCustomInvoiceHeader({
                          ...customInvoiceHeader,
                          accountNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>

              <Button
                type='default'
                size='large'
                block
                icon={
                  customReportType === 'quote' ? (
                    <FileTextOutlined />
                  ) : (
                    <PrinterOutlined />
                  )
                }
                onClick={() =>
                  generateInvoicePDF(pdfLanguage, customReportType)
                }
                className='sparkery-quote-calc-top-8'
              >
                {customReportType === 'quote'
                  ? pdfLanguage === 'cn'
                    ? t('sparkery.quoteCalculator.actions.printQuoteCn', {
                        defaultValue: 'Print Quote (CN)',
                      })
                    : t('sparkery.quoteCalculator.actions.printQuote', {
                        defaultValue: 'Print Quote',
                      })
                  : pdfLanguage === 'cn'
                    ? t('sparkery.quoteCalculator.actions.printReceiptCn', {
                        defaultValue: '打印收据',
                      })
                    : t('sparkery.quoteCalculator.actions.printReceipt', {
                        defaultValue: 'Print Receipt',
                      })}
              </Button>
            </div>

            <Button
              size='large'
              block
              icon={<HomeOutlined />}
              onClick={() => {
                setSelectedWorkType('airbnb');
                setSelectedRoomType('studio');
                setSelectedPropertyType('apartment');
                setSelectedHouseLevel('single');
                setSelectedAddons([]);
                setIncludeSteamCarpet(false);
                setIncludeGST(true);
                setCustomerName('');
                setCustomerAddress('');
                setNotes('');
                setExtraBedrooms(0);
                setExtraBathrooms(0);
                setGlassDoorWindowCount(1);
                setWallStainsCount(1);
                setAcFilterCount(1);
                setBlindsCount(1);
                setMoldCount(1);
                setSteamCarpetRoomCount(0);
                setSqmArea(0);
                setSqmPrice(5);
                setSqmMultiplier(1.0);
                setManualAdjustment(0);
                setCustomBasePrice(0);
                setServiceItems([]);
                setManualMeasurementAddons([]);
                setInvoiceHeaderMode('sparkery');
                setCustomReportType('receipt');
                setCustomInvoiceHeader({
                  companyName: '',
                  abn: '',
                  address: '',
                  email: '',
                  phone: '',
                  website: '',
                  accountName: '',
                  bsb: '',
                  accountNumber: '',
                });
                setInvoiceDate(dayjs().format('YYYY-MM-DD'));
                setInvoiceDueDate(dayjs().add(14, 'day').format('YYYY-MM-DD'));
              }}
            >
              {t('sparkery.quoteCalculator.actions.resetForm', {
                defaultValue: 'Reset Form',
              })}
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 实时HTML预览 */}
      <div className='sparkery-quote-calc-preview-section'>
        <Title level={4}>
          <EyeOutlined />{' '}
          {t('sparkery.quoteCalculator.sections.livePreview', {
            defaultValue: 'Live Preview',
          })}
        </Title>
        <div
          dangerouslySetInnerHTML={{ __html: livePreviewHTML }}
          className='sparkery-quote-calc-preview-paper'
        />
      </div>

      {/* 配置管理弹窗 */}
      <Modal
        title={t('sparkery.quoteCalculator.sections.quoteConfig', {
          defaultValue: 'Quote Configuration',
        })}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width='min(800px, 96vw)'
        className='sparkery-quote-calc-config-modal'
      >
        <Form
          form={form}
          onFinish={values => {
            setConfig({ ...config, ...values });
            message.success(
              t('sparkery.quoteCalculator.messages.configSaved', {
                defaultValue: 'Configuration saved successfully!',
              })
            );
            setConfigModalVisible(false);
          }}
          layout='vertical'
        >
          <Title level={4}>
            {t('sparkery.quoteCalculator.modal.roomTypeBasePricesHours', {
              defaultValue: 'Room Type Base Prices & Hours',
            })}
          </Title>
          <Form.List name='roomTypes'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={8}
                    className='sparkery-quote-calc-config-row'
                  >
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.roomType',
                          {
                            defaultValue: 'Room Type',
                          }
                        )}
                      >
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'airbnb']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.airbnbPrice',
                          {
                            defaultValue: 'Airbnb $',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'airbnb']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.hoursShort',
                          {
                            defaultValue: 'Hrs',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'bond']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.bondPrice',
                          {
                            defaultValue: 'Bond $',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'bond']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.hoursShort',
                          {
                            defaultValue: 'Hrs',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'regular']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.regularPrice',
                          {
                            defaultValue: 'Regular $',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'regular']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.hoursShort',
                          {
                            defaultValue: 'Hrs',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Divider />

          <Title level={4}>
            {t('sparkery.quoteCalculator.modal.additionalServicesPriceHours', {
              defaultValue: 'Additional Services (Price & Hours)',
            })}
          </Title>
          <Form.List name='addonOptions'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={12}
                    className='sparkery-quote-calc-gap-8'
                  >
                    <Col span={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'nameCN']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.nameCn',
                          {
                            defaultValue: 'Name (CN)',
                          }
                        )}
                      >
                        <Input size='small' />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.nameEn',
                          {
                            defaultValue: 'Name (EN)',
                          }
                        )}
                      >
                        <Input size='small' />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'price']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.price',
                          {
                            defaultValue: 'Price $',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'hours']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.hours',
                          {
                            defaultValue: 'Hours',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          step={0.25}
                          className='sparkery-quote-calc-full-width'
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        label={t('sparkery.quoteCalculator.modal.fields.type', {
                          defaultValue: 'Type',
                        })}
                      >
                        <Select size='small'>
                          <Select.Option value='fixed'>
                            {t('sparkery.quoteCalculator.modal.option.fixed', {
                              defaultValue: 'Fixed ($)',
                            })}
                          </Select.Option>
                          <Select.Option value='percentage'>
                            {t(
                              'sparkery.quoteCalculator.modal.option.percentage',
                              {
                                defaultValue: 'Percentage (%)',
                              }
                            )}
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Divider />

          <Title level={4}>
            {t('sparkery.quoteCalculator.modal.propertyTypeConfig', {
              defaultValue: 'Property Type Configuration',
            })}
          </Title>
          <Form.List name='propertyTypes'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={16}
                    className='sparkery-quote-calc-gap-8'
                  >
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.propertyType',
                          {
                            defaultValue: 'Property Type',
                          }
                        )}
                      >
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'additionalPrice']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.additionalPrice',
                          {
                            defaultValue: 'Add. Price ($)',
                          }
                        )}
                        tooltip={t(
                          'sparkery.quoteCalculator.modal.tooltips.additionalPrice',
                          {
                            defaultValue:
                              'Additional price for non-bond cleaning types (Airbnb, Regular)',
                          }
                        )}
                      >
                        <InputNumber
                          min={0}
                          className='sparkery-quote-calc-full-width'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'bondMultiplier']}
                        label={t(
                          'sparkery.quoteCalculator.modal.fields.bondMultiplier',
                          {
                            defaultValue: 'Bond Multiplier',
                          }
                        )}
                        tooltip={t(
                          'sparkery.quoteCalculator.modal.tooltips.bondMultiplier',
                          {
                            defaultValue:
                              'Percentage multiplier for Bond cleaning only (e.g., 1.5 = +50%)',
                          }
                        )}
                      >
                        <InputNumber
                          min={1}
                          max={3}
                          step={0.1}
                          className='sparkery-quote-calc-full-width'
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Divider />

          <Title level={4}>
            {t('sparkery.quoteCalculator.modal.extraRoomPrices', {
              defaultValue: 'Extra Room Prices',
            })}
          </Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='extraBedroomPrice'
                label={t(
                  'sparkery.quoteCalculator.modal.fields.extraBedroomPrice',
                  {
                    defaultValue: 'Extra Bedroom Price ($)',
                  }
                )}
              >
                <InputNumber
                  min={0}
                  className='sparkery-quote-calc-full-width'
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='extraBathroomPrice'
                label={t(
                  'sparkery.quoteCalculator.modal.fields.extraBathroomPrice',
                  {
                    defaultValue: 'Extra Bathroom Price ($)',
                  }
                )}
              >
                <InputNumber
                  min={0}
                  className='sparkery-quote-calc-full-width'
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>
            {t('sparkery.quoteCalculator.modal.sqmDefaultPrices', {
              defaultValue: 'SQM Pricing Default Prices',
            })}
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'office']}
                label={t('sparkery.quoteCalculator.modal.fields.officePerSqm', {
                  defaultValue: 'Office ($/sqm)',
                })}
              >
                <InputNumber
                  min={0}
                  className='sparkery-quote-calc-full-width'
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'construction']}
                label={t(
                  'sparkery.quoteCalculator.modal.fields.constructionPerSqm',
                  {
                    defaultValue: 'Construction ($/sqm)',
                  }
                )}
              >
                <InputNumber
                  min={0}
                  className='sparkery-quote-calc-full-width'
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'commercial']}
                label={t(
                  'sparkery.quoteCalculator.modal.fields.commercialPerSqm',
                  {
                    defaultValue: 'Commercial ($/sqm)',
                  }
                )}
              >
                <InputNumber
                  min={0}
                  className='sparkery-quote-calc-full-width'
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className='sparkery-quote-calc-submit-item'>
            <Button type='primary' htmlType='submit' block size='large'>
              {t('sparkery.quoteCalculator.actions.saveConfiguration', {
                defaultValue: 'Save Configuration',
              })}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BrisbaneQuoteCalculator;
