/**
 * Cleaning Inspection Wizard - Internationalization (i18n)
 *
 * Chinese (zh) is the default language.
 * English (en) is available via a toggle.
 */

import React, { createContext, useContext } from 'react';

export type Lang = 'zh' | 'en';

/** Translation dictionary */
const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // ── Top bar / Global ──
    'topbar.copyLink': '复制链接',
    'topbar.submitted': '已提交',
    'topbar.inProgress': '进行中',
    'topbar.pending': '待开始',
    'lang.toggle': 'EN',

    // ── Steps navigation ──
    'step.overview': '任务概览',
    'step.checkIn': '签到',
    'step.damageCheck': '损坏检查',
    'step.checkOut': '签退',
    'nav.back': '上一步',
    'nav.next': '下一步',
    'nav.stepOf': '第 {current} 步，共 {total} 步',

    // ── StepTaskOverview ──
    'overview.title': '清洁检查',
    'overview.subtitle': '请按步骤完成清洁检查任务',
    'overview.propertyDetails': '房产信息',
    'overview.propertyId': '房产名称',
    'overview.propertyIdPlaceholder': '例如：UNIT-101',
    'overview.checkOutDate': '退房日期',
    'overview.propertyAddress': '房产地址',
    'overview.propertyAddressPlaceholder':
      '例如：52 Wecker Road, Mansfield QLD 4122',
    'overview.importantNotes': '重要提示',
    'overview.taskSummary': '任务摘要',
    'overview.roomsToInspect': '{count} 个房间需要检查',
    'overview.template': '模板：{name}',
    'overview.rooms': '房间：',
    'overview.yourName': '您的姓名',
    'overview.namePlaceholder': '请输入您的姓名',
    'overview.assignedEmployee': '负责人员',

    // ── StepCheckIn ──
    'checkIn.done': '已签到！',
    'checkIn.doneSubtitle': '您于 {time} 开始工作',
    'checkIn.time': '时间：',
    'checkIn.gps': 'GPS：',
    'checkIn.gpsUnavailable': 'GPS 不可用',
    'checkIn.address': '地址：',
    'checkIn.readyTitle': '准备开始了吗？',
    'checkIn.readyDesc':
      '点击下方按钮签到，系统会自动记录您的 GPS 位置和时间。',
    'checkIn.startButton': '开始工作 / 签到',
    'checkIn.noAddress': '未设置地址',
    'checkIn.addressPlaceholder': '请手动输入房产地址',

    // ── StepPreCleanDamage ──
    'damage.title': '清洁前损坏检查',
    'damage.desc':
      '开始清洁之前，请记录您发现的任何现有损坏（污渍、破洞、损坏的物品等）。这可以保护您不被追究已有的问题。',
    'damage.noDamage': '未发现现有损坏',
    'damage.noDamageDesc': '勾选此项确认您已检查房产，未发现任何现有损坏。',
    'damage.entry': '损坏 #{index}',
    'damage.remove': '删除',
    'damage.location': '位置',
    'damage.description': '描述',
    'damage.descPlaceholder':
      '描述损坏情况（例如：窗户附近地毯有污渍，墙壁有划痕）',
    'damage.photoRequired': '照片（必须）',
    'damage.addButton': '添加损坏报告',
    'damage.entrance': '入口',
    'damage.hallway': '走廊',
    'damage.other': '其他',

    // ── StepRoomInspection ──
    'room.title': '房间 {index}/{total}',
    'room.referenceImages': '参考照片',
    'room.referenceDesc': '标准清洁效果参考',
    'room.checklist': '检查清单',
    'room.checklistProgress': '检查清单 ({checked}/{total})',
    'room.photoForItem': '为此项拍照：',
    'room.additionalPhotos': '补充照片 ({count})',
    'room.noPhotos': '暂无补充照片',
    'room.tapToAdd': '点击上方按钮添加照片',
    'room.notes': '备注',
    'room.notesPlaceholder': '为此房间添加备注...',

    // ── StepCheckOut ──
    'checkOut.title': '签退并提交',
    'checkOut.keyReturn': '钥匙归还方式',
    'checkOut.keyPlaceholder': '您如何归还钥匙？',
    'checkOut.lockPhoto': '门锁 / 门口照片',
    'checkOut.summary': '检查摘要',
    'checkOut.rooms': '房间',
    'checkOut.photos': '照片',
    'checkOut.checklist': '清单',
    'checkOut.duration': '时长',
    'checkOut.checkInTime': '签到时间：{time}',
    'checkOut.damageReports': '损坏报告：{count}',
    'checkOut.finishButton': '完成工作 / 签退',
    'checkOut.checkedOutAt': '已于 {time} 签退',
    'checkOut.gpsInfo': 'GPS：{gps}',
    'checkOut.submitButton': '提交检查报告',
    'checkOut.submitted': '检查已提交！',
    'checkOut.submittedDesc': '您的检查报告已成功记录。',
    'checkOut.generatePdf': '生成 PDF 报告',
    'checkOut.copyLink': '复制分享链接',

    // ── PhotoCapture ──
    'photo.camera': '拍照',
    'photo.upload': '上传',
    'photo.retake': '重拍',
    'photo.replace': '替换',
    'photo.takePhoto': '拍照',
    'photo.uploadPhoto': '上传照片',
    'photo.takeLockPhoto': '拍摄门锁照片',
    'photo.uploadLockPhoto': '上传门锁照片',
    'photo.modalTitle': '拍照',
    'photo.cancel': '取消',
    'photo.capture': '拍摄',
    'photo.captured': '照片已拍摄！',
    'photo.uploaded': '照片已上传！',
    'photo.cameraError': '无法访问摄像头，请使用上传功能。',
    'photo.captureFailed': '拍照失败',

    // ── ChecklistCard ──
    'checklist.photoFirst': '请先拍照再勾选此项',
    'checklist.photoAttached': '照片已附',
    'checklist.cameraTooltip': '拍照',
    'checklist.fileTooltip': '从相册选取',

    // ── KEY_RETURN_METHODS ──
    'key.lockbox': '钥匙箱',
    'key.agent': '交给中介/房东',
    'key.underMat': '门垫下',
    'key.letterbox': '信箱',
    'key.other': '其他',
  },

  en: {
    // ── Top bar / Global ──
    'topbar.copyLink': 'Copy Link',
    'topbar.submitted': 'SUBMITTED',
    'topbar.inProgress': 'IN PROGRESS',
    'topbar.pending': 'PENDING',
    'lang.toggle': '中文',

    // ── Steps navigation ──
    'step.overview': 'Overview',
    'step.checkIn': 'Check-in',
    'step.damageCheck': 'Damage Check',
    'step.checkOut': 'Check-out',
    'nav.back': 'Back',
    'nav.next': 'Next',
    'nav.stepOf': 'Step {current} of {total}',

    // ── StepTaskOverview ──
    'overview.title': 'Cleaning Inspection',
    'overview.subtitle':
      'Follow the steps to complete your cleaning inspection',
    'overview.propertyDetails': 'Property Details',
    'overview.propertyId': 'Property ID',
    'overview.propertyIdPlaceholder': 'e.g., UNIT-101',
    'overview.checkOutDate': 'Check-out Date',
    'overview.propertyAddress': 'Property Address',
    'overview.propertyAddressPlaceholder':
      'e.g., 52 Wecker Road, Mansfield QLD 4122',
    'overview.importantNotes': 'Important Notes',
    'overview.taskSummary': 'Task Summary',
    'overview.roomsToInspect': '{count} rooms to inspect',
    'overview.template': 'Template: {name}',
    'overview.rooms': 'Rooms: ',
    'overview.yourName': 'Your Name',
    'overview.namePlaceholder': 'Enter your name',
    'overview.assignedEmployee': 'Assigned Cleaner',

    // ── StepCheckIn ──
    'checkIn.done': 'Checked In!',
    'checkIn.doneSubtitle': 'You started work at {time}',
    'checkIn.time': 'Time: ',
    'checkIn.gps': 'GPS: ',
    'checkIn.gpsUnavailable': 'GPS unavailable',
    'checkIn.address': 'Address: ',
    'checkIn.readyTitle': 'Ready to Start?',
    'checkIn.readyDesc':
      'Tap the button below to check in. Your GPS location and time will be recorded automatically.',
    'checkIn.startButton': 'Start Work / Check In',
    'checkIn.noAddress': 'No address set',
    'checkIn.addressPlaceholder': 'Enter property address manually',

    // ── StepPreCleanDamage ──
    'damage.title': 'Pre-Clean Damage Check',
    'damage.desc':
      'Before you start cleaning, document any existing damage you find (stains, holes, broken items, etc.). This protects you from being blamed for pre-existing issues.',
    'damage.noDamage': 'No pre-existing damage found',
    'damage.noDamageDesc':
      'Check this box to confirm you have inspected the property and found no existing damage.',
    'damage.entry': 'Damage #{index}',
    'damage.remove': 'Remove',
    'damage.location': 'Location',
    'damage.description': 'Description',
    'damage.descPlaceholder':
      'Describe the damage (e.g. carpet stain near window, wall scratch)',
    'damage.photoRequired': 'Photo (required)',
    'damage.addButton': 'Add Damage Report',
    'damage.entrance': 'Entrance',
    'damage.hallway': 'Hallway',
    'damage.other': 'Other',

    // ── StepRoomInspection ──
    'room.title': 'Room {index}/{total}',
    'room.referenceImages': 'Reference Images',
    'room.referenceDesc': 'Standard cleaning reference',
    'room.checklist': 'Checklist',
    'room.checklistProgress': 'Checklist ({checked}/{total})',
    'room.photoForItem': 'Take photo for: ',
    'room.additionalPhotos': 'Additional Photos ({count})',
    'room.noPhotos': 'No additional photos yet',
    'room.tapToAdd': 'Tap the button above to add photos',
    'room.notes': 'Notes',
    'room.notesPlaceholder': 'Add notes for this room...',

    // ── StepCheckOut ──
    'checkOut.title': 'Check-out & Submit',
    'checkOut.keyReturn': 'Key Return Method',
    'checkOut.keyPlaceholder': 'How are you returning the key?',
    'checkOut.lockPhoto': 'Lock / Door Photo',
    'checkOut.summary': 'Inspection Summary',
    'checkOut.rooms': 'Rooms',
    'checkOut.photos': 'Photos',
    'checkOut.checklist': 'Checklist',
    'checkOut.duration': 'Duration',
    'checkOut.checkInTime': 'Check-in: {time}',
    'checkOut.damageReports': 'Damage reports: {count}',
    'checkOut.finishButton': 'Finish Work & Check Out',
    'checkOut.checkedOutAt': 'Checked out at {time}',
    'checkOut.gpsInfo': 'GPS: {gps}',
    'checkOut.submitButton': 'Submit Inspection',
    'checkOut.submitted': 'Inspection Submitted!',
    'checkOut.submittedDesc': 'Your inspection has been recorded successfully.',
    'checkOut.generatePdf': 'Generate PDF Report',
    'checkOut.copyLink': 'Copy Shareable Link',

    // ── PhotoCapture ──
    'photo.camera': 'Camera',
    'photo.upload': 'Upload',
    'photo.retake': 'Retake',
    'photo.replace': 'Replace',
    'photo.takePhoto': 'Take Photo',
    'photo.uploadPhoto': 'Upload Photo',
    'photo.takeLockPhoto': 'Take Lock Photo',
    'photo.uploadLockPhoto': 'Upload Lock Photo',
    'photo.modalTitle': 'Take Photo',
    'photo.cancel': 'Cancel',
    'photo.capture': 'Capture',
    'photo.captured': 'Photo captured!',
    'photo.uploaded': 'Photo uploaded!',
    'photo.cameraError': 'Could not access camera. Please use Upload instead.',
    'photo.captureFailed': 'Failed to capture photo',

    // ── ChecklistCard ──
    'checklist.photoFirst': 'Take a photo first before checking this item',
    'checklist.photoAttached': 'Photo attached',
    'checklist.cameraTooltip': 'Take photo',
    'checklist.fileTooltip': 'Choose from gallery',

    // ── KEY_RETURN_METHODS ──
    'key.lockbox': 'Lockbox',
    'key.agent': 'Hand to Agent / Owner',
    'key.underMat': 'Under Door Mat',
    'key.letterbox': 'Letterbox',
    'key.other': 'Other',
  },
};

/** Translation function type */
export type TFunc = (
  key: string,
  params?: Record<string, string | number>
) => string;

/** Language context value */
interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunc;
}

/** Create the language context with Chinese as default */
export const LangContext = createContext<LangContextValue>({
  lang: 'zh',
  setLang: () => {},
  t: (key: string) => key,
});

/**
 * Hook to use language context in components
 */
export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/**
 * Create a translation function for a given language
 */
export function createT(lang: Lang): TFunc {
  return (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang]?.[key] || translations.zh[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
}

/**
 * Get localized KEY_RETURN_METHODS for a given language
 */
export function getKeyReturnMethods(lang: Lang) {
  const t = createT(lang);
  return [
    { value: 'lockbox', label: t('key.lockbox') },
    { value: 'agent', label: t('key.agent') },
    { value: 'under_mat', label: t('key.underMat') },
    { value: 'letterbox', label: t('key.letterbox') },
    { value: 'other', label: t('key.other') },
  ];
}
