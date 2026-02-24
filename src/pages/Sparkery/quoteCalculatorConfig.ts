/**
 * Quote calculator shared config and types
 */

// 工作类型
export interface WorkType {
  id: string;
  name: string;
  nameCN: string;
  isResidential: boolean;
  pricingType: 'room' | 'sqm' | 'service'; // room = 房型计价, sqm = 平米计价, service = 服务包计价
}

// 房型
export interface RoomType {
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
export interface PropertyType {
  id: string;
  name: string;
  additionalPrice: number; // 绝对值金额加成
  bondMultiplier: number; // Bond清洁的百分比系数（仅在bond清洁时使用）
}

// House层数
export interface HouseLevel {
  id: string;
  name: string;
  additionalPrice: number;
}

// 附加选项
export interface AddonOption {
  id: string;
  name: string;
  nameCN: string;
  price: number;
  hours: number; // 工时
  type: 'fixed' | 'percentage'; // fixed = 固定金额, percentage = 基础价的百分比
}

// 报价配置（可后台修改）
export interface ManualMeasurementAddon {
  id: string;
  name: string;
  price: number;
  hasQuantity: boolean;
  quantity: number;
}

export type ServiceUnitValue =
  | 'time'
  | 'hour'
  | 'room'
  | 'month'
  | 'sqm'
  | 'hourPerWeek'
  | 'timePerMonth'
  | 'item'
  | 'set'
  | 'visit';

export interface QuoteConfig {
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
export const DEFAULT_CONFIG: QuoteConfig = {
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
    {
      id: 'office-service',
      name: 'Office Service Package',
      nameCN: '办公室服务包',
      isResidential: false,
      pricingType: 'service',
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
