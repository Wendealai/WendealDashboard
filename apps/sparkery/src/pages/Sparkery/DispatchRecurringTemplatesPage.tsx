import React from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import { UNSAFE_NavigationContext, useNavigate } from 'react-router-dom';
import {
  clearDispatchError,
  fetchDispatchCustomerProfiles,
  fetchDispatchJobs,
  generateDispatchJobsFromRecurring,
  selectDispatchCustomerProfiles,
  selectDispatchState,
  setSelectedWeekStart,
  upsertDispatchCustomerProfile,
} from '@/store/slices/sparkeryDispatchSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  DispatchCustomerProfile,
  DispatchServiceType,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
} from './dispatch/types';
import { useTranslation } from 'react-i18next';
import SparkeryDataTable from '@/components/sparkery/SparkeryDataTable';
import './sparkery.css';

const { Title, Text } = Typography;

const WEEKDAY_OPTIONS: DispatchWeekday[] = [1, 2, 3, 4, 5, 6, 7];
const TEMPLATE_DRAFT_DEBOUNCE_MS = 480;

type TemplateDraftStatus = 'saved' | 'saving' | 'unsaved';
type TemplateValidationSeverity = 'error' | 'warning';
type TemplateValidationHint = {
  field: string;
  message: string;
  fix: string;
  severity: TemplateValidationSeverity;
};
type TemplateReviewSuggestionId =
  | 'customer_name'
  | 'weekdays'
  | 'time_window'
  | 'service_type';
type TemplateReviewCheck = {
  key: string;
  label: string;
  value: string;
  score: number;
  reason?: string | undefined;
  suggestionId?: TemplateReviewSuggestionId | undefined;
};

type NavigationTransition = {
  retry: () => void;
};

type BlockableNavigator = {
  block?: (blocker: (transition: NavigationTransition) => void) => () => void;
};

const useBrowserRouterBlocker = (
  enabled: boolean,
  onBlock: (transition: NavigationTransition) => void
) => {
  const navigationContext = React.useContext(UNSAFE_NavigationContext) as
    | { navigator?: BlockableNavigator }
    | null;
  const onBlockRef = React.useRef(onBlock);

  React.useEffect(() => {
    onBlockRef.current = onBlock;
  }, [onBlock]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const navigator = navigationContext?.navigator;
    if (!navigator || typeof navigator.block !== 'function') {
      return;
    }

    const unblock = navigator.block(transition => {
      const autoUnblockingTransition: NavigationTransition = {
        retry() {
          unblock();
          transition.retry();
        },
      };
      onBlockRef.current(autoUnblockingTransition);
    });

    return unblock;
  }, [enabled, navigationContext]);
};

const toTemplateDraftKey = (templateId: string): string =>
  `sparkery_dispatch_recurring_template_draft_${templateId}`;

const safeReadTemplateDraft = (
  templateId: string
): Partial<UpsertDispatchCustomerProfilePayload> | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(toTemplateDraftKey(templateId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Partial<UpsertDispatchCustomerProfilePayload>;
  } catch {
    return null;
  }
};

const safeWriteTemplateDraft = (
  templateId: string,
  draft: Partial<UpsertDispatchCustomerProfilePayload>
) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      toTemplateDraftKey(templateId),
      JSON.stringify(draft)
    );
  } catch {
    // ignore localStorage failures
  }
};

const safeRemoveTemplateDraft = (templateId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(toTemplateDraftKey(templateId));
  } catch {
    // ignore localStorage failures
  }
};

const normalizeTemplateSnapshot = (
  values: Partial<UpsertDispatchCustomerProfilePayload>
): string => {
  const weekdays = Array.isArray(values.recurringWeekdays)
    ? [...values.recurringWeekdays].sort((a, b) => a - b)
    : [];
  return JSON.stringify({
    name: values.name || '',
    address: values.address || '',
    phone: values.phone || '',
    recurringEnabled:
      typeof values.recurringEnabled === 'boolean'
        ? values.recurringEnabled
        : true,
    recurringWeekdays: weekdays,
    recurringStartTime: values.recurringStartTime || '',
    recurringEndTime: values.recurringEndTime || '',
    recurringServiceType: values.recurringServiceType || '',
    recurringPriority: values.recurringPriority || 0,
    recurringFee:
      typeof values.recurringFee === 'number' && Number.isFinite(values.recurringFee)
        ? Number(values.recurringFee.toFixed(2))
        : 0,
    defaultJobTitle: values.defaultJobTitle || '',
    defaultDescription: values.defaultDescription || '',
    defaultNotes: values.defaultNotes || '',
  });
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const getWeekEnd = (weekStart: string): string => {
  const start = parseDateKey(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDateKey(end);
};

const normalizeRecurringWeekdays = (
  profile: Pick<
    DispatchCustomerProfile,
    'recurringWeekdays' | 'recurringWeekday'
  >
): DispatchWeekday[] => {
  const source = Array.isArray(profile.recurringWeekdays)
    ? profile.recurringWeekdays
    : profile.recurringWeekday
      ? [profile.recurringWeekday]
      : [];
  const valid = source.filter((value): value is DispatchWeekday =>
    [1, 2, 3, 4, 5, 6, 7].includes(value)
  );
  return Array.from(new Set(valid)).sort((a, b) => a - b);
};

const extractThunkError = (
  action: { error?: { message?: string } },
  fallback: string
): string => action.error?.message || fallback;

const isRecurringTemplate = (profile: DispatchCustomerProfile): boolean =>
  Boolean(
    profile.recurringEnabled ||
      (Array.isArray(profile.recurringWeekdays) &&
        profile.recurringWeekdays.length > 0) ||
      profile.recurringWeekday
  );

const profileToPayload = (
  profile: DispatchCustomerProfile,
  override: Partial<UpsertDispatchCustomerProfilePayload> = {}
): UpsertDispatchCustomerProfilePayload => {
  const weekdays = normalizeRecurringWeekdays(profile);
  const payload: UpsertDispatchCustomerProfilePayload = {
    id: profile.id,
    name: profile.name,
    recurringEnabled:
      typeof profile.recurringEnabled === 'boolean'
        ? profile.recurringEnabled
        : true,
    recurringWeekdays: weekdays,
  };

  const firstWeekday = weekdays[0];
  if (firstWeekday) {
    payload.recurringWeekday = firstWeekday;
  }
  if (profile.address) payload.address = profile.address;
  if (profile.phone) payload.phone = profile.phone;
  if (profile.defaultJobTitle)
    payload.defaultJobTitle = profile.defaultJobTitle;
  if (profile.defaultDescription) {
    payload.defaultDescription = profile.defaultDescription;
  }
  if (profile.defaultNotes) payload.defaultNotes = profile.defaultNotes;
  if (profile.recurringStartTime) {
    payload.recurringStartTime = profile.recurringStartTime;
  }
  if (profile.recurringEndTime)
    payload.recurringEndTime = profile.recurringEndTime;
  if (profile.recurringServiceType) {
    payload.recurringServiceType = profile.recurringServiceType;
  }
  if (profile.recurringPriority)
    payload.recurringPriority = profile.recurringPriority;
  if (
    typeof profile.recurringFee === 'number' &&
    Number.isFinite(profile.recurringFee)
  ) {
    payload.recurringFee = Number(profile.recurringFee.toFixed(2));
  }

  return {
    ...payload,
    ...override,
  };
};

const formatWeekdayTags = (
  weekdays: DispatchWeekday[],
  resolveWeekdayLabel: (day: DispatchWeekday) => string,
  emptyText: string
): React.ReactNode =>
  weekdays.length === 0 ? (
    <Text type='secondary' className='dispatch-recurring-empty-text'>
      {emptyText}
    </Text>
  ) : (
    <Space size={[4, 4]} wrap className='dispatch-recurring-weekday-tags'>
      {weekdays.map(day => (
        <Tag key={day} className='dispatch-recurring-weekday-tag'>
          {resolveWeekdayLabel(day)}
        </Tag>
      ))}
    </Space>
  );

const DispatchRecurringTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedWeekStart, isLoading, error } =
    useAppSelector(selectDispatchState);
  const customerProfiles = useAppSelector(selectDispatchCustomerProfiles);
  const [feeDrafts, setFeeDrafts] = React.useState<
    Record<string, number | null>
  >({});
  const [editingTemplate, setEditingTemplate] =
    React.useState<DispatchCustomerProfile | null>(null);
  const [savingFeeId, setSavingFeeId] = React.useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [autoFilling, setAutoFilling] = React.useState(false);
  const [editStep, setEditStep] = React.useState(0);
  const [draftStatus, setDraftStatus] =
    React.useState<TemplateDraftStatus>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [completionTemplateName, setCompletionTemplateName] =
    React.useState('');
  const [validationSummary, setValidationSummary] = React.useState<string[]>(
    []
  );
  const [validationHints, setValidationHints] = React.useState<
    TemplateValidationHint[]
  >([]);
  const [form] = Form.useForm<UpsertDispatchCustomerProfilePayload>();
  const initialSnapshotRef = React.useRef<string>('');
  const draftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const formSnapshot = Form.useWatch([], form);
  const recurringEnabled = Form.useWatch('recurringEnabled', form);
  const weekdaySelectOptions = React.useMemo(
    () =>
      WEEKDAY_OPTIONS.map(day => ({
        value: day,
        label: t(`sparkery.dispatch.common.weekday.short.${day}`),
      })),
    [t]
  );

  const resolveWeekdayLabel = React.useCallback(
    (day: DispatchWeekday) =>
      t(`sparkery.dispatch.common.weekday.short.${day}`),
    [t]
  );

  const weekRange = React.useMemo(
    () => ({
      weekStart: selectedWeekStart,
      weekEnd: getWeekEnd(selectedWeekStart),
    }),
    [selectedWeekStart]
  );

  const templates = React.useMemo(
    () =>
      customerProfiles
        .filter(isRecurringTemplate)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customerProfiles]
  );

  const editSteps = React.useMemo(
    () => [
      {
        key: 'profile',
        title: t('sparkery.dispatch.recurringTemplates.workflow.steps.profile', {
          defaultValue: 'Profile',
        }),
        fields: ['name'] as Array<keyof UpsertDispatchCustomerProfilePayload>,
      },
      {
        key: 'schedule',
        title: t(
          'sparkery.dispatch.recurringTemplates.workflow.steps.schedule',
          {
            defaultValue: 'Schedule',
          }
        ),
        fields: [
          'recurringWeekdays',
          'recurringStartTime',
          'recurringEndTime',
          'recurringServiceType',
        ] as Array<keyof UpsertDispatchCustomerProfilePayload>,
      },
      {
        key: 'defaults',
        title: t(
          'sparkery.dispatch.recurringTemplates.workflow.steps.defaults',
          {
            defaultValue: 'Default Task',
          }
        ),
        fields: [] as Array<keyof UpsertDispatchCustomerProfilePayload>,
      },
      {
        key: 'review',
        title: t('sparkery.dispatch.recurringTemplates.workflow.steps.review', {
          defaultValue: 'Review',
        }),
        fields: [] as Array<keyof UpsertDispatchCustomerProfilePayload>,
      },
      {
        key: 'complete',
        title: t(
          'sparkery.dispatch.recurringTemplates.workflow.steps.complete',
          {
            defaultValue: 'Complete',
          }
        ),
        fields: [] as Array<keyof UpsertDispatchCustomerProfilePayload>,
      },
    ],
    [t]
  );

  const clearDraftTimer = React.useCallback(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    dispatch(fetchDispatchCustomerProfiles());
  }, [dispatch]);

  React.useEffect(() => {
    setFeeDrafts(prev => {
      const next: Record<string, number | null> = {};
      templates.forEach(template => {
        const previousFee = prev[template.id];
        if (typeof previousFee === 'number') {
          next[template.id] = previousFee;
          return;
        }
        next[template.id] = Number((template.recurringFee || 0).toFixed(2));
      });
      return next;
    });
  }, [templates]);

  React.useEffect(() => () => clearDraftTimer(), [clearDraftTimer]);

  React.useEffect(() => {
    if (!editingTemplate || !hasUnsavedChanges) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editingTemplate, hasUnsavedChanges]);

  const handleRefresh = async () => {
    await dispatch(fetchDispatchCustomerProfiles());
    message.success(
      t('sparkery.dispatch.recurringTemplates.messages.templatesRefreshed')
    );
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    const result = await dispatch(generateDispatchJobsFromRecurring(weekRange));
    setAutoFilling(false);
    if (generateDispatchJobsFromRecurring.fulfilled.match(result)) {
      const count = result.payload.length;
      message.success(
        count > 0
          ? t(
              'sparkery.dispatch.recurringTemplates.messages.generatedRecurringTasks',
              {
                count,
              }
            )
          : t(
              'sparkery.dispatch.recurringTemplates.messages.noRecurringTasksNeeded'
            )
      );
      await dispatch(fetchDispatchJobs(weekRange));
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.autoFillFailed')
      )
    );
  };

  const openEdit = (template: DispatchCustomerProfile) => {
    const weekdays = normalizeRecurringWeekdays(template);
    form.resetFields();
    const formValue: UpsertDispatchCustomerProfilePayload = {
      id: template.id,
      name: template.name,
      recurringEnabled:
        typeof template.recurringEnabled === 'boolean'
          ? template.recurringEnabled
          : true,
      recurringWeekdays: weekdays,
      recurringStartTime: template.recurringStartTime || '09:00',
      recurringEndTime: template.recurringEndTime || '11:00',
      recurringServiceType:
        (template.recurringServiceType as DispatchServiceType) || 'regular',
      recurringPriority: template.recurringPriority || 3,
      recurringFee: Number((template.recurringFee || 0).toFixed(2)),
    };
    const firstWeekday = weekdays[0];
    if (firstWeekday) {
      formValue.recurringWeekday = firstWeekday;
    }
    if (template.address) formValue.address = template.address;
    if (template.phone) formValue.phone = template.phone;
    if (template.defaultJobTitle) {
      formValue.defaultJobTitle = template.defaultJobTitle;
    }
    if (template.defaultDescription) {
      formValue.defaultDescription = template.defaultDescription;
    }
    if (template.defaultNotes) formValue.defaultNotes = template.defaultNotes;
    const draftValues = safeReadTemplateDraft(template.id);
    const mergedValue = {
      ...formValue,
      ...(draftValues || {}),
    } as UpsertDispatchCustomerProfilePayload;
    form.setFieldsValue(mergedValue);
    initialSnapshotRef.current = normalizeTemplateSnapshot(mergedValue);
    setEditStep(0);
    setDraftStatus('saved');
    setHasUnsavedChanges(false);
    setCompletionTemplateName('');
    setValidationSummary([]);
    setValidationHints([]);
    setEditingTemplate(template);
  };

  const closeEdit = React.useCallback(
    (force = false) => {
      if (!force && hasUnsavedChanges) {
        const shouldDiscard = window.confirm(
          t('sparkery.dispatch.recurringTemplates.workflow.confirmLeave', {
            defaultValue:
              'You have unsaved changes. Discard draft and close editor?',
          })
        );
        if (!shouldDiscard) {
          return;
        }
      }
      clearDraftTimer();
      if (editingTemplate) {
        safeRemoveTemplateDraft(editingTemplate.id);
      }
      setEditingTemplate(null);
      setEditStep(0);
      setCompletionTemplateName('');
      setValidationSummary([]);
      setValidationHints([]);
      setHasUnsavedChanges(false);
      setDraftStatus('saved');
      form.resetFields();
    },
    [clearDraftTimer, editingTemplate, form, hasUnsavedChanges, t]
  );

  useBrowserRouterBlocker(
    Boolean(editingTemplate && hasUnsavedChanges),
    transition => {
      const shouldDiscard = window.confirm(
        t('sparkery.dispatch.recurringTemplates.workflow.confirmLeave', {
          defaultValue: 'You have unsaved changes. Leave this page anyway?',
        })
      );
      if (!shouldDiscard) {
        return;
      }
      closeEdit(true);
      transition.retry();
    }
  );

  const handleFormValuesChange = React.useCallback(
    (_: unknown, allValues: UpsertDispatchCustomerProfilePayload) => {
      if (!editingTemplate) {
        return;
      }
      const snapshot = normalizeTemplateSnapshot(allValues);
      const dirty = snapshot !== initialSnapshotRef.current;
      setHasUnsavedChanges(dirty);
      if (!dirty) {
        clearDraftTimer();
        safeRemoveTemplateDraft(editingTemplate.id);
        setDraftStatus('saved');
        return;
      }
      setDraftStatus('unsaved');
      clearDraftTimer();
      draftTimerRef.current = setTimeout(() => {
        setDraftStatus('saving');
        safeWriteTemplateDraft(editingTemplate.id, allValues);
        setDraftStatus('saved');
      }, TEMPLATE_DRAFT_DEBOUNCE_MS);
    },
    [clearDraftTimer, editingTemplate]
  );

  const validationFixMap = React.useMemo<
    Record<
      string,
      {
        fix: string;
        severity: TemplateValidationSeverity;
      }
    >
  >(
    () => ({
      name: {
        fix: t('sparkery.dispatch.recurringTemplates.workflow.fix.customerName', {
          defaultValue: 'Add a customer-friendly template name.',
        }),
        severity: 'error',
      },
      recurringWeekdays: {
        fix: t('sparkery.dispatch.recurringTemplates.workflow.fix.weekdays', {
          defaultValue: 'Select at least one weekday for recurring scheduling.',
        }),
        severity: 'error',
      },
      recurringStartTime: {
        fix: t('sparkery.dispatch.recurringTemplates.workflow.fix.startTime', {
          defaultValue: 'Use HH:mm format, e.g. 09:00.',
        }),
        severity: 'warning',
      },
      recurringEndTime: {
        fix: t('sparkery.dispatch.recurringTemplates.workflow.fix.endTime', {
          defaultValue: 'Set a valid end time after start time.',
        }),
        severity: 'warning',
      },
      recurringServiceType: {
        fix: t('sparkery.dispatch.recurringTemplates.workflow.fix.serviceType', {
          defaultValue: 'Pick one service type for cleaner prep and reporting.',
        }),
        severity: 'warning',
      },
    }),
    [t]
  );

  const refreshValidationSummary = React.useCallback(() => {
    const fieldErrors = form.getFieldsError().filter(item => item.errors.length > 0);
    const hints: TemplateValidationHint[] = fieldErrors.map(item => {
      const fieldName = String(item.name?.[0] || 'unknown');
      const matchedFix = validationFixMap[fieldName];
      return {
        field: fieldName,
        message: item.errors[0] || '',
        fix:
          matchedFix?.fix ||
          t('sparkery.dispatch.recurringTemplates.workflow.fix.generic', {
            defaultValue: 'Please review this field and provide a valid value.',
          }),
        severity: matchedFix?.severity || 'warning',
      };
    });
    setValidationHints(hints);
    setValidationSummary(Array.from(new Set(hints.map(item => item.message))));
  }, [form, t, validationFixMap]);

  const renderInlineValidationHint = React.useCallback(
    (
      fieldName: keyof UpsertDispatchCustomerProfilePayload,
      fallbackFix: string,
      severity: TemplateValidationSeverity = 'warning'
    ) => (
      <Form.Item noStyle shouldUpdate>
        {() => {
          const errors = form.getFieldError(fieldName);
          if (!errors.length) {
            return null;
          }
          return (
            <Alert
              className='dispatch-recurring-inline-hint'
              type={severity === 'error' ? 'error' : 'warning'}
              showIcon
              message={errors[0]}
              description={fallbackFix}
            />
          );
        }}
      </Form.Item>
    ),
    [form]
  );

  const handleStepNext = React.useCallback(async () => {
    const currentStep = editSteps[editStep];
    if (!currentStep) {
      return;
    }
    try {
      if (currentStep.fields.length > 0) {
        await form.validateFields(currentStep.fields);
      }
      setValidationSummary([]);
      setValidationHints([]);
      setEditStep(prev => Math.min(prev + 1, editSteps.length - 1));
    } catch {
      refreshValidationSummary();
    }
  }, [editStep, editSteps, form, refreshValidationSummary]);

  const handleSaveTemplate = async (
    values: UpsertDispatchCustomerProfilePayload
  ) => {
    const weekdays = Array.isArray(values.recurringWeekdays)
      ? values.recurringWeekdays
      : values.recurringWeekday
        ? [values.recurringWeekday]
        : [];
    const normalizedWeekdays = Array.from(new Set(weekdays)).sort(
      (a, b) => a - b
    ) as DispatchWeekday[];
    const payload: UpsertDispatchCustomerProfilePayload = {
      ...values,
      recurringEnabled:
        typeof values.recurringEnabled === 'boolean'
          ? values.recurringEnabled
          : true,
      recurringWeekdays: normalizedWeekdays,
    };
    const firstWeekday = normalizedWeekdays[0];
    if (firstWeekday) {
      payload.recurringWeekday = firstWeekday;
    }
    if (
      typeof payload.recurringFee === 'number' &&
      Number.isFinite(payload.recurringFee)
    ) {
      payload.recurringFee = Number(payload.recurringFee.toFixed(2));
    }

    setSavingTemplate(true);
    const result = await dispatch(upsertDispatchCustomerProfile(payload));
    setSavingTemplate(false);
    if (upsertDispatchCustomerProfile.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.recurringTemplates.messages.templateUpdated')
      );
      if (editingTemplate) {
        safeRemoveTemplateDraft(editingTemplate.id);
      }
      initialSnapshotRef.current = normalizeTemplateSnapshot(payload);
      clearDraftTimer();
      setHasUnsavedChanges(false);
      setDraftStatus('saved');
      setValidationSummary([]);
      setValidationHints([]);
      setCompletionTemplateName(values.name || editingTemplate?.name || '');
      setEditStep(editSteps.length - 1);
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.templateUpdateFailed')
      )
    );
  };

  const handleQuickSaveFee = async (template: DispatchCustomerProfile) => {
    const feeValue = feeDrafts[template.id];
    const normalizedFee =
      typeof feeValue === 'number' && Number.isFinite(feeValue)
        ? Number(feeValue.toFixed(2))
        : 0;
    const currentFee = Number((template.recurringFee || 0).toFixed(2));
    if (normalizedFee === currentFee) {
      message.info(
        t('sparkery.dispatch.recurringTemplates.messages.feeUnchanged')
      );
      return;
    }

    setSavingFeeId(template.id);
    const result = await dispatch(
      upsertDispatchCustomerProfile(
        profileToPayload(template, {
          recurringFee: normalizedFee,
        })
      )
    );
    setSavingFeeId(null);
    if (upsertDispatchCustomerProfile.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.recurringTemplates.messages.fixedFeeUpdated', {
          amount: normalizedFee.toFixed(2),
        })
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.saveFixedFeeFailed')
      )
    );
  };

  const columns: TableColumnsType<DispatchCustomerProfile> = [
    {
      title: t('sparkery.dispatch.recurringTemplates.table.customer'),
      dataIndex: 'name',
      key: 'customer',
      render: (_, record) => (
        <Space
          direction='vertical'
          size={0}
          className='dispatch-recurring-customer-cell'
        >
          <Text strong className='dispatch-recurring-customer-name'>
            {record.name}
          </Text>
          <Text
            type='secondary'
            className='dispatch-muted-text dispatch-recurring-customer-address'
          >
            {record.address || t('sparkery.dispatch.common.noAddress')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.weekdays'),
      key: 'weekdays',
      width: 180,
      render: (_, record) =>
        formatWeekdayTags(
          normalizeRecurringWeekdays(record),
          resolveWeekdayLabel,
          t('sparkery.dispatch.recurringTemplates.notSet')
        ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.time'),
      key: 'time',
      width: 140,
      render: (_, record) => (
        <Text className='dispatch-recurring-time-text'>
          {record.recurringStartTime || '--:--'} -{' '}
          {record.recurringEndTime || '--:--'}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.service'),
      dataIndex: 'recurringServiceType',
      key: 'service',
      width: 130,
      render: (_, record) => (
        <Tag className='dispatch-recurring-service-tag'>
          {t(
            `sparkery.dispatch.common.serviceType.${record.recurringServiceType || 'regular'}`
          )}
        </Tag>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.priority'),
      dataIndex: 'recurringPriority',
      key: 'priority',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Text className='dispatch-recurring-priority-text'>
          {record.recurringPriority || 3}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.fixedFeeAud'),
      key: 'fee',
      width: 240,
      render: (_, record) => (
        <Space className='dispatch-recurring-fee-cell' size={8}>
          <InputNumber
            className='dispatch-recurring-fee-input'
            min={0}
            precision={2}
            value={feeDrafts[record.id] ?? 0}
            onChange={value =>
              setFeeDrafts(prev => ({
                ...prev,
                [record.id]: typeof value === 'number' ? value : null,
              }))
            }
          />
          <Button
            size='small'
            className='dispatch-recurring-save-btn'
            loading={savingFeeId === record.id}
            onClick={() => handleQuickSaveFee(record)}
          >
            {t('sparkery.dispatch.recurringTemplates.actions.save')}
          </Button>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.actions'),
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button
          size='small'
          className='dispatch-recurring-edit-btn'
          onClick={() => openEdit(record)}
        >
          {t('sparkery.dispatch.recurringTemplates.actions.edit')}
        </Button>
      ),
    },
  ];

  const quickFilterColumns = React.useMemo(
    () => ({
      customer: {
        placeholder: t('sparkery.dispatch.recurringTemplates.filters.customer', {
          defaultValue: 'Filter customer or address',
        }),
        match: (record: DispatchCustomerProfile, query: string) =>
          `${record.name} ${record.address || ''}`
            .toLowerCase()
            .includes(query),
      },
      weekdays: {
        placeholder: t('sparkery.dispatch.recurringTemplates.filters.weekdays', {
          defaultValue: 'Filter weekdays',
        }),
        match: (record: DispatchCustomerProfile, query: string) =>
          normalizeRecurringWeekdays(record).some(day =>
            resolveWeekdayLabel(day).toLowerCase().includes(query)
          ),
      },
      service: {
        placeholder: t('sparkery.dispatch.recurringTemplates.filters.service', {
          defaultValue: 'Filter service type',
        }),
        match: (record: DispatchCustomerProfile, query: string) =>
          t(
            `sparkery.dispatch.common.serviceType.${record.recurringServiceType || 'regular'}`
          )
            .toLowerCase()
            .includes(query),
      },
      fee: false as const,
      actions: false as const,
    }),
    [resolveWeekdayLabel, t]
  );

  const draftStatusLabel = React.useMemo(() => {
    if (draftStatus === 'saving') {
      return t('sparkery.dispatch.recurringTemplates.workflow.draft.saving', {
        defaultValue: 'Saving draft...',
      });
    }
    if (draftStatus === 'unsaved') {
      return t('sparkery.dispatch.recurringTemplates.workflow.draft.unsaved', {
        defaultValue: 'Unsaved changes',
      });
    }
    return t('sparkery.dispatch.recurringTemplates.workflow.draft.saved', {
      defaultValue: 'Draft saved',
    });
  }, [draftStatus, t]);

  const draftStatusColor = React.useMemo(() => {
    if (draftStatus === 'saving') {
      return 'processing';
    }
    if (draftStatus === 'unsaved') {
      return 'warning';
    }
    return 'success';
  }, [draftStatus]);

  const applyReviewSuggestion = React.useCallback(
    (suggestionId: TemplateReviewSuggestionId) => {
      if (suggestionId === 'customer_name') {
        form.setFieldValue(
          'name',
          editingTemplate?.name || form.getFieldValue('name') || ''
        );
        setEditStep(0);
        return;
      }
      if (suggestionId === 'weekdays') {
        form.setFieldValue('recurringWeekdays', [1, 3, 5]);
        setEditStep(1);
        return;
      }
      if (suggestionId === 'time_window') {
        form.setFieldsValue({
          recurringStartTime: form.getFieldValue('recurringStartTime') || '09:00',
          recurringEndTime: form.getFieldValue('recurringEndTime') || '11:00',
        });
        setEditStep(1);
        return;
      }
      if (suggestionId === 'service_type') {
        form.setFieldValue(
          'recurringServiceType',
          form.getFieldValue('recurringServiceType') || 'regular'
        );
        setEditStep(1);
      }
    },
    [editingTemplate?.name, form]
  );

  const reviewChecks = React.useMemo(() => {
    const values = (formSnapshot || {}) as Partial<UpsertDispatchCustomerProfilePayload>;
    const weekdays = Array.isArray(values.recurringWeekdays)
      ? values.recurringWeekdays
      : values.recurringWeekday
        ? [values.recurringWeekday]
        : [];
    const recurringOn =
      typeof values.recurringEnabled === 'boolean' ? values.recurringEnabled : true;
    const hasStart = Boolean(values.recurringStartTime);
    const hasEnd = Boolean(values.recurringEndTime);
    const hasService = Boolean(values.recurringServiceType);
    const defaultTitle = values.defaultJobTitle?.trim() || '';
    const checks: TemplateReviewCheck[] = [
      {
        key: 'customer_name',
        label: t(
          'sparkery.dispatch.recurringTemplates.workflow.review.customerName',
          {
            defaultValue: 'Customer Name',
          }
        ),
        value: values.name?.trim() || '--',
        score: values.name?.trim() ? 1 : 0.1,
        reason: values.name?.trim()
          ? undefined
          : t(
              'sparkery.dispatch.recurringTemplates.workflow.review.reason.customerName',
              {
                defaultValue: 'Missing required customer identifier.',
              }
            ),
        suggestionId: values.name?.trim() ? undefined : 'customer_name',
      },
      {
        key: 'weekdays',
        label: t('sparkery.dispatch.recurringTemplates.form.weekdays'),
        value:
          weekdays.length > 0
            ? weekdays.map(day => resolveWeekdayLabel(day)).join(', ')
            : t('sparkery.dispatch.recurringTemplates.notSet'),
        score: recurringOn ? (weekdays.length > 0 ? 1 : 0.1) : 1,
        reason:
          recurringOn && weekdays.length === 0
            ? t(
                'sparkery.dispatch.recurringTemplates.workflow.review.reason.weekdays',
                {
                  defaultValue: 'No recurring weekdays selected.',
                }
              )
            : undefined,
        suggestionId:
          recurringOn && weekdays.length === 0 ? 'weekdays' : undefined,
      },
      {
        key: 'time_window',
        label: t(
          'sparkery.dispatch.recurringTemplates.workflow.review.timeWindow',
          {
            defaultValue: 'Time Window',
          }
        ),
        value:
          hasStart && hasEnd
            ? `${values.recurringStartTime} - ${values.recurringEndTime}`
            : '--',
        score: hasStart && hasEnd ? 1 : hasStart || hasEnd ? 0.6 : 0.2,
        reason:
          hasStart && hasEnd
            ? undefined
            : t(
                'sparkery.dispatch.recurringTemplates.workflow.review.reason.timeWindow',
                {
                  defaultValue: 'Set both start and end time for scheduling.',
                }
              ),
        suggestionId: hasStart && hasEnd ? undefined : 'time_window',
      },
      {
        key: 'service_type',
        label: t('sparkery.dispatch.recurringTemplates.form.serviceType'),
        value: hasService
          ? t(
              `sparkery.dispatch.common.serviceType.${values.recurringServiceType || 'regular'}`
            )
          : '--',
        score: hasService ? 1 : 0.5,
        reason: hasService
          ? undefined
          : t(
              'sparkery.dispatch.recurringTemplates.workflow.review.reason.serviceType',
              {
                defaultValue: 'Service type helps assignment and report consistency.',
              }
            ),
        suggestionId: hasService ? undefined : 'service_type',
      },
      {
        key: 'default_title',
        label: t(
          'sparkery.dispatch.recurringTemplates.form.defaultTaskTitle',
          {
            defaultValue: 'Default Task Title',
          }
        ),
        value: defaultTitle || t('sparkery.dispatch.recurringTemplates.notSet'),
        score: defaultTitle ? 1 : 0.75,
      },
    ];
    return checks;
  }, [formSnapshot, resolveWeekdayLabel, t]);

  const reviewConfidencePercent = React.useMemo(() => {
    if (reviewChecks.length === 0) {
      return 0;
    }
    const scoreSum = reviewChecks.reduce((sum, item) => sum + item.score, 0);
    return Math.round((scoreSum / reviewChecks.length) * 100);
  }, [reviewChecks]);

  const reviewConfidenceTone = React.useMemo(() => {
    if (reviewConfidencePercent >= 85) {
      return {
        color: 'success',
        label: t(
          'sparkery.dispatch.recurringTemplates.workflow.review.confidence.high',
          {
            defaultValue: 'High confidence',
          }
        ),
      };
    }
    if (reviewConfidencePercent >= 65) {
      return {
        color: 'processing',
        label: t(
          'sparkery.dispatch.recurringTemplates.workflow.review.confidence.medium',
          {
            defaultValue: 'Medium confidence',
          }
        ),
      };
    }
    return {
      color: 'warning',
      label: t(
        'sparkery.dispatch.recurringTemplates.workflow.review.confidence.low',
        {
          defaultValue: 'Low confidence',
        }
      ),
    };
  }, [reviewConfidencePercent, t]);

  const currentStep = editSteps[editStep];
  const isReviewStep = currentStep?.key === 'review';
  const isCompletionStep = currentStep?.key === 'complete';
  const enablePrevious = editStep > 0 && !isCompletionStep;
  const canGoNext = editStep < editSteps.length - 2;

  const suggestionLabels: Record<TemplateReviewSuggestionId, string> = {
    customer_name: t(
      'sparkery.dispatch.recurringTemplates.workflow.review.fix.customerName',
      {
        defaultValue: 'Fill from template profile',
      }
    ),
    weekdays: t(
      'sparkery.dispatch.recurringTemplates.workflow.review.fix.weekdays',
      {
        defaultValue: 'Apply Mon/Wed/Fri preset',
      }
    ),
    time_window: t(
      'sparkery.dispatch.recurringTemplates.workflow.review.fix.timeWindow',
      {
        defaultValue: 'Apply 09:00-11:00 default',
      }
    ),
    service_type: t(
      'sparkery.dispatch.recurringTemplates.workflow.review.fix.serviceType',
      {
        defaultValue: 'Set Regular service',
      }
    ),
  };

  return (
    <div className='dispatch-dashboard-page dispatch-dashboard-shell'>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title level={4} className='dispatch-dashboard-title'>
            {t('sparkery.dispatch.recurringTemplates.title')}
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            {t('sparkery.dispatch.recurringTemplates.subtitle')}
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button onClick={() => navigate('/sparkery/dispatch')}>
            {t(
              'sparkery.dispatch.recurringTemplates.actions.openDispatchBoard'
            )}
          </Button>
          <Button onClick={() => navigate('/sparkery/finance')}>
            {t('sparkery.dispatch.recurringTemplates.actions.openFinancePanel')}
          </Button>
        </Space>
      </div>

      <Card
        size='small'
        className='dispatch-dashboard-section-card dispatch-recurring-week-card'
      >
        <Space wrap className='dispatch-recurring-week-bar'>
          <Text type='secondary' className='dispatch-recurring-week-label'>
            {t('sparkery.dispatch.filters.weekStart')}
          </Text>
          <Input
            type='date'
            className='dispatch-recurring-week-input'
            value={selectedWeekStart}
            onChange={event => {
              const nextWeekStart = event.target.value;
              if (!nextWeekStart) {
                return;
              }
              dispatch(setSelectedWeekStart(nextWeekStart));
            }}
          />
          <Button onClick={handleRefresh}>
            {t('sparkery.dispatch.recurringTemplates.actions.refreshTemplates')}
          </Button>
          <Button type='primary' loading={autoFilling} onClick={handleAutoFill}>
            {t('sparkery.dispatch.recurringTemplates.actions.autoFillThisWeek')}
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          className='dispatch-dashboard-alert'
          type='error'
          message={error}
          closable
          onClose={() => dispatch(clearDispatchError())}
        />
      )}

      <Card
        size='small'
        title={t('sparkery.dispatch.recurringTemplates.tableTitle', {
          count: templates.length,
        })}
        className='dispatch-recurring-table-card'
      >
        <SparkeryDataTable<DispatchCustomerProfile>
          tableId='dispatch-recurring-templates'
          rowKey='id'
          size='small'
          className='dispatch-recurring-table'
          loading={Boolean(isLoading)}
          pagination={{ pageSize: 10 }}
          onRowOpen={openEdit}
          showQuickFilterRow
          showSortBuilder
          quickFilterColumns={quickFilterColumns}
          columns={columns}
          dataSource={templates}
          scroll={{ x: 1050 }}
        />
      </Card>

      <Modal
        title={
          editingTemplate
            ? t(
                'sparkery.dispatch.recurringTemplates.modal.editTitleWithName',
                {
                  name: editingTemplate.name,
                }
              )
            : t('sparkery.dispatch.recurringTemplates.modal.editTitle')
        }
        open={Boolean(editingTemplate)}
        onCancel={() => closeEdit()}
        footer={[
          <Button key='cancel' onClick={() => closeEdit()}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>,
          enablePrevious ? (
            <Button key='previous' onClick={() => setEditStep(prev => prev - 1)}>
              {t('sparkery.dispatch.recurringTemplates.workflow.previous', {
                defaultValue: 'Previous',
              })}
            </Button>
          ) : null,
          canGoNext ? (
            <Button key='next' type='primary' onClick={() => void handleStepNext()}>
              {t('sparkery.dispatch.recurringTemplates.workflow.next', {
                defaultValue: 'Next',
              })}
            </Button>
          ) : isReviewStep ? (
            <Button
              key='save'
              type='primary'
              loading={savingTemplate}
              onClick={() => form.submit()}
            >
              {t('sparkery.dispatch.recurringTemplates.actions.save', {
                defaultValue: 'Save',
              })}
            </Button>
          ) : isCompletionStep ? (
            <Button
              key='autofill'
              loading={autoFilling}
              onClick={() => void handleAutoFill()}
            >
              {t('sparkery.dispatch.recurringTemplates.actions.autoFillThisWeek')}
            </Button>
          ) : null,
          isCompletionStep ? (
            <Button key='dispatch' onClick={() => navigate('/sparkery/dispatch')}>
              {t('sparkery.dispatch.recurringTemplates.actions.openDispatchBoard')}
            </Button>
          ) : null,
          isCompletionStep ? (
            <Button key='done' type='primary' onClick={() => closeEdit(true)}>
              {t('common.done', { defaultValue: 'Done' })}
            </Button>
          ) : null,
        ].filter(Boolean)}
        destroyOnHidden
        width={760}
      >
        <Space direction='vertical' className='dispatch-recurring-workflow-shell'>
          <Steps
            size='small'
            current={editStep}
            items={editSteps.map(step => ({ title: step.title }))}
            aria-label={t(
              'sparkery.dispatch.recurringTemplates.workflow.stepsLabel',
              {
                defaultValue: 'Recurring template edit steps',
              }
            )}
          />
          <Space wrap className='dispatch-recurring-workflow-meta'>
            <Tag color={draftStatusColor}>{draftStatusLabel}</Tag>
            {hasUnsavedChanges && (
              <Tag color='warning'>
                {t('sparkery.dispatch.recurringTemplates.workflow.unsavedHint', {
                  defaultValue: 'Unsaved changes in this draft',
                })}
              </Tag>
            )}
          </Space>
          {validationSummary.length > 0 && (
            <Alert
              type={
                validationHints.some(item => item.severity === 'error')
                  ? 'error'
                  : 'warning'
              }
              role='alert'
              showIcon
              message={t(
                'sparkery.dispatch.recurringTemplates.workflow.validationSummaryTitle',
                {
                  defaultValue: 'Please fix the following before continuing',
                }
              )}
              description={
                <Space direction='vertical' size={2}>
                  {validationHints.map((item, index) => (
                    <Text key={`${item.field}-${index}`} className='dispatch-muted-text'>
                      {item.message} | {item.fix}
                    </Text>
                  ))}
                </Space>
              }
            />
          )}
          <Form
            form={form}
            layout='vertical'
            onFinish={handleSaveTemplate}
            onValuesChange={handleFormValuesChange}
            onFieldsChange={refreshValidationSummary}
            initialValues={{
              recurringEnabled: true,
              recurringWeekdays: [1],
              recurringServiceType: 'regular',
              recurringPriority: 3,
              recurringFee: 0,
              recurringStartTime: '09:00',
              recurringEndTime: '11:00',
            }}
          >
            <Form.Item name='id' hidden>
              <Input />
            </Form.Item>
            {currentStep?.key === 'profile' && (
              <>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.customerName')}
                  name='name'
                  rules={[{ required: true }]}
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.customerName',
                    {
                      defaultValue:
                        'Use the billing or contact name your team recognizes quickly.',
                    }
                  )}
                >
                  <Input />
                </Form.Item>
                {renderInlineValidationHint(
                  'name',
                  t('sparkery.dispatch.recurringTemplates.workflow.fix.customerName', {
                    defaultValue:
                      'Use a customer or property name that dispatch can identify quickly.',
                  }),
                  'error'
                )}
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.address')}
                  name='address'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.address',
                    {
                      defaultValue: 'Example: 12 Queen St, Brisbane QLD 4000',
                    }
                  )}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.phone')}
                  name='phone'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.phone',
                    {
                      defaultValue: 'Example: 04xx xxx xxx (optional but useful).',
                    }
                  )}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label={t(
                    'sparkery.dispatch.recurringTemplates.form.recurringEnabled'
                  )}
                  name='recurringEnabled'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.recurringEnabled',
                    {
                      defaultValue:
                        'Disable only when you want to pause auto-generation temporarily.',
                    }
                  )}
                >
                  <Select>
                    <Select.Option value={true}>
                      {t('sparkery.dispatch.common.enabled')}
                    </Select.Option>
                    <Select.Option value={false}>
                      {t('sparkery.dispatch.common.disabled')}
                    </Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}
            {currentStep?.key === 'schedule' && (
              <>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.weekdays')}
                  name='recurringWeekdays'
                  rules={[
                    {
                      validator(_, value) {
                        if (!recurringEnabled) {
                          return Promise.resolve();
                        }
                        if (Array.isArray(value) && value.length > 0) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(
                            t(
                              'sparkery.dispatch.recurringTemplates.messages.chooseAtLeastOneWeekday'
                            )
                          )
                        );
                      },
                    },
                  ]}
                >
                  <Select
                    mode='multiple'
                    maxTagCount={4}
                    options={weekdaySelectOptions}
                    placeholder={t(
                      'sparkery.dispatch.recurringTemplates.form.weekdaysPlaceholder'
                    )}
                  />
                </Form.Item>
                {renderInlineValidationHint(
                  'recurringWeekdays',
                  t('sparkery.dispatch.recurringTemplates.workflow.fix.weekdays', {
                    defaultValue:
                      'Choose recurring weekdays so weekly auto-fill can schedule tasks.',
                  }),
                  'error'
                )}
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.startTime')}
                  name='recurringStartTime'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.startTime',
                    {
                      defaultValue: 'Example: 09:00',
                    }
                  )}
                >
                  <Input type='time' />
                </Form.Item>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.endTime')}
                  name='recurringEndTime'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.endTime',
                    {
                      defaultValue: 'Example: 11:00',
                    }
                  )}
                >
                  <Input type='time' />
                </Form.Item>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.serviceType')}
                  name='recurringServiceType'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.serviceType',
                    {
                      defaultValue:
                        'Pick the most common service type for this recurring customer.',
                    }
                  )}
                >
                  <Select>
                    <Select.Option value='bond'>
                      {t('sparkery.dispatch.common.serviceType.bond')}
                    </Select.Option>
                    <Select.Option value='airbnb'>
                      {t('sparkery.dispatch.common.serviceType.airbnb')}
                    </Select.Option>
                    <Select.Option value='regular'>
                      {t('sparkery.dispatch.common.serviceType.regular')}
                    </Select.Option>
                    <Select.Option value='commercial'>
                      {t('sparkery.dispatch.common.serviceType.commercial')}
                    </Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label={t('sparkery.dispatch.recurringTemplates.form.priority')}
                  name='recurringPriority'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.priority',
                    {
                      defaultValue: '1 is highest priority; 5 is lowest.',
                    }
                  )}
                >
                  <Select>
                    <Select.Option value={1}>1</Select.Option>
                    <Select.Option value={2}>2</Select.Option>
                    <Select.Option value={3}>3</Select.Option>
                    <Select.Option value={4}>4</Select.Option>
                    <Select.Option value={5}>5</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label={t(
                    'sparkery.dispatch.recurringTemplates.form.recurringFixedFeeAud'
                  )}
                  name='recurringFee'
                  extra={t(
                    'sparkery.dispatch.recurringTemplates.workflow.helper.recurringFee',
                    {
                      defaultValue:
                        'This fixed fee auto-fills weekly receivable before manual adjustment.',
                    }
                  )}
                >
                  <InputNumber
                    className='dispatch-form-number-full-width'
                    min={0}
                    precision={2}
                  />
                </Form.Item>
              </>
            )}
            {currentStep?.key === 'defaults' && (
              <Collapse
                defaultActiveKey={[]}
                items={[
                  {
                    key: 'optional_defaults',
                    label: t(
                      'sparkery.dispatch.recurringTemplates.workflow.optionalDefaults',
                      {
                        defaultValue: 'Optional Default Task Content',
                      }
                    ),
                    children: (
                      <Space
                        direction='vertical'
                        className='dispatch-recurring-optional-shell'
                      >
                        <Form.Item
                          label={t(
                            'sparkery.dispatch.recurringTemplates.form.defaultTaskTitle'
                          )}
                          name='defaultJobTitle'
                          extra={t(
                            'sparkery.dispatch.recurringTemplates.workflow.helper.defaultTitle',
                            {
                              defaultValue:
                                'Example: Weekly regular clean (kitchen + bathrooms).',
                            }
                          )}
                        >
                          <Input />
                        </Form.Item>
                        <Form.Item
                          label={t(
                            'sparkery.dispatch.recurringTemplates.form.defaultTaskDescription'
                          )}
                          name='defaultDescription'
                          extra={t(
                            'sparkery.dispatch.recurringTemplates.workflow.helper.defaultDescription',
                            {
                              defaultValue:
                                'Add scope notes cleaners should always follow.',
                            }
                          )}
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item
                          label={t(
                            'sparkery.dispatch.recurringTemplates.form.defaultNotes'
                          )}
                          name='defaultNotes'
                        >
                          <Input.TextArea rows={3} />
                        </Form.Item>
                      </Space>
                    ),
                  },
                ]}
              />
            )}
            {currentStep?.key === 'review' && (
              <div className='dispatch-recurring-review-grid'>
                <Card
                  size='small'
                  title={t(
                    'sparkery.dispatch.recurringTemplates.workflow.review.auditTitle',
                    {
                      defaultValue: 'Readiness Audit',
                    }
                  )}
                >
                  <Space
                    direction='vertical'
                    className='dispatch-recurring-review-list'
                    role='list'
                    aria-label={t(
                      'sparkery.dispatch.recurringTemplates.workflow.review.auditTitle',
                      {
                        defaultValue: 'Readiness Audit',
                      }
                    )}
                  >
                    {reviewChecks.map(check => {
                      const statusTag =
                        check.score >= 0.95
                          ? { color: 'success', label: 'High' }
                          : check.score >= 0.7
                            ? { color: 'processing', label: 'Medium' }
                            : check.score >= 0.4
                              ? { color: 'warning', label: 'Low' }
                              : { color: 'error', label: 'Missing' };
                      return (
                        <div
                          key={check.key}
                          className='dispatch-recurring-review-item'
                          role='listitem'
                        >
                          <Space
                            wrap
                            className='dispatch-recurring-review-item-header'
                          >
                            <Text strong>{check.label}</Text>
                            <Tag color={statusTag.color}>{statusTag.label}</Tag>
                          </Space>
                          <Text className='dispatch-recurring-review-value'>
                            {check.value}
                          </Text>
                          {check.reason && (
                            <Text
                              type='secondary'
                              className='dispatch-recurring-review-reason'
                            >
                              {check.reason}
                            </Text>
                          )}
                          {check.suggestionId && (
                            <Button
                              size='small'
                              onClick={() =>
                                applyReviewSuggestion(check.suggestionId as TemplateReviewSuggestionId)
                              }
                              aria-label={`${check.label}: ${suggestionLabels[check.suggestionId]}`}
                            >
                              {suggestionLabels[check.suggestionId]}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </Space>
                </Card>
                <Card
                  size='small'
                  title={t(
                    'sparkery.dispatch.recurringTemplates.workflow.review.previewTitle',
                    {
                      defaultValue: 'Preview',
                    }
                  )}
                >
                  <Space direction='vertical' className='dispatch-recurring-preview-shell'>
                    <Space
                      wrap
                      className='dispatch-recurring-review-confidence-row'
                    >
                      <Tag color={reviewConfidenceTone.color}>
                        {reviewConfidenceTone.label}
                      </Tag>
                      <Text type='secondary'>
                        {t(
                          'sparkery.dispatch.recurringTemplates.workflow.review.confidencePercent',
                          {
                            defaultValue: '{{percent}}% profile readiness',
                            percent: reviewConfidencePercent,
                          }
                        )}
                      </Text>
                    </Space>
                    <Progress
                      size='small'
                      percent={reviewConfidencePercent}
                      aria-label={t(
                        'sparkery.dispatch.recurringTemplates.workflow.review.confidencePercent',
                        {
                          defaultValue: '{{percent}}% profile readiness',
                          percent: reviewConfidencePercent,
                        }
                      )}
                      status={
                        reviewConfidencePercent >= 85
                          ? 'success'
                          : reviewConfidencePercent >= 65
                            ? 'active'
                            : 'exception'
                      }
                    />
                    <div className='dispatch-recurring-preview-paper'>
                      <Text strong className='dispatch-recurring-preview-title'>
                        {formSnapshot?.defaultJobTitle ||
                          formSnapshot?.name ||
                          t('sparkery.dispatch.recurringTemplates.notSet')}
                      </Text>
                      <Text className='dispatch-recurring-preview-line'>
                        {t(
                          'sparkery.dispatch.recurringTemplates.workflow.review.previewCustomer',
                          {
                            defaultValue: 'Customer: {{name}}',
                            name: formSnapshot?.name || '--',
                          }
                        )}
                      </Text>
                      <Text className='dispatch-recurring-preview-line'>
                        {t(
                          'sparkery.dispatch.recurringTemplates.workflow.review.previewSchedule',
                          {
                            defaultValue: 'Schedule: {{days}} | {{start}}-{{end}}',
                            days: Array.isArray(formSnapshot?.recurringWeekdays)
                              ? formSnapshot.recurringWeekdays
                                  .map(day => resolveWeekdayLabel(day))
                                  .join(', ')
                              : '--',
                            start: formSnapshot?.recurringStartTime || '--',
                            end: formSnapshot?.recurringEndTime || '--',
                          }
                        )}
                      </Text>
                      <Text className='dispatch-recurring-preview-line'>
                        {t(
                          'sparkery.dispatch.recurringTemplates.workflow.review.previewFee',
                          {
                            defaultValue: 'Fixed fee: AUD {{fee}}',
                            fee:
                              typeof formSnapshot?.recurringFee === 'number'
                                ? formSnapshot.recurringFee.toFixed(2)
                                : '0.00',
                          }
                        )}
                      </Text>
                      {formSnapshot?.defaultDescription && (
                        <Text className='dispatch-recurring-preview-line'>
                          {formSnapshot.defaultDescription}
                        </Text>
                      )}
                    </div>
                  </Space>
                </Card>
              </div>
            )}
            {currentStep?.key === 'complete' && (
              <Alert
                type='success'
                showIcon
                role='status'
                message={t(
                  'sparkery.dispatch.recurringTemplates.workflow.complete.title',
                  {
                    defaultValue: 'Template Updated',
                  }
                )}
                description={
                  <Space direction='vertical' size={4}>
                    <Text>
                      {t(
                        'sparkery.dispatch.recurringTemplates.workflow.complete.desc',
                        {
                          defaultValue:
                            '{{name}} is saved. Choose a recommended next action from the footer.',
                          name: completionTemplateName || editingTemplate?.name || '--',
                        }
                      )}
                    </Text>
                    <Text type='secondary'>
                      {t(
                        'sparkery.dispatch.recurringTemplates.workflow.complete.next1',
                        {
                          defaultValue:
                            '1) Auto-fill this week to generate tasks from the latest defaults.',
                        }
                      )}
                    </Text>
                    <Text type='secondary'>
                      {t(
                        'sparkery.dispatch.recurringTemplates.workflow.complete.next2',
                        {
                          defaultValue:
                            '2) Open Dispatch Board to verify assignments and timing.',
                        }
                      )}
                    </Text>
                  </Space>
                }
              />
            )}
          </Form>
        </Space>
      </Modal>
    </div>
  );
};

export default DispatchRecurringTemplatesPage;
