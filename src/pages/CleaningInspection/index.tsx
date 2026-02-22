/**
 * Cleaning Inspection Wizard - Main Controller
 *
 * Wizard-style multi-step flow:
 *   Step 0: Task Overview (property info, cleaner name)
 *   Step 1: Check-in (GPS + timestamp)
 *   Step 2: Pre-clean Damage Report
 *   Step 3..N: Room-by-Room Inspection (checklist + photos)
 *   Final: Check-out & Submit
 *
 * Backward compatible with existing archived inspections and admin templates.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Steps, Button, Typography, Space, message, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  WarningOutlined,
  CheckSquareOutlined,
  LockOutlined,
  LinkOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import type {
  CleaningInspection,
  RoomSection,
  CheckInOut,
  DamageReport,
  ChecklistItem,
  Employee,
} from './types';
import {
  BASE_ROOM_SECTIONS,
  OPTIONAL_SECTIONS,
  getActiveSections,
  getDefaultChecklistForSection,
  generateId,
  migrateChecklistItemLabel,
} from './types';
import { LangContext, createT, type Lang } from './i18n';

import StepTaskOverview from './StepTaskOverview';
import StepCheckIn from './StepCheckIn';
import StepPreCleanDamage from './StepPreCleanDamage';
import StepRoomInspection from './StepRoomInspection';
import StepCheckOut from './StepCheckOut';
import {
  generateInspectionPdfHtml,
  openInspectionPrintWindow,
} from '@/utils/cleaningInspectionPdfTemplate';
import {
  submitInspection,
  loadInspection,
  loadPropertyTemplates,
  loadEmployees,
} from '@/services/inspectionService';
import { buildInspectionShareUrl } from './shareLink';

const { Text } = Typography;

/** Default room sections (when no template) */
const DEFAULT_ROOM_IDS = BASE_ROOM_SECTIONS.map(s => s.id);

/**
 * Build sections from property template, including checklists
 */
function buildSectionsFromTemplate(
  template: any,
  existingSections?: RoomSection[]
): RoomSection[] {
  const activeSectionIds = template.sections || DEFAULT_ROOM_IDS;
  const sectionDefs = getActiveSections(activeSectionIds);

  return sectionDefs.map(def => {
    // Try to find existing section data (for loaded archived inspections)
    const existing = existingSections?.find(s => s.id === def.id);
    if (existing) return existing;

    // Build checklist from template or defaults
    let checklist: ChecklistItem[] = [];
    if (template.checklists?.[def.id]) {
      checklist = template.checklists[def.id].map((t: any, idx: number) => ({
        id: `${def.id}-item-${idx}`,
        label: t.label,
        checked: false,
        requiredPhoto: t.requiredPhoto || false,
      }));
    } else {
      checklist = getDefaultChecklistForSection(def.id);
    }

    return {
      ...def,
      referenceImages: template.referenceImages?.[def.id] || [],
      photos: [],
      notes: '',
      checklist,
    };
  });
}

/**
 * Build default sections (no template)
 */
function buildDefaultSections(): RoomSection[] {
  return BASE_ROOM_SECTIONS.map(def => ({
    ...def,
    referenceImages: [],
    photos: [],
    notes: '',
    checklist: getDefaultChecklistForSection(def.id),
  }));
}

/**
 * Migrate an old inspection record to the new format
 */
function migrateInspection(raw: any): CleaningInspection {
  const normalizedAssignedEmployees: Employee[] = Array.isArray(
    raw.assignedEmployees
  )
    ? raw.assignedEmployees
    : raw.assignedEmployee
      ? [raw.assignedEmployee]
      : [];

  return {
    ...raw,
    checkIn: raw.checkIn || null,
    checkOut: raw.checkOut || null,
    damageReports: raw.damageReports || [],
    status: raw.status === 'draft' ? 'pending' : raw.status || 'pending',
    sections: (raw.sections || []).map((s: any) => ({
      ...s,
      // Migrate legacy single referenceImage to array
      referenceImages: s.referenceImage
        ? [{ image: s.referenceImage, description: '' }]
        : s.referenceImages || [],
      referenceImage: undefined,
      // Migrate old-format checklist labels (bilingual/English-only → split zh/en)
      checklist: (s.checklist || []).map(migrateChecklistItemLabel),
      photos: s.photos || [],
      notes: s.notes || '',
    })),
    ...(normalizedAssignedEmployees.length > 0
      ? {
          assignedEmployees: normalizedAssignedEmployees,
          assignedEmployee: normalizedAssignedEmployees[0],
        }
      : {}),
  };
}

// ──────────────────────── Main Component ────────────────────────

const CleaningInspectionPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  // ── Language State ──
  const [lang, setLang] = useState<Lang>('zh');
  const t = useMemo(() => createT(lang), [lang]);
  const langContextValue = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  // Parse URL params
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const urlInspectionId = searchParams.get('id');
  const urlPropertyName = searchParams.get('property') || '';
  const urlPropertyAddress = searchParams.get('addr') || '';
  const urlDate = searchParams.get('date') || dayjs().format('YYYY-MM-DD');
  const urlEmployeeId = searchParams.get('employee') || '';
  const urlEmployeeIds = useMemo(
    () =>
      (searchParams.get('employees') || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean),
    [searchParams]
  );
  const urlTemplateId = searchParams.get('templateId') || '';

  // ── Core State ──
  const [inspection, setInspection] = useState<CleaningInspection | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);

  /**
   * Local emergency fallback when cloud loading fails.
   * Prevents endless loading screen and still allows manual completion.
   */
  const buildEmergencyInspection = useCallback((): CleaningInspection => {
    return {
      id: urlInspectionId || generateId('insp'),
      propertyId: urlPropertyName,
      propertyAddress: urlPropertyAddress,
      propertyNotes: '',
      checkOutDate: urlDate,
      submittedAt: '',
      sections: buildDefaultSections(),
      submitterName: undefined,
      status: 'pending',
      templateName: undefined,
      checkIn: null,
      checkOut: null,
      damageReports: [],
    };
  }, [urlInspectionId, urlPropertyName, urlPropertyAddress, urlDate]);

  /**
   * Build a fresh "new" inspection from URL params + templates.
   * Used when no existing data is found (localStorage or server).
   */
  const buildNewInspection = useCallback(async () => {
    const id = urlInspectionId || generateId('insp');
    const templates = await loadPropertyTemplates();
    let matchingTemplate =
      (urlTemplateId
        ? templates.find((p: any) => p.id === urlTemplateId)
        : undefined) || templates.find((p: any) => p.name === urlPropertyName);

    let sections: RoomSection[];
    let propertyAddress = urlPropertyAddress;
    let propertyNotes = '';
    let templateName: string | undefined;
    const resolvedPropertyName =
      urlPropertyName || matchingTemplate?.name || '';

    if (matchingTemplate) {
      sections = buildSectionsFromTemplate(matchingTemplate);
      propertyAddress = urlPropertyAddress || matchingTemplate.address || '';
      propertyNotes = matchingTemplate.notes || '';
      templateName = matchingTemplate.name;
    } else {
      sections = buildDefaultSections();
      templateName = resolvedPropertyName || undefined;
    }

    // Load assigned employees from Supabase if employee IDs are provided in URL
    let assignedEmployees: Employee[] = [];
    if (urlEmployeeIds.length > 0 || urlEmployeeId) {
      try {
        const empList = await loadEmployees();
        const idSet = new Set<string>([
          ...urlEmployeeIds,
          ...(urlEmployeeId ? [urlEmployeeId] : []),
        ]);
        assignedEmployees = empList.filter(e => idSet.has(e.id));
      } catch {
        // Ignore employee loading errors and keep wizard usable
      }
    }

    const newInsp: CleaningInspection = {
      id,
      ...(urlTemplateId ? { propertyTemplateId: urlTemplateId } : {}),
      propertyId: resolvedPropertyName,
      propertyAddress,
      propertyNotes,
      checkOutDate: urlDate,
      submittedAt: '',
      sections,
      submitterName: undefined,
      status: 'pending',
      templateName,
      checkIn: null,
      checkOut: null,
      damageReports: [],
      ...(assignedEmployees.length > 0
        ? {
            assignedEmployees,
            assignedEmployee: assignedEmployees[0],
          }
        : {}),
    };
    return newInsp;
  }, [
    urlInspectionId,
    urlPropertyName,
    urlPropertyAddress,
    urlDate,
    urlEmployeeId,
    urlEmployeeIds,
    urlTemplateId,
  ]);

  // ── Initialize Inspection from Supabase ──
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setIsLoadingFromServer(true);
      try {
        if (urlInspectionId) {
          const serverData = await loadInspection(urlInspectionId);
          if (cancelled) return;

          if (serverData) {
            setInspection(migrateInspection(serverData));
            if (serverData.status === 'submitted') {
              setIsArchivedView(true);
              setCurrentStep(999);
            } else if (serverData.status === 'in_progress') {
              setIsArchivedView(true);
            } else {
              setIsArchivedView(false);
            }
            return;
          }
        }

        const fresh = await buildNewInspection();
        if (!cancelled) {
          setInspection(fresh);
          setIsArchivedView(false);
        }
      } catch {
        if (!cancelled) {
          messageApi.error('加载检查数据失败，请稍后重试');
          // Fallback to local defaults so page never gets stuck on loading.
          setInspection(buildEmergencyInspection());
          setIsArchivedView(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFromServer(false);
        }
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [
    urlInspectionId,
    buildNewInspection,
    buildEmergencyInspection,
    messageApi,
  ]);

  // ── Auto-save: persist inspection to Supabase on step change ──
  // Debounced: saves when user navigates between steps (not on every keystroke)
  useEffect(() => {
    if (!inspection || inspection.status === 'submitted' || isLoadingFromServer)
      return;

    const timer = setTimeout(() => {
      submitInspection(inspection).catch(() => {
        messageApi.error('自动保存失败，请检查网络后重试');
      });
    }, 500); // Small debounce to avoid flooding server on rapid step changes

    return () => clearTimeout(timer);
    // Only trigger on step change, not on every inspection update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ── Step Definitions ──
  // Steps: [Overview, Check-in, Damage, ...Rooms..., Check-out]
  const roomCount = inspection?.sections.length || 0;
  const totalSteps = 3 + roomCount + 1; // overview + checkin + damage + rooms + checkout
  const maxStep = totalSteps - 1;

  const stepItems = useMemo(() => {
    if (!inspection) return [];
    return [
      { title: t('step.overview'), icon: <HomeOutlined /> },
      { title: t('step.checkIn'), icon: <PlayCircleOutlined /> },
      { title: t('step.damageCheck'), icon: <WarningOutlined /> },
      ...inspection.sections.map(s => ({
        title: s.name,
        icon: <CheckSquareOutlined />,
      })),
      { title: t('step.checkOut'), icon: <LockOutlined /> },
    ];
  }, [inspection, t]);

  // Clamp currentStep to valid range
  const clampedStep = Math.min(currentStep, maxStep);

  // ── Update Helpers ──

  const handleUpdateInspection = useCallback(
    (patch: Partial<CleaningInspection>) => {
      setInspection(prev => (prev ? { ...prev, ...patch } : prev));
    },
    []
  );

  const handleCheckIn = useCallback((data: CheckInOut) => {
    setInspection(prev =>
      prev ? { ...prev, checkIn: data, status: 'in_progress' } : prev
    );
    // Auto-advance to next step
    setCurrentStep(s => s + 1);
  }, []);

  const handleUpdateDamageReports = useCallback((reports: DamageReport[]) => {
    setInspection(prev => (prev ? { ...prev, damageReports: reports } : prev));
  }, []);

  const handleUpdateSection = useCallback((updated: RoomSection) => {
    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(s => (s.id === updated.id ? updated : s)),
      };
    });
  }, []);

  const handleCheckOut = useCallback((data: CheckInOut) => {
    setInspection(prev => (prev ? { ...prev, checkOut: data } : prev));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!inspection) return;
    setIsSubmitting(true);

    const submitted: CleaningInspection = {
      ...inspection,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    try {
      const result = await submitInspection(submitted);
      setInspection(submitted);
      if (result.source === 'supabase') {
        messageApi.success('Inspection submitted to server!');
      } else {
        messageApi.warning(
          lang === 'zh'
            ? '已保存到本地缓存，当前云端不可用。网络恢复后请再次提交以同步云端。'
            : 'Saved to local cache only. Cloud is currently unavailable. Please submit again later to sync.'
        );
      }
    } catch {
      messageApi.error('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [inspection, messageApi, lang]);

  /** Generate PDF report and open in new window */
  const handleGeneratePDF = useCallback(async () => {
    if (!inspection) return;
    try {
      const html = await generateInspectionPdfHtml(inspection, lang);
      openInspectionPrintWindow(html);
    } catch {
      messageApi.error('Failed to generate PDF');
    }
  }, [inspection, messageApi, lang]);

  const handleCopyLink = useCallback(() => {
    if (!inspection) return;
    const url = buildInspectionShareUrl(window.location.origin, {
      id: inspection.id,
      propertyName: inspection.propertyId,
      propertyAddress: inspection.propertyAddress,
      checkOutDate: inspection.checkOutDate,
      employeeIds:
        inspection.assignedEmployees?.map(emp => emp.id) ||
        (inspection.assignedEmployee ? [inspection.assignedEmployee.id] : []),
      templateId: inspection.propertyTemplateId,
    });
    navigator.clipboard.writeText(url);
    messageApi.success('Link copied to clipboard!');
  }, [inspection, messageApi]);

  /**
   * Allow editing after submission: revert status to in_progress.
   * Checkout timestamp remains locked (not cleared).
   */
  const handleEdit = useCallback(() => {
    if (!inspection) return;
    setInspection({ ...inspection, status: 'in_progress', submittedAt: '' });
    setCurrentStep(0); // Go back to first step for editing
    messageApi.info(
      lang === 'zh'
        ? '已进入编辑模式，修改完成后请重新提交'
        : 'Edit mode enabled. Please re-submit when done.'
    );
  }, [inspection, messageApi, lang]);

  // ── Navigation ──
  const handleNext = () => setCurrentStep(s => Math.min(s + 1, maxStep));
  const handlePrev = () => setCurrentStep(s => Math.max(s - 1, 0));

  // ── Render Step Content ──
  const renderStepContent = () => {
    if (!inspection) return null;

    if (clampedStep === 0) {
      return (
        <StepTaskOverview
          inspection={inspection}
          onUpdate={handleUpdateInspection}
        />
      );
    }

    if (clampedStep === 1) {
      return (
        <StepCheckIn
          checkIn={inspection.checkIn}
          propertyAddress={inspection.propertyAddress}
          onCheckIn={handleCheckIn}
        />
      );
    }

    if (clampedStep === 2) {
      return (
        <StepPreCleanDamage
          damageReports={inspection.damageReports}
          sections={inspection.sections}
          propertyAddress={inspection.propertyAddress}
          onUpdate={handleUpdateDamageReports}
        />
      );
    }

    const roomIndex = clampedStep - 3;
    const currentSection = inspection.sections[roomIndex];
    if (
      roomIndex >= 0 &&
      roomIndex < inspection.sections.length &&
      currentSection
    ) {
      return (
        <StepRoomInspection
          section={currentSection}
          sectionIndex={roomIndex}
          totalSections={inspection.sections.length}
          propertyAddress={inspection.propertyAddress}
          onUpdate={handleUpdateSection}
          disabled={inspection.status === 'submitted'}
        />
      );
    }

    // Last step: Check-out
    return (
      <StepCheckOut
        inspection={inspection}
        onCheckOut={handleCheckOut}
        onSubmit={handleSubmit}
        onGeneratePDF={handleGeneratePDF}
        onCopyLink={handleCopyLink}
        onEdit={handleEdit}
        isSubmitting={isSubmitting}
      />
    );
  };

  // ── Loading ──
  if (!inspection || isLoadingFromServer) {
    return (
      <>
        {contextHolder}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f5f5f5',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '24px', color: '#52c41a' }}>⏳</div>
          <Text>
            {isLoadingFromServer
              ? t('lang.toggle') === '中文'
                ? 'Loading from server...'
                : '正在从服务器加载数据...'
              : t('lang.toggle') === '中文'
                ? 'Loading...'
                : '加载中...'}
          </Text>
        </div>
      </>
    );
  }

  const isLastStep = clampedStep === maxStep;
  const isFirstStep = clampedStep === 0;

  return (
    <LangContext.Provider value={langContextValue}>
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {contextHolder}

        {/* ── Top Bar ── */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
            padding: '8px 16px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space>
              <Tag
                color={
                  inspection.status === 'submitted'
                    ? 'green'
                    : inspection.status === 'in_progress'
                      ? 'blue'
                      : 'default'
                }
              >
                {inspection.status === 'submitted'
                  ? t('topbar.submitted')
                  : inspection.status === 'in_progress'
                    ? t('topbar.inProgress')
                    : t('topbar.pending')}
              </Tag>
              <Text
                type='secondary'
                style={{ fontSize: '11px', fontFamily: 'monospace' }}
              >
                {inspection.id}
              </Text>
            </Space>
            <Space>
              <Button
                size='small'
                icon={<GlobalOutlined />}
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              >
                {t('lang.toggle')}
              </Button>
              <Button
                size='small'
                icon={<LinkOutlined />}
                onClick={handleCopyLink}
              >
                {t('topbar.copyLink')}
              </Button>
            </Space>
          </div>
        </div>

        {/* ── Steps Progress ── */}
        <div
          style={{
            background: '#fff',
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            overflowX: 'auto',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Steps
              current={clampedStep}
              size='small'
              items={stepItems}
              onChange={step => {
                // Only allow going to completed steps or current+1
                if (step <= clampedStep + 1) {
                  setCurrentStep(step);
                }
              }}
              style={{ minWidth: `${totalSteps * 100}px` }}
            />
          </div>
        </div>

        {/* ── Step Content ── */}
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '16px 12px 100px',
          }}
        >
          {renderStepContent()}
        </div>

        {/* ── Bottom Navigation Bar ── */}
        {inspection.status !== 'submitted' && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#fff',
              borderTop: '1px solid #e8e8e8',
              padding: '12px 16px',
              zIndex: 100,
            }}
          >
            <div
              style={{
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handlePrev}
                disabled={isFirstStep}
                size='large'
              >
                {t('nav.back')}
              </Button>

              <Text type='secondary' style={{ fontSize: '12px' }}>
                {t('nav.stepOf', {
                  current: String(clampedStep + 1),
                  total: String(totalSteps),
                })}
              </Text>

              {!isLastStep && (
                <Button
                  type='primary'
                  onClick={handleNext}
                  size='large'
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  {t('nav.next')} <ArrowRightOutlined />
                </Button>
              )}

              {isLastStep && (
                <div style={{ width: '100px' }} /> // Spacer; submit is in step content
              )}
            </div>
          </div>
        )}
      </div>
    </LangContext.Provider>
  );
};

export default CleaningInspectionPage;
