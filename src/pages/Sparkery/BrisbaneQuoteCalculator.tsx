/**
 * Brisbane Cleaning Quote Calculator
 * 布里斯班清洁报价计算器 - 针对多种清洁类型的报价生成器
 */

import React, { useState, useEffect } from 'react';
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
  Alert,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import {
  CalculatorOutlined,
  DollarOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  FileTextOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// 工作类型
interface WorkType {
  id: string;
  name: string;
  nameCN: string;
  isResidential: boolean;
  pricingType: 'room' | 'sqm'; // room = 房型计价, sqm = 平米计价
}

// 房型
interface RoomType {
  id: string;
  name: string;
  prices: {
    airbnb: number;
    bond: number;
    regular: number;
  };
  workHours: {
    airbnb: number;
    bond: number;
    regular: number;
  };
  steamCarpetPrice: number; // 蒸洗地毯价格
  steamCarpetHours: number; // 蒸洗地毯工时
}

// 房产类型
interface PropertyType {
  id: string;
  name: string;
  additionalPrice: number; // 绝对值金额加成
  bondMultiplier: number; // Bond清洁的百分比系数（仅在bond清洁时使用）
}

// House层数
interface HouseLevel {
  id: string;
  name: string;
  additionalPrice: number;
}

// 附加选项
interface AddonOption {
  id: string;
  name: string;
  nameCN: string;
  price: number;
  hours: number; // 工时
  type: 'fixed' | 'percentage'; // fixed = 固定金额, percentage = 基础价的百分比
}

// 报价配置（可后台修改）
interface QuoteConfig {
  workTypes: WorkType[];
  roomTypes: RoomType[];
  propertyTypes: PropertyType[];
  houseLevels: HouseLevel[];
  addonOptions: AddonOption[];
  gstRate: number;
  extraRoomPrices: {
    extraBedroom: number; // 额外bedroom单价
    extraBathroom: number; // 额外bathroom单价
  };
  sqmDefaultPrices: {
    office: number;
    construction: number;
    commercial: number;
  }; // 平米计价默认单价
  standardInclusions: {
    kitchen: { en: string; cn: string };
    bathroom: { en: string; cn: string };
    living: { en: string; cn: string };
  };
  airbnbInclusions: {
    kitchen: { en: string; cn: string };
    bathroom: { en: string; cn: string };
    living: { en: string; cn: string };
    bedroom: { en: string; cn: string };
    floor: { en: string; cn: string };
  };
  airbnbNotes: {
    linen: { en: string; cn: string };
    consumables: { en: string; cn: string };
  };
}

// 默认配置
const DEFAULT_CONFIG: QuoteConfig = {
  workTypes: [
    {
      id: 'airbnb',
      name: 'Airbnb Cleaning',
      nameCN: 'Airbnb清洁',
      isResidential: true,
      pricingType: 'room',
    },
    {
      id: 'bond',
      name: 'Bond Cleaning',
      nameCN: 'Bond清洁',
      isResidential: true,
      pricingType: 'room',
    },
    {
      id: 'regular',
      name: 'Regular Cleaning',
      nameCN: '日常清洁',
      isResidential: true,
      pricingType: 'room',
    },
    {
      id: 'office',
      name: 'Office Cleaning',
      nameCN: '办公室清洁',
      isResidential: false,
      pricingType: 'sqm',
    },
    {
      id: 'construction',
      name: 'Construction Cleaning',
      nameCN: '开荒清洁',
      isResidential: false,
      pricingType: 'sqm',
    },
    {
      id: 'commercial',
      name: 'Other Commercial',
      nameCN: '其他商业清洁',
      isResidential: false,
      pricingType: 'sqm',
    },
  ],
  roomTypes: [
    {
      id: 'studio',
      name: 'Studio',
      prices: { airbnb: 100, bond: 140, regular: 120 },
      workHours: { airbnb: 2, bond: 4, regular: 2.5 },
      steamCarpetPrice: 150,
      steamCarpetHours: 1, // 1 bedroom equivalent
    },
    {
      id: '1_bed',
      name: '1 Bed (1Bath)',
      prices: { airbnb: 130, bond: 180, regular: 150 },
      workHours: { airbnb: 2.5, bond: 4.5, regular: 3 },
      steamCarpetPrice: 150,
      steamCarpetHours: 1, // 1 bedroom
    },
    {
      id: '2_bed_1b',
      name: '2 Bed (1Bath)',
      prices: { airbnb: 160, bond: 220, regular: 190 },
      workHours: { airbnb: 3, bond: 5.5, regular: 3.5 },
      steamCarpetPrice: 150,
      steamCarpetHours: 2, // 2 bedrooms
    },
    {
      id: '2_bed_2b',
      name: '2 Bed (2Bath)',
      prices: { airbnb: 180, bond: 280, regular: 200 },
      workHours: { airbnb: 3.5, bond: 6.5, regular: 4 },
      steamCarpetPrice: 150,
      steamCarpetHours: 2, // 2 bedrooms
    },
    {
      id: '3_bed_1b',
      name: '3 Bed (1Bath)',
      prices: { airbnb: 220, bond: 300, regular: 250 },
      workHours: { airbnb: 4, bond: 7.5, regular: 4.5 },
      steamCarpetPrice: 200,
      steamCarpetHours: 3, // 3 bedrooms
    },
    {
      id: '3_bed_2b',
      name: '3 Bed (2Bath)',
      prices: { airbnb: 250, bond: 350, regular: 280 },
      workHours: { airbnb: 4.5, bond: 9, regular: 5 },
      steamCarpetPrice: 200,
      steamCarpetHours: 3, // 3 bedrooms
    },
    {
      id: '4_bed_2b',
      name: '4 Bed (2Bath)',
      prices: { airbnb: 320, bond: 450, regular: 350 },
      workHours: { airbnb: 5, bond: 11, regular: 5.5 },
      steamCarpetPrice: 260,
      steamCarpetHours: 4, // 4 bedrooms
    },
  ],
  propertyTypes: [
    {
      id: 'apartment',
      name: 'Apartment',
      additionalPrice: 0,
      bondMultiplier: 1.0,
    },
    {
      id: 'townhouse',
      name: 'Townhouse',
      additionalPrice: 0,
      bondMultiplier: 1.2,
    },
    { id: 'house', name: 'House', additionalPrice: 0, bondMultiplier: 1.3 },
  ],
  houseLevels: [
    { id: 'single', name: 'Single Storey', additionalPrice: 0 },
    { id: 'double', name: 'Double Storey', additionalPrice: 50 },
  ],
  addonOptions: [
    {
      id: 'garage',
      name: 'Garage / Balcony / Yard',
      nameCN: '车库/阳台/院子',
      price: 260,
      hours: 4,
      type: 'fixed',
    },
    {
      id: 'glass_door_window',
      name: 'Glass Door/Window (per panel)',
      nameCN: '落地窗/玻璃门（每扇）',
      price: 15,
      hours: 0.2,
      type: 'fixed',
    },
    {
      id: 'oven',
      name: 'Oven Cleaning',
      nameCN: '烤箱清洁',
      price: 80,
      hours: 1,
      type: 'fixed',
    },
    {
      id: 'fridge',
      name: 'Fridge Cleaning',
      nameCN: '冰箱清洁',
      price: 30,
      hours: 0.5,
      type: 'fixed',
    },
    {
      id: 'wall_stains',
      name: 'Wall Stain Removal',
      nameCN: '墙面污渍清洁',
      price: 50,
      hours: 1,
      type: 'fixed',
    },
    {
      id: 'ac_filter',
      name: 'AC Filter Cleaning',
      nameCN: '空调滤网清洁',
      price: 15,
      hours: 0.2,
      type: 'fixed',
    },
    {
      id: 'blinds',
      name: 'Blinds Cleaning',
      nameCN: '百叶窗清洁',
      price: 20,
      hours: 0.3,
      type: 'fixed',
    },
    {
      id: 'mold',
      name: 'Mold Removal',
      nameCN: '除霉',
      price: 50,
      hours: 1,
      type: 'fixed',
    },
    {
      id: 'heavy_soiling',
      name: 'Heavy Soiling Surcharge',
      nameCN: '特脏加费',
      price: 50,
      hours: 1,
      type: 'fixed',
    },
    {
      id: 'rubbish_removal',
      name: 'Rubbish Removal',
      nameCN: '垃圾清理',
      price: 30,
      hours: 0.5,
      type: 'fixed',
    },
  ],
  gstRate: 0.1, // 10% GST
  extraRoomPrices: {
    extraBedroom: 50,
    extraBathroom: 50,
  },
  sqmDefaultPrices: {
    office: 5,
    construction: 6,
    commercial: 5,
  },
  standardInclusions: {
    kitchen: {
      en: 'Floor, countertops, cabinets inside and out, vacuuming, sink, stove, range hood',
      cn: '地面，柜台，橱柜里外，吸尘，水池，炉灶，抽油烟机',
    },
    bathroom: {
      en: 'Toilet, vanity, vacuuming, shower floor, walls, glass, mirrors, bathtub',
      cn: '马桶，洗漱台，吸尘，淋浴间地面，墙面，玻璃，镜子，浴缸',
    },
    living: {
      en: 'Vacuuming, skirting boards, power switches, window sills, doors, wardrobes inside and out, wardrobe mirrors',
      cn: '吸尘，贴脚线，电源开关，窗台，门，衣柜内外，衣柜镜子',
    },
  },
  airbnbInclusions: {
    kitchen: {
      en: 'Countertops, stove and exposed areas cleaned, obvious grease and dirt removed, overall clean, tidy and odor-free',
      cn: '台面、灶台及外露区域清洁，去除明显油渍与污垢，整体保持干净、整洁、无异味',
    },
    bathroom: {
      en: 'Shower, toilet, sink fully cleaned, water stains, soap scum and visible stains removed, floor clean, no obvious hair or standing water',
      cn: '淋浴房、马桶、洗手池全面清洁，去除水渍、皂垢与可见污渍，地面清洁，无明显毛发与积水',
    },
    living: {
      en: 'Surface dusting, tidying and arranging, space kept neat and orderly',
      cn: '表面除尘，整理摆放，保持空间整洁有序',
    },
    bedroom: {
      en: 'Bed linen changed, bed made, room kept tidy',
      cn: '更换床品，床铺整理，房间整体整洁',
    },
    floor: {
      en: 'Whole house vacuumed or mopped, floors clean, no obvious stains or hair',
      cn: '全屋吸尘或拖地，地面干净，无明显污渍与毛发',
    },
  },
  airbnbNotes: {
    linen: {
      en: 'Full set of bed linen changed and washed every cleaning, including sheets, duvet cover, pillowcases (2), bath towels (2), hand towels (2), bath mat and kitchen towel',
      cn: '每次清洁均更换并清洗全套床品，包含床单、被套、枕套（2个）、浴巾（2条）、毛巾（2条）、浴室地垫及厨房巾',
    },
    consumables: {
      en: 'Consumables checked and replenished after each cleaning, including shampoo, shower gel, conditioner, toilet paper, garbage bags, dishwasher tablets/detergent, washing powder or liquid',
      cn: '每次清洁后检查并补充消耗品，包含洗发水、沐浴露、护发素、卫生纸、垃圾袋、洗碗块/洗洁精、洗衣粉或洗衣液',
    },
  },
};

const BrisbaneQuoteCalculator: React.FC = () => {
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
      // 确保 roomTypes 有 steamCarpetPrice 字段
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
  const [glassDoorWindowCount, setGlassDoorWindowCount] = useState<number>(0);
  const [wallStainsCount, setWallStainsCount] = useState<number>(0);
  const [acFilterCount, setAcFilterCount] = useState<number>(0);
  const [blindsCount, setBlindsCount] = useState<number>(0);
  const [moldCount, setMoldCount] = useState<number>(0);
  const [steamCarpetRoomCount, setSteamCarpetRoomCount] = useState<number>(0);
  const [customRoomType, setCustomRoomType] = useState<string>('');
  const [includeGST, setIncludeGST] = useState<boolean>(true);
  const [pdfLanguage, setPdfLanguage] = useState<'en' | 'cn' | 'both'>('en');
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

  // 配置管理弹窗
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [form] = Form.useForm();

  const currentWorkType = config.workTypes.find(
    (w: { id: string }) => w.id === selectedWorkType
  );

  const generateQuotePDF = (language: 'en' | 'cn' | 'both') => {
    message.info(
      language === 'cn'
        ? 'PDF 生成功能开发中...'
        : 'PDF generation coming soon...'
    );
  };

  // 保存配置到localStorage
  useEffect(() => {
    localStorage.setItem('brisbane-quote-config', JSON.stringify(config));
  }, [config]);

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

    if (!workType)
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

    let basePrice = 0;
    let adjustments = 0;
    let addonTotal = 0;

    if (workType.pricingType === 'sqm') {
      // 平米计价
      basePrice = sqmArea * sqmPrice * sqmMultiplier;
      adjustments = manualAdjustment;
    } else {
      // 房型计价（原有逻辑）
      if (!roomType) {
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
        // 自定义房型需要手动输入，这里使用默认价格
        basePrice = 500; // 默认价格，用户可通过额外调整修改
      } else {
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
      if (workType.isResidential) {
        // Bond清洁：所有房产类型都使用bondMultiplier系数
        // 地毯勾选后加到基础价，然后应用系数
        if (selectedWorkType === 'bond' && propertyType) {
          // 地毯勾选后加到基础价
          if (includeSteamCarpet && roomType) {
            const quantity =
              steamCarpetRoomCount > 0 ? steamCarpetRoomCount : 1;
            basePrice += roomType.steamCarpetPrice * quantity;
          }
          // Townhouse/House应用系数
          if (selectedPropertyType !== 'apartment') {
            basePrice = basePrice * propertyType.bondMultiplier;
          }
        } else if (propertyType) {
          // 非Bond清洁使用绝对值加成
          adjustments += propertyType.additionalPrice;
        }

        // House层数加成（仅House类型）
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

    // 附加选项
    let totalAddonHours = 0;
    const addonHoursDetail: Array<{
      name: string;
      nameCN: string;
      hours: number;
      quantity: number;
    }> = [];
    let rows = '';
    selectedAddons.forEach(addonId => {
      const addon = config.addonOptions.find(a => a.id === addonId);
      if (addon) {
        let quantity = 1;
        let quantityText = '';
        if (addon.id === 'glass_door_window') {
          quantity = glassDoorWindowCount;
          quantityText = ` x ${quantity}`;
        } else if (addon.id === 'wall_stains') {
          quantity = wallStainsCount;
          quantityText = ` x ${quantity}`;
        } else if (addon.id === 'ac_filter') {
          quantity = acFilterCount;
          quantityText = ` x ${quantity}`;
        } else if (addon.id === 'blinds') {
          quantity = blindsCount;
          quantityText = ` x ${quantity}`;
        } else if (addon.id === 'mold') {
          quantity = moldCount;
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
        if (addon.type === 'percentage') {
          addonTotal += subtotalBeforeAddons * addon.price;
        } else {
          addonTotal += addon.price * quantity;
        }

        // 生成HTML行 - 使用占位符，稍后根据语言替换
        rows += `
          <tr>
            <td class="col-desc">
              <span class="item-name">${addon.name}${quantityText}</span>
              <span class="item-detail">${addon.nameCN}</span>
            </td>
            <td class="col-type">__ADDON_TYPE__</td>
            <td class="col-hours">${hours.toFixed(1)} hrs</td>
            <td class="col-amount">$${(addon.price * quantity).toFixed(2)}</td>
          </tr>
        `;
      }
    });

    let subtotal = subtotalBeforeAddons + addonTotal;

    // 计算总工时
    let baseHours = 0;
    if (roomType) {
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
    // 地毯工时 - 勾选地毯时计算
    const steamCarpetHours =
      includeSteamCarpet && roomType
        ? roomType.steamCarpetHours *
          (steamCarpetRoomCount > 0 ? steamCarpetRoomCount : 1)
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
    };
  };

  const quote = calculateQuote();

  // 生成HTML内容的辅助函数
  const generateQuoteHTML = (lang: 'en' | 'cn') => {
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
      selectedRoomType === 'custom' ? customRoomType : roomTypeObj?.name || '';
    const roomTypeMatch = roomTypeName.match(/(\d+)\s*Bed.*(\d+)\s*Bath/);
    const shortRoomType = roomTypeMatch
      ? `${roomTypeMatch[1]}B${roomTypeMatch[2]}B`
      : roomTypeName;

    const propertyTypeName =
      config.propertyTypes.find(p => p.id === selectedPropertyType)?.name || '';

    return `<!DOCTYPE html>
<html lang="${lang === 'cn' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <title>${lang === 'cn' ? 'Sparkery 报价单' : 'Sparkery Quote'}</title>
    <style>
        /* 页面基础设置：A4 尺寸 */
        @page {
            size: A4;
            margin: 0;
        }
        body {
            font-family: ${lang === 'cn' ? "'Microsoft YaHei', 'PingFang SC', " : ''}'Segoe UI', Tahoma, Geneva, Verdana, sans-serif';
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
        .item-name { font-weight: 600; display: block; }
        .item-detail { font-size: 12px; color: #888; margin-top: 2px; }
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
            <h3>${lang === 'cn' ? '报价给' : 'Quote For'}</h3>
            <div class="client-name">${customerName || (lang === 'cn' ? '客户姓名' : 'Customer Name')}</div>
            <div class="client-address">${customerAddress || (lang === 'cn' ? '客户地址' : 'Address')}</div>
        </div>
        <div class="quote-meta-box">
            <div class="quote-title">${lang === 'cn' ? '报价单' : 'QUOTE'}</div>
            <div class="meta-row">
                <span class="meta-label">${lang === 'cn' ? '报价日期:' : 'Quote Date:'}</span>
                <span>${currentDate}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${lang === 'cn' ? '有效期至:' : 'Valid Until:'}</span>
                <span>${validDate}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">${lang === 'cn' ? '报价编号:' : 'Reference:'}</span>
                <span>#${quoteId}</span>
            </div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>${lang === 'cn' ? '服务项目' : 'Description'}</th>
                <th>${lang === 'cn' ? '类型' : 'Type'}</th>
                <th style="text-align: center;">${lang === 'cn' ? '工时' : 'Hours'}</th>
                <th style="text-align: right;">${lang === 'cn' ? '金额 (澳元)' : 'Amount (AUD)'}</th>
            </tr>
        </thead>
        <tbody>
            <!-- 基础服务 -->
            <tr>
                <td class="col-desc">
                    <span class="item-name">${lang === 'cn' ? '退租清洁服务 (End of Lease)' : 'Bond Cleaning Service (End of Lease)'}</span>
                    <span class="item-detail">
                        ${lang === 'cn' ? '物业类型:' : 'Property Type:'} ${propertyTypeName} (${shortRoomType})<br>
                        ${lang === 'cn' ? '包含: 厨房、浴室、客厅、内部窗户及地板清洁。' : 'Includes: Kitchen, Bathrooms, Living Areas, Windows (Internal), Floors.'}
                    </span>
                </td>
                <td class="col-type">${lang === 'cn' ? '基础服务' : 'Base Service'}</td>
                <td class="col-hours">${quote.workHours.base.toFixed(1)} hrs</td>
                <td class="col-amount">$${quote.basePrice.toFixed(2)}</td>
            </tr>

            <!-- 地毯清洁 -->
            ${
              quote.workHours.steamCarpet > 0
                ? `
            <tr>
                <td class="col-desc">
                    <span class="item-name">${lang === 'cn' ? '地毯蒸汽清洁' : 'Carpet Steam Cleaning'}</span>
                    <span class="item-detail">${lang === 'cn' ? '专业热水抽取清洁所有地毯区域' : 'Professional hot water extraction for all carpeted areas'}</span>
                </td>
                <td class="col-type">${lang === 'cn' ? '附加服务' : 'Add-on'}</td>
                <td class="col-hours">${quote.workHours.steamCarpet.toFixed(1)} hrs</td>
                <td class="col-amount">(Included)</td>
            </tr>`
                : ''
            }

            <!-- 额外房间调整 -->
            ${
              quote.adjustments > 0
                ? `
            <tr>
                <td class="col-desc">
                    <span class="item-name">${lang === 'cn' ? '额外房间调整' : 'Extra Rooms Adjustment'}</span>
                </td>
                <td class="col-type">${lang === 'cn' ? '调整项' : 'Adjustment'}</td>
                <td class="col-hours">-</td>
                <td class="col-amount">$${quote.adjustments.toFixed(2)}</td>
            </tr>`
                : ''
            }

            <!-- 附加服务 -->
            ${(quote.htmlRows || '').replace(/__ADDON_TYPE__/g, lang === 'cn' ? '附加服务' : 'Add-on')}
        </tbody>
    </table>
    <div class="total-section">
        <div class="total-row">
            <span>${lang === 'cn' ? '小计' : 'Subtotal'}</span>
            <span>$${(quote.subtotal + quote.discount).toFixed(2)}</span>
        </div>
        ${
          quote.discount > 0
            ? `
        <div class="total-row" style="color: #005901;">
            <span>${
              quote.discountType === 'new'
                ? lang === 'cn'
                  ? '新客优惠'
                  : 'New Customer Discount'
                : quote.discountType === 'returning'
                  ? lang === 'cn'
                    ? '回头客优惠'
                    : 'Returning Customer Discount'
                  : lang === 'cn'
                    ? '介绍优惠'
                    : 'Referral Discount'
            } (${quote.discountPercent}%)</span>
            <span>-$${quote.discount.toFixed(2)}</span>
        </div>`
            : ''
        }
        ${
          includeGST
            ? `
        <div class="total-row" style="color: #666;">
            <span>${lang === 'cn' ? '消费税 (10%)' : 'GST (10%)'}</span>
            <span>$${quote.gst.toFixed(2)}</span>
        </div>`
            : ''
        }
        <div class="total-row" style="color: #005901; font-weight: 600;">
            <span><ClockCircleOutlined style="margin-right: 4px;" /> ${lang === 'cn' ? '总工时' : 'Total Hours'}</span>
            <span>${quote.workHours.total.toFixed(1)} hrs</span>
        </div>
        <div class="total-row grand-total">
            <span>${lang === 'cn' ? '合计' : 'Total'}</span>
            <span>$${quote.total.toFixed(2)}</span>
        </div>
    </div>

    <!-- Footer Notes -->
    <div class="footer-note">
        <strong>${lang === 'cn' ? '条款与条件:' : 'Terms & Conditions:'}</strong>
        <ul style="margin: 5px 0; padding-left: 20px;">
            <li><strong>${lang === 'cn' ? '押金保障承诺:' : 'Bond Back Guarantee:'}</strong> ${lang === 'cn' ? '如中介验收时提出整改要求，我们将在72小时内免费上门处理。' : 'We offer a 72-hour rectification guarantee for any cleaning issues raised by your agent.'}</li>
            <li><strong>${lang === 'cn' ? '付款条款:' : 'Payment Terms:'}</strong> ${lang === 'cn' ? '预订时支付50%定金，进场前付清尾款。' : '50% deposit upon booking, balance due before work commences.'}</li>
            <li><strong>${lang === 'cn' ? '进场要求:' : 'Access:'}</strong> ${lang === 'cn' ? '请确保房屋电源及热水正常供应。' : 'Please ensure electricity and hot water are connected.'}</li>
        </ul>
        ${
          includeGST
            ? `<div class="bank-details">
            ${lang === 'cn' ? '银行转账信息:' : 'BANK TRANSFER DETAILS:'}<br>
            ${lang === 'cn' ? '账户名称:' : 'Account Name:'} WENDEAL PTY LTD<br>
            BSB: 013711  |  ${lang === 'cn' ? '账号:' : 'Account:'} 332166314
        </div>`
            : ''
        }
    </div>

    <div class="page-footer">
        ${lang === 'cn' ? '感谢您选择 Sparkery - 让布里斯班焕然一新！' : 'Thank you for choosing Sparkery - Making Brisbane Sparkle!'}
    </div>
</div>
</body>
</html>`;
  };

  // 生成实时HTML预览
  useEffect(() => {
    if (!quote) return;

    let html = '';
    if (pdfLanguage === 'both') {
      // 双语版本：中文在上，英文在下
      html =
        generateQuoteHTML('cn') +
        '<div style="page-break-after: always;"></div>' +
        generateQuoteHTML('en');
    } else if (pdfLanguage === 'cn') {
      html = generateQuoteHTML('cn');
    } else {
      // 默认英文
      html = generateQuoteHTML('en');
    }

    setLivePreviewHTML(html);
  }, [
    quote,
    quoteId,
    customerName,
    customerAddress,
    selectedWorkType,
    selectedRoomType,
    selectedPropertyType,
    config,
    includeGST,
    notes,
    pdfLanguage,
  ]);

  return (
    <div style={{ padding: '20px' }}>
      <Title level={3}>
        <CalculatorOutlined style={{ marginRight: '8px' }} />
        Brisbane Cleaning Quote Calculator
      </Title>
      <Text type='secondary'>
        Professional cleaning quote generator for Brisbane market
      </Text>

      <Row gutter={24} style={{ marginTop: '20px' }}>
        {/* 左侧：选择区域 */}
        <Col xs={24} lg={16}>
          <Card title='Quote Configuration' style={{ marginBottom: '16px' }}>
            {/* 客户信息 */}
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>Customer Name</Text>
                  <Input
                    placeholder='Enter customer name'
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>Address</Text>
                  <Input
                    placeholder='Enter address'
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                  />
                </div>
              </Col>
            </Row>

            <Divider />

            {/* 工作类型 */}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Work Type</Text>
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
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                {config.workTypes.map(workType => (
                  <Radio
                    key={workType.id}
                    value={workType.id}
                    style={{ margin: 0 }}
                  >
                    {workType.name}
                    {workType.isResidential && (
                      <Tag
                        color='blue'
                        style={{ marginLeft: '4px', fontSize: '10px' }}
                      >
                        Res
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
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Base Room Type</Text>
                  <Radio.Group
                    value={selectedRoomType}
                    onChange={e => setSelectedRoomType(e.target.value)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(90px, 1fr))',
                      gap: '8px',
                      marginTop: '8px',
                    }}
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
                          style={{ textAlign: 'center' }}
                        >
                          {shortName}
                        </Radio.Button>
                      );
                    })}
                    <Radio.Button
                      value='custom'
                      style={{ textAlign: 'center', borderStyle: 'dashed' }}
                    >
                      + 自定义
                    </Radio.Button>
                  </Radio.Group>
                  {selectedRoomType === 'custom' && (
                    <>
                      <Input
                        placeholder='例如: 5 Bed 2 Bath'
                        value={customRoomType}
                        onChange={e => setCustomRoomType(e.target.value)}
                        style={{ marginTop: '8px', width: '200px' }}
                      />
                      <InputNumber
                        placeholder='自定义价格'
                        min={0}
                        value={
                          manualAdjustment > 0
                            ? (manualAdjustment as number)
                            : null
                        }
                        onChange={val =>
                          setManualAdjustment((val as number) || 0)
                        }
                        style={{ marginLeft: '8px', width: '120px' }}
                        prefix='$'
                      />
                    </>
                  )}
                  {/* 地毯勾选 - 仅Bond清洁显示 */}
                  {selectedWorkType === 'bond' &&
                    selectedRoomType !== 'custom' && (
                      <div style={{ marginTop: '8px' }}>
                        <Checkbox
                          checked={includeSteamCarpet}
                          onChange={e =>
                            setIncludeSteamCarpet(e.target.checked)
                          }
                        >
                          <Text>包含地毯蒸洗</Text>
                          <Text type='secondary' style={{ marginLeft: '8px' }}>
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
                    style={{ marginTop: '4px', display: 'block' }}
                  >
                    Base Price: $
                    {selectedRoomType === 'custom'
                      ? '请输入自定义价格'
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
                        <ClockCircleOutlined style={{ marginRight: '4px' }} />
                        {
                          config.roomTypes.find(r => r.id === selectedRoomType)
                            ?.workHours[
                            selectedWorkType as keyof RoomType['workHours']
                          ]
                        }{' '}
                        hrs
                      </>
                    )}
                  </Text>
                </div>

                {/* 房产类型 */}
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Property Type</Text>
                  <Radio.Group
                    value={selectedPropertyType}
                    onChange={e => setSelectedPropertyType(e.target.value)}
                    style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
                  >
                    {config.propertyTypes.map(propertyType => (
                      <Radio.Button
                        key={propertyType.id}
                        value={propertyType.id}
                      >
                        {propertyType.name}
                        {selectedWorkType === 'bond'
                          ? propertyType.bondMultiplier > 1.0 && (
                              <Tag color='blue' style={{ marginLeft: '4px' }}>
                                ×{propertyType.bondMultiplier}
                              </Tag>
                            )
                          : propertyType.additionalPrice > 0 && (
                              <Tag color='orange' style={{ marginLeft: '4px' }}>
                                +${propertyType.additionalPrice}
                              </Tag>
                            )}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                {/* House层数选择 */}
                {selectedPropertyType === 'house' && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text strong>Storey</Text>
                    <Radio.Group
                      value={selectedHouseLevel}
                      onChange={e => setSelectedHouseLevel(e.target.value)}
                      style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
                    >
                      {config.houseLevels.map(level => (
                        <Radio.Button key={level.id} value={level.id}>
                          {level.name}
                          {level.additionalPrice > 0 && (
                            <Tag color='red' style={{ marginLeft: '4px' }}>
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
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Area (Square Meters)</Text>
                  <InputNumber
                    min={0}
                    value={sqmArea}
                    onChange={value => setSqmArea(value || 0)}
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder='Enter area in square meters'
                    addonAfter='sqm'
                  />
                </div>

                {/* 平米单价 */}
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Price per Square Meter</Text>
                  <InputNumber
                    min={0}
                    value={sqmPrice}
                    onChange={value => setSqmPrice(value || 0)}
                    style={{ width: '100%', marginTop: '8px' }}
                    addonBefore='$'
                    addonAfter='/sqm'
                  />
                </div>

                {/* 系数输入 */}
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Multiplier</Text>
                  <InputNumber
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={sqmMultiplier}
                    onChange={value => setSqmMultiplier(value || 1)}
                    style={{ width: '100%', marginTop: '8px' }}
                    placeholder='e.g., 1.0 for standard, 1.5 for heavy soiling'
                  />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Adjust for job complexity (e.g., 1.0 standard, 1.5 heavy
                    soiling)
                  </Text>
                </div>

                {/* 人工调整 */}
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Manual Adjustment</Text>
                  <InputNumber
                    min={-1000}
                    max={1000}
                    value={manualAdjustment}
                    onChange={value => setManualAdjustment(value || 0)}
                    style={{ width: '100%', marginTop: '8px' }}
                    addonBefore='$'
                    placeholder='Additional adjustment amount'
                  />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Positive or negative adjustment to the calculated price
                  </Text>
                </div>
              </>
            )}

            <Divider />

            {/* 附加选项 - 重新整理布局 */}
            <div style={{ marginBottom: '16px' }}>
              <Text
                strong
                style={{
                  fontSize: '16px',
                  marginBottom: '12px',
                  display: 'block',
                }}
              >
                附加服务
              </Text>

              {/* 常规附加服务 - 简单勾选 */}
              <Card
                size='small'
                title='✨ 常规服务'
                extra={<Tag color='green'>固定价格</Tag>}
                style={{ marginBottom: '12px', borderRadius: '8px' }}
              >
                <Checkbox.Group
                  value={selectedAddons}
                  onChange={values => setSelectedAddons(values as string[])}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                  }}
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
                        style={{ margin: 0 }}
                      >
                        <Space size={4}>
                          <Text>{addon.nameCN}</Text>
                          <Text type='secondary' style={{ fontSize: '11px' }}>
                            +${addon.price}
                          </Text>
                          <Text
                            type='secondary'
                            style={{ fontSize: '10px', color: '#999' }}
                          >
                            <ClockCircleOutlined /> {addon.hours}h
                          </Text>
                        </Space>
                      </Checkbox>
                    ))}
                </Checkbox.Group>
              </Card>

              {/* 特殊服务 - 需要输入数量 */}
              <Card
                size='small'
                title='📐 计量服务'
                extra={<Tag color='orange'>按量计价</Tag>}
                style={{ marginBottom: '12px', borderRadius: '8px' }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}
                >
                  {/* 落地窗/玻璃门 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
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
                      <Space size={4}>
                        <Text>落地窗/玻璃门</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(
                              a => a.id === 'glass_door_window'
                            )?.price
                          }
                          /扇
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(
                              a => a.id === 'glass_door_window'
                            )?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('glass_door_window') && (
                      <InputNumber
                        min={1}
                        max={20}
                        value={glassDoorWindowCount}
                        onChange={value => setGlassDoorWindowCount(value || 1)}
                        style={{ width: '100%' }}
                        addonAfter='扇'
                      />
                    )}
                  </div>

                  {/* 墙面污渍 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Checkbox
                      checked={selectedAddons.includes('wall_stains')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'wall_stains']
                          : selectedAddons.filter(id => id !== 'wall_stains');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4}>
                        <Text>墙面污渍清洁</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(
                              a => a.id === 'wall_stains'
                            )?.price
                          }
                          /处
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(
                              a => a.id === 'wall_stains'
                            )?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('wall_stains') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={wallStainsCount}
                        onChange={value => setWallStainsCount(value || 1)}
                        style={{ width: '100%' }}
                        addonAfter='处'
                      />
                    )}
                  </div>

                  {/* 空调滤网 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Checkbox
                      checked={selectedAddons.includes('ac_filter')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'ac_filter']
                          : selectedAddons.filter(id => id !== 'ac_filter');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4}>
                        <Text>空调滤网清洁</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(a => a.id === 'ac_filter')
                              ?.price
                          }
                          /个
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(a => a.id === 'ac_filter')
                              ?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('ac_filter') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={acFilterCount}
                        onChange={value => setAcFilterCount(value || 1)}
                        style={{ width: '100%' }}
                        addonAfter='个'
                      />
                    )}
                  </div>

                  {/* 百叶窗 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Checkbox
                      checked={selectedAddons.includes('blinds')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'blinds']
                          : selectedAddons.filter(id => id !== 'blinds');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4}>
                        <Text>百叶窗清洁</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(a => a.id === 'blinds')
                              ?.price
                          }
                          /扇
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(a => a.id === 'blinds')
                              ?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('blinds') && (
                      <InputNumber
                        min={1}
                        max={20}
                        value={blindsCount}
                        onChange={value => setBlindsCount(value || 1)}
                        style={{ width: '100%' }}
                        addonAfter='扇'
                      />
                    )}
                  </div>

                  {/* 除霉 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Checkbox
                      checked={selectedAddons.includes('mold')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'mold']
                          : selectedAddons.filter(id => id !== 'mold');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4}>
                        <Text>除霉处理</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(a => a.id === 'mold')
                              ?.price
                          }
                          /处
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(a => a.id === 'mold')
                              ?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                    {selectedAddons.includes('mold') && (
                      <InputNumber
                        min={1}
                        max={10}
                        value={moldCount}
                        onChange={value => setMoldCount(value || 1)}
                        style={{ width: '100%' }}
                        addonAfter='处'
                      />
                    )}
                  </div>

                  {/* 特脏加费 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <Checkbox
                      checked={selectedAddons.includes('heavy_soiling')}
                      onChange={e => {
                        const newAddons = e.target.checked
                          ? [...selectedAddons, 'heavy_soiling']
                          : selectedAddons.filter(id => id !== 'heavy_soiling');
                        setSelectedAddons(newAddons);
                      }}
                    >
                      <Space size={4}>
                        <Text>特脏加费</Text>
                        <Tag color='cyan' style={{ fontSize: '10px' }}>
                          +$
                          {
                            config.addonOptions.find(
                              a => a.id === 'heavy_soiling'
                            )?.price
                          }
                          /次
                        </Tag>
                        <Text type='secondary' style={{ fontSize: '10px' }}>
                          <ClockCircleOutlined />{' '}
                          {
                            config.addonOptions.find(
                              a => a.id === 'heavy_soiling'
                            )?.hours
                          }
                          h
                        </Text>
                      </Space>
                    </Checkbox>
                  </div>
                </div>
              </Card>
            </div>

            {/* 折扣选项 */}
            <div style={{ marginBottom: '16px' }}>
              <Checkbox
                checked={discountEnabled}
                onChange={e => setDiscountEnabled(e.target.checked)}
                style={{ marginBottom: '8px' }}
              >
                <Text strong>Apply Discount</Text>
              </Checkbox>

              {discountEnabled && (
                <>
                  <Radio.Group
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Radio value='new'>New Customer / 新客优惠</Radio>
                    <Radio value='returning'>
                      Returning Customer / 回头客优惠
                    </Radio>
                    <Radio value='referral'>Referral / 介绍优惠</Radio>
                  </Radio.Group>
                  <div>
                    <Text>Discount % (e.g., 20 = 20% off):</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={value => setDiscountPercent(value || 0)}
                      style={{ width: '100%', marginTop: '4px' }}
                      addonAfter='%'
                    />
                  </div>
                </>
              )}
            </div>

            {/* 备注 */}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Notes</Text>
              <Input.TextArea
                rows={9}
                placeholder='Additional notes or special requirements...'
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <DollarOutlined /> Quote Summary
                </span>
                <Button
                  type='link'
                  icon={<SettingOutlined />}
                  onClick={() => setConfigModalVisible(true)}
                >
                  Config
                </Button>
              </div>
            }
            style={{ position: 'sticky', top: '20px' }}
          >
            <div style={{ marginBottom: '16px' }}>
              <Row justify='space-between'>
                <Text>Base Price:</Text>
                <Text>${quote.basePrice.toFixed(2)}</Text>
              </Row>

              {quote.adjustments > 0 && (
                <Row justify='space-between' style={{ marginTop: '8px' }}>
                  <Text type='secondary'>Adjustments:</Text>
                  <Text type='secondary'>+${quote.adjustments.toFixed(2)}</Text>
                </Row>
              )}

              {quote.addons > 0 && (
                <Row justify='space-between' style={{ marginTop: '8px' }}>
                  <Text type='secondary'>Add-ons:</Text>
                  <Text type='secondary'>+${quote.addons.toFixed(2)}</Text>
                </Row>
              )}

              {quote.discount > 0 && (
                <Row justify='space-between' style={{ marginTop: '8px' }}>
                  <Text type='secondary' style={{ color: '#52c41a' }}>
                    Discount ({quote.discountPercent}%):
                  </Text>
                  <Text type='secondary' style={{ color: '#52c41a' }}>
                    -${quote.discount.toFixed(2)}
                  </Text>
                </Row>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <Row justify='space-between' style={{ marginTop: '8px' }}>
                <Text strong>Total Work Hours:</Text>
                <Text strong>{quote.workHours.total.toFixed(1)} hrs</Text>
              </Row>

              <Checkbox
                checked={includeGST}
                onChange={e => setIncludeGST(e.target.checked)}
                style={{ marginBottom: '8px' }}
              >
                <Text>Include GST (10%)</Text>
              </Checkbox>

              {includeGST && (
                <Row justify='space-between' style={{ marginTop: '8px' }}>
                  <Text type='secondary'>GST (10%):</Text>
                  <Text type='secondary'>${quote.gst.toFixed(2)}</Text>
                </Row>
              )}

              <Row justify='space-between' style={{ marginTop: '8px' }}>
                <Text type='secondary'>GST (10%):</Text>
                <Text type='secondary'>${quote.gst.toFixed(2)}</Text>
              </Row>

              <Divider style={{ margin: '12px 0' }} />

              <Row justify='space-between'>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  Total:
                </Title>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  ${quote.total.toFixed(2)}
                </Title>
              </Row>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                PDF Language
              </Text>
              <Select
                value={pdfLanguage}
                onChange={value => setPdfLanguage(value)}
                style={{ width: '100%', marginBottom: '8px' }}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'cn', label: '中文' },
                  { value: 'both', label: '双语 (Bilingual)' },
                ]}
              />
              <Button
                type='primary'
                size='large'
                block
                icon={<FileTextOutlined />}
                onClick={() => generateQuotePDF(pdfLanguage)}
              >
                {pdfLanguage === 'cn' ? '生成报价单' : 'Generate Quote'}
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
                setGlassDoorWindowCount(0);
                setWallStainsCount(0);
                setAcFilterCount(0);
                setBlindsCount(0);
                setMoldCount(0);
                setSteamCarpetRoomCount(0);
                setSqmArea(0);
                setSqmPrice(5);
                setSqmMultiplier(1.0);
                setManualAdjustment(0);
              }}
            >
              Reset Form
            </Button>
          </Card>

          <Alert
            message='Quote Validity'
            description='This quote is valid for 30 days. Final price may vary based on actual property condition.'
            type='info'
            style={{ marginTop: '16px' }}
          />
        </Col>
      </Row>

      {/* 实时HTML预览 */}
      <div style={{ marginTop: '30px' }}>
        <Title level={4}>
          <EyeOutlined /> Live Preview
        </Title>
        <div
          dangerouslySetInnerHTML={{ __html: livePreviewHTML }}
          style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'auto',
          }}
        />
      </div>

      {/* 配置管理弹窗 */}
      <Modal
        title='Quote Configuration'
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          onFinish={values => {
            setConfig({ ...config, ...values });
            message.success('Configuration saved successfully!');
            setConfigModalVisible(false);
          }}
          layout='vertical'
        >
          <Title level={4}>Room Type Base Prices & Hours</Title>
          <Form.List name='roomTypes'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={8}
                    style={{ marginBottom: '8px', alignItems: 'flex-end' }}
                  >
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label='Room Type'
                      >
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'airbnb']}
                        label='Airbnb $'
                      >
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'airbnb']}
                        label='Hrs'
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'bond']}
                        label='Bond $'
                      >
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'bond']}
                        label='Hrs'
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'prices', 'regular']}
                        label='Regular $'
                      >
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'workHours', 'regular']}
                        label='Hrs'
                      >
                        <InputNumber
                          min={0}
                          step={0.5}
                          style={{ width: '100%' }}
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

          <Title level={4}>Additional Services (Price & Hours)</Title>
          <Form.List name='addonOptions'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={12}
                    style={{ marginBottom: '8px' }}
                  >
                    <Col span={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'nameCN']}
                        label='Name (CN)'
                      >
                        <Input size='small' />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label='Name (EN)'
                      >
                        <Input size='small' />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'price']}
                        label='Price $'
                      >
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'hours']}
                        label='Hours'
                      >
                        <InputNumber
                          min={0}
                          step={0.25}
                          style={{ width: '100%' }}
                          size='small'
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'type']}
                        label='Type'
                      >
                        <Select size='small'>
                          <Select.Option value='fixed'>Fixed ($)</Select.Option>
                          <Select.Option value='percentage'>
                            Percentage (%)
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

          <Title level={4}>Property Type Configuration</Title>
          <Form.List name='propertyTypes'>
            {fields => (
              <>
                {fields.map(field => (
                  <Row
                    key={field.key}
                    gutter={16}
                    style={{ marginBottom: '8px' }}
                  >
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'name']}
                        label='Property Type'
                      >
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'additionalPrice']}
                        label='Add. Price ($)'
                        tooltip='Additional price for non-bond cleaning types (Airbnb, Regular)'
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'bondMultiplier']}
                        label='Bond Multiplier'
                        tooltip='Percentage multiplier for Bond cleaning only (e.g., 1.5 = +50%)'
                      >
                        <InputNumber
                          min={1}
                          max={3}
                          step={0.1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>

          <Divider />

          <Title level={4}>Extra Room Prices</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='extraBedroomPrice'
                label='Extra Bedroom Price ($)'
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='extraBathroomPrice'
                label='Extra Bathroom Price ($)'
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>SQM Pricing Default Prices</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'office']}
                label='Office ($/sqm)'
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'construction']}
                label='Construction ($/sqm)'
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['sqmDefaultPrices', 'commercial']}
                label='Commercial ($/sqm)'
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px' }}>
            <Button type='primary' htmlType='submit' block size='large'>
              Save Configuration
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BrisbaneQuoteCalculator;
