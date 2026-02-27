import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Descriptions,
  Input,
  Select,
  Row,
  Col,
  message,
  notification,
  Popconfirm,
  Statistic,
  type TableColumnsType,
} from 'antd';
import {
  ClockCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  GlobalOutlined,
  EditOutlined,
  MailOutlined,
  MessageOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useQuoteDraft, type QuoteDraftData } from './quoteDraftContext';
import SparkeryDataTable from '@/components/sparkery/SparkeryDataTable';
import {
  listSubmissions,
  updateSubmission,
  deleteSubmission as deleteSubmissionFromCloud,
  type BondQuoteStatus,
} from '@/services/bondQuoteSubmissionService';
import './sparkery.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface QuoteSubmission {
  id: string;
  submittedAt: string;
  formType: string;
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: string;
  houseLevel?: 'single' | 'double';
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;
  preferredDate: string;
  additionalNotes: string;
  isSparkeryNewCustomer?: boolean;
  followUp24hSentAt?: string;
  followUp72hSentAt?: string;
  followUpLastMessage?: string;
  status:
    | 'new'
    | 'contacted'
    | 'quoted'
    | 'confirmed'
    | 'completed'
    | 'cancelled';
}

type FollowUpStep = 'first' | 'second';
type TranslateFn = TFunction;

interface BatchStatusSnapshot {
  key: string;
  nextStatus: QuoteSubmission['status'];
  rows: Array<{
    id: string;
    previousStatus: QuoteSubmission['status'];
  }>;
}

type AdvancedRuleField =
  | 'customer'
  | 'contact'
  | 'address'
  | 'status'
  | 'follow_up';
type AdvancedRuleOperator =
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'is_empty'
  | 'is_not_empty';

interface AdvancedFilterRule {
  id: string;
  field: AdvancedRuleField;
  operator: AdvancedRuleOperator;
  value: string;
}

interface FollowUpMeta {
  stageLabel: string;
  stageColor: string;
  dueText: string;
  dueTone: 'default' | 'warning' | 'danger';
  dueAt?: string;
  nextStep: FollowUpStep | null;
  isOverdue: boolean;
}

const ACTIVE_FOLLOW_UP_STATUSES: BondQuoteStatus[] = [
  'new',
  'contacted',
  'quoted',
];

const normalizeSubmission = (row: QuoteSubmission): QuoteSubmission => ({
  ...row,
  status: row.status || 'new',
});

const formatDurationFromMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const days = Math.floor(safeMinutes / (24 * 60));
  const hours = Math.floor((safeMinutes % (24 * 60)) / 60);
  const mins = safeMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const getFollowUpStepLabel = (step: FollowUpStep, t: TranslateFn): string =>
  step === 'first'
    ? t('sparkery.quoteSubmissions.followUp.step.first', {
        defaultValue: '24h',
      })
    : t('sparkery.quoteSubmissions.followUp.step.second', {
        defaultValue: '72h',
      });

const resolveDueMeta = (
  stageLabel: string,
  stageColor: string,
  nextStep: FollowUpStep,
  dueAt: dayjs.Dayjs,
  now: dayjs.Dayjs,
  t: TranslateFn
): FollowUpMeta => {
  const diffMinutes = dueAt.diff(now, 'minute');
  if (diffMinutes < 0) {
    return {
      stageLabel,
      stageColor,
      dueText: t('sparkery.quoteSubmissions.followUp.due.overdue', {
        defaultValue: 'Overdue by {{duration}}',
        duration: formatDurationFromMinutes(Math.abs(diffMinutes)),
      }),
      dueTone: 'danger',
      dueAt: dueAt.toISOString(),
      nextStep,
      isOverdue: true,
    };
  }
  if (diffMinutes <= 180) {
    return {
      stageLabel,
      stageColor,
      dueText: t('sparkery.quoteSubmissions.followUp.due.in', {
        defaultValue: 'Due in {{duration}}',
        duration: formatDurationFromMinutes(diffMinutes),
      }),
      dueTone: 'warning',
      dueAt: dueAt.toISOString(),
      nextStep,
      isOverdue: false,
    };
  }
  return {
    stageLabel,
    stageColor,
    dueText: t('sparkery.quoteSubmissions.followUp.due.in', {
      defaultValue: 'Due in {{duration}}',
      duration: formatDurationFromMinutes(diffMinutes),
    }),
    dueTone: 'default',
    dueAt: dueAt.toISOString(),
    nextStep,
    isOverdue: false,
  };
};

const getFollowUpMeta = (
  submission: QuoteSubmission,
  t: TranslateFn,
  now: dayjs.Dayjs = dayjs()
): FollowUpMeta => {
  if (!ACTIVE_FOLLOW_UP_STATUSES.includes(submission.status)) {
    return {
      stageLabel: t('sparkery.quoteSubmissions.followUp.stage.closed', {
        defaultValue: 'Closed',
      }),
      stageColor: 'default',
      dueText: t('sparkery.quoteSubmissions.followUp.due.none', {
        defaultValue: 'No follow-up required',
      }),
      dueTone: 'default',
      nextStep: null,
      isOverdue: false,
    };
  }

  const submittedAt = dayjs(submission.submittedAt);
  if (!submission.followUp24hSentAt) {
    return resolveDueMeta(
      t('sparkery.quoteSubmissions.followUp.stage.first', {
        defaultValue: '24h follow-up',
      }),
      'gold',
      'first',
      submittedAt.add(24, 'hour'),
      now,
      t
    );
  }
  if (!submission.followUp72hSentAt) {
    return resolveDueMeta(
      t('sparkery.quoteSubmissions.followUp.stage.second', {
        defaultValue: '72h follow-up',
      }),
      'purple',
      'second',
      submittedAt.add(72, 'hour'),
      now,
      t
    );
  }

  return {
    stageLabel: t('sparkery.quoteSubmissions.followUp.stage.done', {
      defaultValue: 'Follow-up done',
    }),
    stageColor: 'green',
    dueText: t('sparkery.quoteSubmissions.followUp.due.done', {
      defaultValue: 'All reminders sent',
    }),
    dueTone: 'default',
    nextStep: null,
    isOverdue: false,
  };
};

const buildFollowUpMessage = (
  submission: QuoteSubmission,
  step: FollowUpStep,
  t: TranslateFn
): string => {
  const customerName =
    submission.customerName ||
    t('sparkery.quoteSubmissions.followUp.message.genericCustomer', {
      defaultValue: 'there',
    });
  const followUpLine =
    step === 'first'
      ? t('sparkery.quoteSubmissions.followUp.message.firstLine', {
          defaultValue: 'Just checking in on your bond cleaning quote request.',
        })
      : t('sparkery.quoteSubmissions.followUp.message.secondLine', {
          defaultValue: 'Second follow-up on your bond cleaning quote request.',
        });

  return [
    t('sparkery.quoteSubmissions.followUp.message.greeting', {
      defaultValue: 'Hi {{name}},',
      name: customerName,
    }),
    followUpLine,
    t('sparkery.quoteSubmissions.followUp.message.property', {
      defaultValue: 'Property: {{address}}',
      address:
        submission.propertyAddress ||
        t('sparkery.quoteSubmissions.common.na', {
          defaultValue: 'N/A',
        }),
    }),
    t('sparkery.quoteSubmissions.followUp.message.offer', {
      defaultValue:
        'If you would like, we can finalize and send your quote today.',
    }),
    t('sparkery.quoteSubmissions.followUp.message.thanks', {
      defaultValue: 'Thanks,',
    }),
    t('sparkery.quoteSubmissions.followUp.message.signature', {
      defaultValue: 'Sparkery Cleaning Team',
    }),
  ].join('\n');
};

const buildEmailDraftLink = (
  submission: QuoteSubmission,
  step: FollowUpStep,
  t: TranslateFn
): string => {
  const subject =
    step === 'first'
      ? t('sparkery.quoteSubmissions.followUp.emailSubject.first', {
          defaultValue: 'Follow-up: Bond Cleaning Quote',
        })
      : t('sparkery.quoteSubmissions.followUp.emailSubject.second', {
          defaultValue: 'Second Follow-up: Bond Cleaning Quote',
        });
  const body = buildFollowUpMessage(submission, step, t);
  return `mailto:${encodeURIComponent(submission.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const buildSmsDraftLink = (
  submission: QuoteSubmission,
  step: FollowUpStep,
  t: TranslateFn
): string => {
  const phone = (submission.phone || '').replace(/\s+/g, '');
  const body = buildFollowUpMessage(submission, step, t);
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
};

const resolveAdvancedRuleFieldValue = (
  submission: QuoteSubmission,
  field: AdvancedRuleField,
  t: TranslateFn
): string => {
  if (field === 'customer') {
    return submission.customerName || '';
  }
  if (field === 'contact') {
    return `${submission.email || ''} ${submission.phone || ''}`.trim();
  }
  if (field === 'address') {
    return submission.propertyAddress || '';
  }
  if (field === 'status') {
    return submission.status || '';
  }
  const followUp = getFollowUpMeta(submission, t);
  return `${followUp.stageLabel} ${followUp.dueText}`.trim();
};

const matchAdvancedRule = (
  value: string,
  operator: AdvancedRuleOperator,
  query: string
): boolean => {
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (operator === 'is_empty') {
    return normalizedValue.length === 0;
  }
  if (operator === 'is_not_empty') {
    return normalizedValue.length > 0;
  }
  if (!normalizedQuery) {
    return true;
  }
  if (operator === 'equals') {
    return normalizedValue === normalizedQuery;
  }
  if (operator === 'starts_with') {
    return normalizedValue.startsWith(normalizedQuery);
  }
  return normalizedValue.includes(normalizedQuery);
};

const BondCleanQuoteSubmissions: React.FC = () => {
  const { t } = useTranslation();
  const { setDraftData, setActiveTab } = useQuoteDraft();
  const [submissions, setSubmissions] = useState<QuoteSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<QuoteSubmission | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  const [followUpSavingId, setFollowUpSavingId] = useState<string | null>(null);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>(
    []
  );
  const [batchStatusTarget, setBatchStatusTarget] =
    useState<QuoteSubmission['status']>('contacted');
  const [batchPreviewOpen, setBatchPreviewOpen] = useState(false);
  const [batchApplying, setBatchApplying] = useState(false);
  const [batchUndoing, setBatchUndoing] = useState(false);
  const [lastBatchSnapshot, setLastBatchSnapshot] =
    useState<BatchStatusSnapshot | null>(null);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilterMode, setAdvancedFilterMode] = useState<'and' | 'or'>(
    'and'
  );
  const [advancedRules, setAdvancedRules] = useState<AdvancedFilterRule[]>([]);

  const upsertSubmission = (updatedSubmission: QuoteSubmission): void => {
    setSubmissions(prev =>
      prev.map(submission =>
        submission.id === updatedSubmission.id ? updatedSubmission : submission
      )
    );
    setSelectedSubmission(prev =>
      prev?.id === updatedSubmission.id ? updatedSubmission : prev
    );
  };

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSubmissions();
      setSubmissions(
        rows.map(row => normalizeSubmission(row as QuoteSubmission))
      );
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.messages.loadFailed', {
          defaultValue: 'Failed to load submissions',
        })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSubmissions().catch(() => {
      // handled in loadSubmissions
    });
  }, [loadSubmissions]);

  // Update submission status
  const updateStatus = async (
    id: string,
    newStatus: QuoteSubmission['status']
  ) => {
    try {
      const updatedSubmission = await updateSubmission(id, {
        status: newStatus as BondQuoteStatus,
      });
      upsertSubmission(
        normalizeSubmission(updatedSubmission as QuoteSubmission)
      );
      message.success(
        t('sparkery.quoteSubmissions.messages.statusUpdated', {
          defaultValue: 'Status updated',
        })
      );
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.messages.statusUpdateFailed', {
          defaultValue: 'Failed to update status',
        })
      );
    }
  };

  const markFollowUpSent = async (
    submission: QuoteSubmission,
    step: FollowUpStep
  ) => {
    setFollowUpSavingId(submission.id);
    try {
      const nowIso = new Date().toISOString();
      const messageText = buildFollowUpMessage(submission, step, t);
      const patch =
        step === 'first'
          ? {
              followUp24hSentAt: nowIso,
              followUpLastMessage: messageText,
            }
          : {
              followUp72hSentAt: nowIso,
              followUpLastMessage: messageText,
            };
      const updatedSubmission = await updateSubmission(submission.id, patch);
      upsertSubmission(
        normalizeSubmission(updatedSubmission as QuoteSubmission)
      );
      message.success(
        t('sparkery.quoteSubmissions.messages.followUpMarkedSent', {
          defaultValue: 'Marked {{step}} follow-up as sent',
          step: getFollowUpStepLabel(step, t),
        })
      );
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.messages.followUpUpdateFailed', {
          defaultValue: 'Failed to update follow-up',
        })
      );
    } finally {
      setFollowUpSavingId(null);
    }
  };

  const copyFollowUpMessage = async (
    submission: QuoteSubmission,
    step: FollowUpStep
  ) => {
    const content = buildFollowUpMessage(submission, step, t);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(
          t('sparkery.quoteSubmissions.errors.clipboardUnavailable', {
            defaultValue: 'Clipboard unavailable',
          })
        );
      }
      await navigator.clipboard.writeText(content);
      message.success(
        t('sparkery.quoteSubmissions.messages.followUpCopied', {
          defaultValue: 'Follow-up message copied',
        })
      );
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.messages.followUpCopyFailed', {
          defaultValue: 'Failed to copy message',
        })
      );
    }
  };

  const openEmailDraft = (submission: QuoteSubmission, step: FollowUpStep) => {
    if (!submission.email) {
      message.warning(
        t('sparkery.quoteSubmissions.messages.noEmail', {
          defaultValue: 'This submission has no email address',
        })
      );
      return;
    }
    window.open(
      buildEmailDraftLink(submission, step, t),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const openSmsDraft = (submission: QuoteSubmission, step: FollowUpStep) => {
    if (!submission.phone) {
      message.warning(
        t('sparkery.quoteSubmissions.messages.noPhone', {
          defaultValue: 'This submission has no phone number',
        })
      );
      return;
    }
    window.open(
      buildSmsDraftLink(submission, step, t),
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Delete submission
  const deleteSubmission = async (id: string) => {
    try {
      await deleteSubmissionFromCloud(id);
      setSubmissions(prev => prev.filter(submission => submission.id !== id));
      message.success(
        t('sparkery.quoteSubmissions.messages.deleted', {
          defaultValue: 'Submission deleted',
        })
      );
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.messages.deleteFailed', {
          defaultValue: 'Failed to delete submission',
        })
      );
    }
  };

  const openSubmissionDetails = useCallback((submission: QuoteSubmission) => {
    setSelectedSubmission(submission);
    setDetailModalVisible(true);
  }, []);

  // Generate quote draft - pass data to calculator
  const generateQuoteDraft = (record: QuoteSubmission) => {
    const draft: QuoteDraftData = {
      customerName: record.customerName,
      email: record.email,
      phone: record.phone,
      propertyAddress: record.propertyAddress,
      propertyType: record.propertyType as 'apartment' | 'townhouse' | 'house',
      roomType: record.roomType,
      customRoomType: record.customRoomType || '',
      hasCarpet: record.hasCarpet,
      carpetRooms: record.carpetRooms,
      garage: record.garage,
      glassDoorWindowCount: record.glassDoorWindowCount,
      oven: record.oven,
      fridge: record.fridge,
      wallStainsCount: record.wallStainsCount,
      acFilterCount: record.acFilterCount,
      blindsCount: record.blindsCount,
      moldCount: record.moldCount,
      heavySoiling: record.heavySoiling,
      rubbishRemoval: record.rubbishRemoval,
      rubbishRemovalNotes: record.rubbishRemovalNotes || '',
      preferredDate: record.preferredDate,
      additionalNotes: record.additionalNotes,
      isSparkeryNewCustomer: record.isSparkeryNewCustomer || false,
    };
    // Only add houseLevel if it exists
    if (record.houseLevel) {
      draft.houseLevel = record.houseLevel;
    }
    setDraftData(draft);
    setActiveTab('quote-calculator');
    message.success(
      t('sparkery.quoteSubmissions.messages.quoteDraftLoaded', {
        defaultValue: 'Quote data loaded into calculator',
      })
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      t('sparkery.quoteSubmissions.export.id', { defaultValue: 'ID' }),
      t('sparkery.quoteSubmissions.export.submittedAt', {
        defaultValue: 'Submitted At',
      }),
      t('sparkery.quoteSubmissions.export.formType', {
        defaultValue: 'Form Type',
      }),
      t('sparkery.quoteSubmissions.export.customerName', {
        defaultValue: 'Customer Name',
      }),
      t('sparkery.quoteSubmissions.export.email', {
        defaultValue: 'Email',
      }),
      t('sparkery.quoteSubmissions.export.phone', {
        defaultValue: 'Phone',
      }),
      t('sparkery.quoteSubmissions.export.propertyAddress', {
        defaultValue: 'Property Address',
      }),
      t('sparkery.quoteSubmissions.export.propertyType', {
        defaultValue: 'Property Type',
      }),
      t('sparkery.quoteSubmissions.export.roomType', {
        defaultValue: 'Room Type',
      }),
      t('sparkery.quoteSubmissions.export.hasCarpet', {
        defaultValue: 'Has Carpet',
      }),
      t('sparkery.quoteSubmissions.export.carpetRooms', {
        defaultValue: 'Carpet Rooms',
      }),
      t('sparkery.quoteSubmissions.export.garage', { defaultValue: 'Garage' }),
      t('sparkery.quoteSubmissions.export.glassPanels', {
        defaultValue: 'Glass Panels',
      }),
      t('sparkery.quoteSubmissions.export.oven', { defaultValue: 'Oven' }),
      t('sparkery.quoteSubmissions.export.fridge', { defaultValue: 'Fridge' }),
      t('sparkery.quoteSubmissions.export.wallStains', {
        defaultValue: 'Wall Stains',
      }),
      t('sparkery.quoteSubmissions.export.acFilters', {
        defaultValue: 'AC Filters',
      }),
      t('sparkery.quoteSubmissions.export.blinds', { defaultValue: 'Blinds' }),
      t('sparkery.quoteSubmissions.export.moldAreas', {
        defaultValue: 'Mold Areas',
      }),
      t('sparkery.quoteSubmissions.export.heavySoiling', {
        defaultValue: 'Heavy Soiling',
      }),
      t('sparkery.quoteSubmissions.export.rubbishRemoval', {
        defaultValue: 'Rubbish Removal',
      }),
      t('sparkery.quoteSubmissions.export.rubbishNotes', {
        defaultValue: 'Rubbish Notes',
      }),
      t('sparkery.quoteSubmissions.export.preferredDate', {
        defaultValue: 'Preferred Date',
      }),
      t('sparkery.quoteSubmissions.export.notes', { defaultValue: 'Notes' }),
      t('sparkery.quoteSubmissions.export.status', { defaultValue: 'Status' }),
      t('sparkery.quoteSubmissions.export.followUp24hSentAt', {
        defaultValue: 'Follow-up 24h Sent At',
      }),
      t('sparkery.quoteSubmissions.export.followUp72hSentAt', {
        defaultValue: 'Follow-up 72h Sent At',
      }),
      t('sparkery.quoteSubmissions.export.nextFollowUpDueAt', {
        defaultValue: 'Next Follow-up Due At',
      }),
    ];

    const rows = submissions.map(s => {
      const followUp = getFollowUpMeta(s, t);
      return [
        s.id,
        s.submittedAt,
        s.formType,
        s.customerName,
        s.email,
        s.phone,
        s.propertyAddress,
        s.propertyType,
        s.roomType,
        s.hasCarpet
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.carpetRooms,
        s.garage
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.glassDoorWindowCount,
        s.oven
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.fridge
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.wallStainsCount,
        s.acFilterCount,
        s.blindsCount,
        s.moldCount,
        s.heavySoiling
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.rubbishRemoval
          ? t('sparkery.quoteSubmissions.common.yes', { defaultValue: 'Yes' })
          : t('sparkery.quoteSubmissions.common.no', { defaultValue: 'No' }),
        s.rubbishRemovalNotes || '',
        s.preferredDate,
        s.additionalNotes,
        s.status,
        s.followUp24hSentAt || '',
        s.followUp72hSentAt || '',
        followUp.dueAt || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quote-submissions-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    message.success(
      t('sparkery.quoteSubmissions.messages.exportedCsv', {
        defaultValue: 'Exported to CSV',
      })
    );
  };

  const addAdvancedRule = useCallback(() => {
    setAdvancedRules(prev => [
      ...prev,
      {
        id: `advanced-rule-${Date.now()}-${prev.length}`,
        field: 'customer',
        operator: 'contains',
        value: '',
      },
    ]);
  }, []);

  const updateAdvancedRule = useCallback(
    (ruleId: string, patch: Partial<AdvancedFilterRule>) => {
      setAdvancedRules(prev =>
        prev.map(rule => (rule.id === ruleId ? { ...rule, ...patch } : rule))
      );
    },
    []
  );

  const removeAdvancedRule = useCallback((ruleId: string) => {
    setAdvancedRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const clearAdvancedRules = useCallback(() => {
    setAdvancedRules([]);
  }, []);

  // Filter submissions
  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(submission => {
        const search = searchText.toLowerCase();
        const matchesSearch =
          submission.customerName.toLowerCase().includes(search) ||
          submission.email.toLowerCase().includes(search) ||
          submission.phone.includes(searchText) ||
          submission.propertyAddress.toLowerCase().includes(search);

        const matchesStatus =
          statusFilter === 'all' || submission.status === statusFilter;
        const matchesFormType =
          formTypeFilter === 'all' || submission.formType === formTypeFilter;
        const advancedMatches =
          advancedRules.length === 0
            ? true
            : advancedFilterMode === 'and'
              ? advancedRules.every(rule =>
                  matchAdvancedRule(
                    resolveAdvancedRuleFieldValue(submission, rule.field, t),
                    rule.operator,
                    rule.value
                  )
                )
              : advancedRules.some(rule =>
                  matchAdvancedRule(
                    resolveAdvancedRuleFieldValue(submission, rule.field, t),
                    rule.operator,
                    rule.value
                  )
                );

        return matchesSearch && matchesStatus && matchesFormType && advancedMatches;
      }),
    [
      advancedFilterMode,
      advancedRules,
      formTypeFilter,
      searchText,
      statusFilter,
      submissions,
      t,
    ]
  );

  useEffect(() => {
    const visibleIds = new Set(filteredSubmissions.map(submission => submission.id));
    setSelectedSubmissionIds(prev => prev.filter(id => visibleIds.has(id)));
  }, [filteredSubmissions]);

  // Statistics
  const stats = useMemo(
    () => ({
      total: submissions.length,
      new: submissions.filter(submission => submission.status === 'new').length,
      contacted: submissions.filter(
        submission => submission.status === 'contacted'
      ).length,
      quoted: submissions.filter(submission => submission.status === 'quoted')
        .length,
      confirmed: submissions.filter(
        submission => submission.status === 'confirmed'
      ).length,
      completed: submissions.filter(
        submission => submission.status === 'completed'
      ).length,
      overdueFollowUps: submissions.filter(
        submission => getFollowUpMeta(submission, t).isOverdue
      ).length,
    }),
    [submissions, t]
  );

  const applySelectionPreset = useCallback(
    (preset: 'overdue' | 'new' | 'cn' | 'pending_follow_up') => {
      const nextIds = filteredSubmissions
        .filter(submission => {
          if (preset === 'overdue') {
            return getFollowUpMeta(submission, t).isOverdue;
          }
          if (preset === 'new') {
            return submission.status === 'new';
          }
          if (preset === 'cn') {
            return submission.formType.includes('cn');
          }
          return Boolean(getFollowUpMeta(submission, t).nextStep);
        })
        .map(submission => submission.id);
      setSelectedSubmissionIds(nextIds);
    },
    [filteredSubmissions, t]
  );

  const selectionToolbar = useMemo(
    () => (
      <Space wrap size={6}>
        <Text type='secondary'>
          {t('sparkery.quoteSubmissions.batch.selected', {
            defaultValue: 'Selected: {{count}}',
            count: selectedSubmissionIds.length,
          })}
        </Text>
        <Button size='small' onClick={() => applySelectionPreset('overdue')}>
          {t('sparkery.quoteSubmissions.batch.presets.overdue', {
            defaultValue: 'Overdue Follow-up',
          })}
        </Button>
        <Button size='small' onClick={() => applySelectionPreset('new')}>
          {t('sparkery.quoteSubmissions.batch.presets.new', {
            defaultValue: 'New Leads',
          })}
        </Button>
        <Button size='small' onClick={() => applySelectionPreset('cn')}>
          {t('sparkery.quoteSubmissions.batch.presets.cn', {
            defaultValue: 'Chinese Forms',
          })}
        </Button>
        <Button
          size='small'
          onClick={() => applySelectionPreset('pending_follow_up')}
        >
          {t('sparkery.quoteSubmissions.batch.presets.pendingFollowUp', {
            defaultValue: 'Pending Follow-up',
          })}
        </Button>
        <Button
          size='small'
          disabled={selectedSubmissionIds.length === 0}
          onClick={() => setSelectedSubmissionIds([])}
        >
          {t('sparkery.quoteSubmissions.batch.clearSelection', {
            defaultValue: 'Clear Selection',
          })}
        </Button>
        <Select
          size='small'
          value={batchStatusTarget}
          onChange={value =>
            setBatchStatusTarget(value as QuoteSubmission['status'])
          }
          className='sparkery-submissions-batch-status-select'
        >
          <Option value='new'>{t('sparkery.quoteSubmissions.status.new')}</Option>
          <Option value='contacted'>
            {t('sparkery.quoteSubmissions.status.contacted')}
          </Option>
          <Option value='quoted'>
            {t('sparkery.quoteSubmissions.status.quoted')}
          </Option>
          <Option value='confirmed'>
            {t('sparkery.quoteSubmissions.status.confirmed')}
          </Option>
          <Option value='completed'>
            {t('sparkery.quoteSubmissions.status.completed')}
          </Option>
          <Option value='cancelled'>
            {t('sparkery.quoteSubmissions.status.cancelled')}
          </Option>
        </Select>
        <Button
          size='small'
          type='primary'
          disabled={selectedSubmissionIds.length === 0}
          onClick={() => setBatchPreviewOpen(true)}
        >
          {t('sparkery.quoteSubmissions.batch.preview', {
            defaultValue: 'Preview Batch',
          })}
        </Button>
      </Space>
    ),
    [
      applySelectionPreset,
      batchStatusTarget,
      selectedSubmissionIds.length,
      t,
    ]
  );

  const statusColors: Record<string, string> = {
    new: 'blue',
    contacted: 'orange',
    quoted: 'purple',
    confirmed: 'cyan',
    completed: 'green',
    cancelled: 'red',
  };
  const statusLabels: Record<QuoteSubmission['status'], string> = {
    new: t('sparkery.quoteSubmissions.status.new', { defaultValue: 'New' }),
    contacted: t('sparkery.quoteSubmissions.status.contacted', {
      defaultValue: 'Contacted',
    }),
    quoted: t('sparkery.quoteSubmissions.status.quoted', {
      defaultValue: 'Quoted',
    }),
    confirmed: t('sparkery.quoteSubmissions.status.confirmed', {
      defaultValue: 'Confirmed',
    }),
    completed: t('sparkery.quoteSubmissions.status.completed', {
      defaultValue: 'Completed',
    }),
    cancelled: t('sparkery.quoteSubmissions.status.cancelled', {
      defaultValue: 'Cancelled',
    }),
  };

  const selectedSubmissions = useMemo(
    () =>
      filteredSubmissions.filter(submission =>
        selectedSubmissionIds.includes(submission.id)
      ),
    [filteredSubmissions, selectedSubmissionIds]
  );

  const batchImpact = useMemo(() => {
    const changes = selectedSubmissions.filter(
      submission => submission.status !== batchStatusTarget
    );
    const breakdown = changes.reduce<Record<QuoteSubmission['status'], number>>(
      (acc, submission) => {
        acc[submission.status] = (acc[submission.status] || 0) + 1;
        return acc;
      },
      {
        new: 0,
        contacted: 0,
        quoted: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      }
    );
    return {
      affectedCount: changes.length,
      unchangedCount: selectedSubmissions.length - changes.length,
      breakdown,
      rows: changes.map(submission => ({
        id: submission.id,
        previousStatus: submission.status,
      })),
    };
  }, [batchStatusTarget, selectedSubmissions]);

  const undoBatchStatus = useCallback(
    async (snapshot: BatchStatusSnapshot) => {
      if (snapshot.rows.length === 0) {
        return;
      }
      setBatchUndoing(true);
      try {
        const reverted = await Promise.all(
          snapshot.rows.map(row =>
            updateSubmission(row.id, { status: row.previousStatus as BondQuoteStatus })
          )
        );
        const revertedMap = new Map(
          reverted.map(row => {
            const normalized = normalizeSubmission(row as QuoteSubmission);
            return [normalized.id, normalized] as const;
          })
        );
        setSubmissions(prev =>
          prev.map(submission => revertedMap.get(submission.id) || submission)
        );
        message.success(
          t('sparkery.quoteSubmissions.batch.undoSuccess', {
            defaultValue: 'Batch status update reverted',
          })
        );
        setLastBatchSnapshot(null);
        notification.destroy(snapshot.key);
      } catch {
        message.error(
          t('sparkery.quoteSubmissions.batch.undoFailed', {
            defaultValue: 'Failed to undo batch status update',
          })
        );
      } finally {
        setBatchUndoing(false);
      }
    },
    [t]
  );

  const applyBatchStatus = useCallback(async () => {
    if (batchImpact.rows.length === 0) {
      message.info(
        t('sparkery.quoteSubmissions.batch.noChanges', {
          defaultValue: 'No status changes to apply',
        })
      );
      setBatchPreviewOpen(false);
      return;
    }
    setBatchApplying(true);
    try {
      const updatedRows = await Promise.all(
        batchImpact.rows.map(row =>
          updateSubmission(row.id, { status: batchStatusTarget as BondQuoteStatus })
        )
      );
      const updatedMap = new Map(
        updatedRows.map(row => {
          const normalized = normalizeSubmission(row as QuoteSubmission);
          return [normalized.id, normalized] as const;
        })
      );
      setSubmissions(prev =>
        prev.map(submission => updatedMap.get(submission.id) || submission)
      );
      const snapshot: BatchStatusSnapshot = {
        key: `sparkery-batch-undo-${Date.now()}`,
        nextStatus: batchStatusTarget,
        rows: batchImpact.rows,
      };
      setLastBatchSnapshot(snapshot);
      setBatchPreviewOpen(false);
      setSelectedSubmissionIds([]);
      notification.success({
        key: snapshot.key,
        message: t('sparkery.quoteSubmissions.batch.successTitle', {
          defaultValue: 'Batch status update applied',
        }),
        description: t('sparkery.quoteSubmissions.batch.successDescription', {
          defaultValue: '{{count}} submissions updated to {{status}}.',
          count: batchImpact.rows.length,
          status: statusLabels[batchStatusTarget],
        }),
        duration: 10,
        btn: (
          <Button
            size='small'
            loading={batchUndoing}
            onClick={() => {
              void undoBatchStatus(snapshot);
            }}
          >
            {t('sparkery.quoteSubmissions.batch.undoAction', {
              defaultValue: 'Undo',
            })}
          </Button>
        ),
      });
    } catch {
      message.error(
        t('sparkery.quoteSubmissions.batch.applyFailed', {
          defaultValue: 'Failed to apply batch status update',
        })
      );
    } finally {
      setBatchApplying(false);
    }
  }, [
    batchImpact.rows,
    batchStatusTarget,
    batchUndoing,
    statusLabels,
    t,
    undoBatchStatus,
  ]);

  const columns: TableColumnsType<QuoteSubmission> = [
    {
      title: t('sparkery.quoteSubmissions.table.submittedAt', {
        defaultValue: 'Submitted At',
      }),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: t('sparkery.quoteSubmissions.table.type', {
        defaultValue: 'Type',
      }),
      dataIndex: 'formType',
      key: 'formType',
      width: 80,
      render: (type: string) => (
        <Tag
          icon={<GlobalOutlined />}
          color={type.includes('cn') ? 'red' : 'blue'}
        >
          {type.includes('cn')
            ? t('sparkery.quoteSubmissions.formType.shortCn', {
                defaultValue: 'CN',
              })
            : t('sparkery.quoteSubmissions.formType.shortEn', {
                defaultValue: 'EN',
              })}
        </Tag>
      ),
    },
    {
      title: t('sparkery.quoteSubmissions.table.customer', {
        defaultValue: 'Customer',
      }),
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
    },
    {
      title: t('sparkery.quoteSubmissions.table.contact', {
        defaultValue: 'Contact',
      }),
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.phone}</div>
          <div className='sparkery-submissions-contact-email'>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: t('sparkery.quoteSubmissions.table.property', {
        defaultValue: 'Property',
      }),
      key: 'property',
      width: 200,
      render: (_, record) => (
        <div>
          <Tag>{record.propertyType}</Tag>
          <Tag>
            {record.roomType === 'other'
              ? record.customRoomType
              : record.roomType}
          </Tag>
          {record.hasCarpet && (
            <Tag color='green'>
              {t('sparkery.quoteSubmissions.fields.carpet', {
                defaultValue: 'Carpet',
              })}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('sparkery.quoteSubmissions.table.status', {
        defaultValue: 'Status',
      }),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusLabels[status as QuoteSubmission['status']] ||
            status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('sparkery.quoteSubmissions.table.followUp', {
        defaultValue: 'Follow-up',
      }),
      key: 'followUp',
      width: 190,
      render: (_, record) => {
        const followUp = getFollowUpMeta(record, t);
        return (
          <Space
            direction='vertical'
            size={2}
            className='sparkery-submissions-followup-cell'
          >
            <Tag color={followUp.stageColor}>{followUp.stageLabel}</Tag>
            <Text
              className='sparkery-submissions-followup-due'
              type={followUp.dueTone === 'danger' ? 'danger' : 'secondary'}
            >
              {followUp.dueText}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('sparkery.quoteSubmissions.table.actions', {
        defaultValue: 'Actions',
      }),
      key: 'actions',
      width: 320,
      render: (_, record) => {
        const followUp = getFollowUpMeta(record, t);
        return (
          <Space wrap>
            <Button
              size='small'
              icon={<EditOutlined />}
              type='primary'
              onClick={() => generateQuoteDraft(record)}
            >
              {t('sparkery.quoteSubmissions.actions.draftQuote', {
                defaultValue: 'Draft Quote',
              })}
            </Button>
            {followUp.nextStep && (
              <Button
                size='small'
                icon={<ClockCircleOutlined />}
                onClick={() => {
                  if (!followUp.nextStep) {
                    return;
                  }
                  markFollowUpSent(record, followUp.nextStep).catch(() => {
                    // handled in markFollowUpSent
                  });
                }}
                loading={followUpSavingId === record.id}
              >
                {t('sparkery.quoteSubmissions.actions.markFollowUp', {
                  defaultValue: 'Mark {{step}}',
                  step: getFollowUpStepLabel(followUp.nextStep, t),
                })}
              </Button>
            )}
            <Button
              size='small'
              icon={<EyeOutlined />}
              onClick={() => openSubmissionDetails(record)}
            >
              {t('sparkery.quoteSubmissions.actions.view', {
                defaultValue: 'View',
              })}
            </Button>
            <Popconfirm
              title={t('sparkery.quoteSubmissions.confirm.deleteSubmission', {
                defaultValue: 'Delete this submission?',
              })}
              onConfirm={() => deleteSubmission(record.id)}
            >
              <Button size='small' danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const quickFilterColumns = useMemo(
    () => ({
      submittedAt: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.submittedAt', {
          defaultValue: 'Filter submitted date/time',
        }),
      },
      formType: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.type', {
          defaultValue: 'Filter form type',
        }),
        match: (record: QuoteSubmission, query: string) =>
          (record.formType.includes('cn') ? 'cn chinese' : 'en english')
            .toLowerCase()
            .includes(query),
      },
      customerName: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.customer', {
          defaultValue: 'Filter customer name',
        }),
      },
      contact: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.contact', {
          defaultValue: 'Filter phone or email',
        }),
        match: (record: QuoteSubmission, query: string) =>
          `${record.phone} ${record.email}`.toLowerCase().includes(query),
      },
      property: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.property', {
          defaultValue: 'Filter property type/address',
        }),
        match: (record: QuoteSubmission, query: string) =>
          `${record.propertyType} ${record.roomType} ${record.propertyAddress}`
            .toLowerCase()
            .includes(query),
      },
      status: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.status', {
          defaultValue: 'Filter status',
        }),
      },
      followUp: {
        placeholder: t('sparkery.quoteSubmissions.filters.quick.followUp', {
          defaultValue: 'Filter follow-up stage',
        }),
        match: (record: QuoteSubmission, query: string) => {
          const followUp = getFollowUpMeta(record, t);
          return `${followUp.stageLabel} ${followUp.dueText}`
            .toLowerCase()
            .includes(query);
        },
      },
      actions: false as const,
    }),
    [t]
  );

  const renderAdvancedFilterModal = () => (
    <Modal
      title={t('sparkery.quoteSubmissions.filters.advancedTitle', {
        defaultValue: 'Advanced Filter Builder',
      })}
      open={advancedFilterOpen}
      onCancel={() => setAdvancedFilterOpen(false)}
      onOk={() => setAdvancedFilterOpen(false)}
      okText={t('sparkery.quoteSubmissions.actions.apply', {
        defaultValue: 'Apply',
      })}
      width={700}
    >
      <Space direction='vertical' className='sparkery-submissions-advanced-rules'>
        <Space wrap>
          <Text type='secondary'>
            {t('sparkery.quoteSubmissions.filters.logic', {
              defaultValue: 'Match logic',
            })}
          </Text>
          <Select
            size='small'
            value={advancedFilterMode}
            onChange={value => setAdvancedFilterMode(value as 'and' | 'or')}
            className='sparkery-submissions-advanced-logic-select'
          >
            <Option value='and'>
              {t('sparkery.quoteSubmissions.filters.logicAll', {
                defaultValue: 'Match all rules (AND)',
              })}
            </Option>
            <Option value='or'>
              {t('sparkery.quoteSubmissions.filters.logicAny', {
                defaultValue: 'Match any rule (OR)',
              })}
            </Option>
          </Select>
          <Button size='small' icon={<PlusOutlined />} onClick={addAdvancedRule}>
            {t('sparkery.quoteSubmissions.filters.addRule', {
              defaultValue: 'Add Rule',
            })}
          </Button>
          <Button
            size='small'
            disabled={advancedRules.length === 0}
            onClick={clearAdvancedRules}
          >
            {t('sparkery.quoteSubmissions.filters.clearRules', {
              defaultValue: 'Clear Rules',
            })}
          </Button>
        </Space>
        {advancedRules.length === 0 ? (
          <Text type='secondary'>
            {t('sparkery.quoteSubmissions.filters.noAdvancedRules', {
              defaultValue:
                'No advanced rules configured. Add rules to filter with AND/OR logic.',
            })}
          </Text>
        ) : (
          <Space direction='vertical' className='sparkery-submissions-advanced-list'>
            {advancedRules.map(rule => (
              <Space key={rule.id} wrap className='sparkery-submissions-advanced-row'>
                <Select
                  size='small'
                  value={rule.field}
                  className='sparkery-submissions-advanced-field'
                  onChange={value =>
                    updateAdvancedRule(rule.id, {
                      field: value as AdvancedRuleField,
                    })
                  }
                >
                  <Option value='customer'>
                    {t('sparkery.quoteSubmissions.filters.fields.customer', {
                      defaultValue: 'Customer',
                    })}
                  </Option>
                  <Option value='contact'>
                    {t('sparkery.quoteSubmissions.filters.fields.contact', {
                      defaultValue: 'Contact',
                    })}
                  </Option>
                  <Option value='address'>
                    {t('sparkery.quoteSubmissions.filters.fields.address', {
                      defaultValue: 'Address',
                    })}
                  </Option>
                  <Option value='status'>
                    {t('sparkery.quoteSubmissions.filters.fields.status', {
                      defaultValue: 'Status',
                    })}
                  </Option>
                  <Option value='follow_up'>
                    {t('sparkery.quoteSubmissions.filters.fields.followUp', {
                      defaultValue: 'Follow-up',
                    })}
                  </Option>
                </Select>
                <Select
                  size='small'
                  value={rule.operator}
                  className='sparkery-submissions-advanced-operator'
                  onChange={value =>
                    updateAdvancedRule(rule.id, {
                      operator: value as AdvancedRuleOperator,
                    })
                  }
                >
                  <Option value='contains'>
                    {t('sparkery.quoteSubmissions.filters.operators.contains', {
                      defaultValue: 'contains',
                    })}
                  </Option>
                  <Option value='equals'>
                    {t('sparkery.quoteSubmissions.filters.operators.equals', {
                      defaultValue: 'equals',
                    })}
                  </Option>
                  <Option value='starts_with'>
                    {t('sparkery.quoteSubmissions.filters.operators.startsWith', {
                      defaultValue: 'starts with',
                    })}
                  </Option>
                  <Option value='is_empty'>
                    {t('sparkery.quoteSubmissions.filters.operators.isEmpty', {
                      defaultValue: 'is empty',
                    })}
                  </Option>
                  <Option value='is_not_empty'>
                    {t('sparkery.quoteSubmissions.filters.operators.isNotEmpty', {
                      defaultValue: 'is not empty',
                    })}
                  </Option>
                </Select>
                <Input
                  size='small'
                  className='sparkery-submissions-advanced-value'
                  value={rule.value}
                  disabled={
                    rule.operator === 'is_empty' ||
                    rule.operator === 'is_not_empty'
                  }
                  placeholder={t('sparkery.quoteSubmissions.filters.value', {
                    defaultValue: 'Value',
                  })}
                  onChange={event =>
                    updateAdvancedRule(rule.id, {
                      value: event.target.value,
                    })
                  }
                />
                <Button
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeAdvancedRule(rule.id)}
                />
              </Space>
            ))}
          </Space>
        )}
      </Space>
    </Modal>
  );

  const renderBatchPreviewModal = () => (
    <Modal
      title={t('sparkery.quoteSubmissions.batch.previewTitle', {
        defaultValue: 'Batch Impact Preview',
      })}
      open={batchPreviewOpen}
      onCancel={() => setBatchPreviewOpen(false)}
      onOk={() => {
        void applyBatchStatus();
      }}
      okButtonProps={{
        loading: batchApplying,
        disabled: batchImpact.affectedCount === 0,
      }}
      okText={t('sparkery.quoteSubmissions.batch.apply', {
        defaultValue: 'Apply Updates',
      })}
      width={640}
    >
      <Space direction='vertical' className='sparkery-submissions-batch-preview'>
        <Text>
          {t('sparkery.quoteSubmissions.batch.previewSummary', {
            defaultValue:
              'Selected {{selected}} submissions. {{affected}} will change to {{status}}.',
            selected: selectedSubmissions.length,
            affected: batchImpact.affectedCount,
            status: statusLabels[batchStatusTarget],
          })}
        </Text>
        {batchImpact.unchangedCount > 0 && (
          <Text type='secondary'>
            {t('sparkery.quoteSubmissions.batch.unchanged', {
              defaultValue: '{{count}} already in target status.',
              count: batchImpact.unchangedCount,
            })}
          </Text>
        )}
        <Space wrap>
          {(Object.keys(batchImpact.breakdown) as QuoteSubmission['status'][]).map(
            status => {
              const count = batchImpact.breakdown[status];
              if (!count) {
                return null;
              }
              return (
                <Tag key={status} color={statusColors[status] || 'default'}>
                  {statusLabels[status]}: {count}
                </Tag>
              );
            }
          )}
        </Space>
        {lastBatchSnapshot && (
          <Text type='secondary'>
            {t('sparkery.quoteSubmissions.batch.undoHint', {
              defaultValue: 'Last batch can be undone from notification toast.',
            })}
          </Text>
        )}
      </Space>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedSubmission) return null;
    const followUp = getFollowUpMeta(selectedSubmission, t);
    const nextFollowUpStep = followUp.nextStep || 'first';

    return (
      <Modal
        title={t('sparkery.quoteSubmissions.modal.title', {
          defaultValue: 'Quote Request - {{id}}',
          id: selectedSubmission.id,
        })}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key='close' onClick={() => setDetailModalVisible(false)}>
            {t('sparkery.quoteSubmissions.actions.close', {
              defaultValue: 'Close',
            })}
          </Button>,
        ]}
      >
        <Descriptions bordered column={2} size='small'>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.submittedAt', {
              defaultValue: 'Submitted At',
            })}
            span={2}
          >
            {dayjs(selectedSubmission.submittedAt).format(
              'YYYY-MM-DD HH:mm:ss'
            )}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.formType', {
              defaultValue: 'Form Type',
            })}
          >
            <Tag
              color={
                selectedSubmission.formType.includes('cn') ? 'red' : 'blue'
              }
            >
              {selectedSubmission.formType.includes('cn')
                ? t('sparkery.quoteSubmissions.formType.chinese', {
                    defaultValue: 'Chinese',
                  })
                : t('sparkery.quoteSubmissions.formType.english', {
                    defaultValue: 'English',
                  })}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.status', {
              defaultValue: 'Status',
            })}
          >
            <Select
              className='sparkery-submissions-status-select'
              value={selectedSubmission.status}
              onChange={async value => {
                await updateStatus(selectedSubmission.id, value);
              }}
            >
              <Option value='new'>{statusLabels.new}</Option>
              <Option value='contacted'>{statusLabels.contacted}</Option>
              <Option value='quoted'>{statusLabels.quoted}</Option>
              <Option value='confirmed'>{statusLabels.confirmed}</Option>
              <Option value='completed'>{statusLabels.completed}</Option>
              <Option value='cancelled'>{statusLabels.cancelled}</Option>
            </Select>
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.followUp', {
              defaultValue: 'Follow-up',
            })}
            span={2}
          >
            <Space
              direction='vertical'
              size={6}
              className='sparkery-submissions-followup-detail'
            >
              <Space wrap>
                <Tag color={followUp.stageColor}>{followUp.stageLabel}</Tag>
                <Text
                  type={followUp.dueTone === 'danger' ? 'danger' : 'secondary'}
                >
                  {followUp.dueText}
                </Text>
              </Space>
              <Space wrap>
                <Button
                  size='small'
                  icon={<CopyOutlined />}
                  onClick={() => {
                    copyFollowUpMessage(
                      selectedSubmission,
                      nextFollowUpStep
                    ).catch(() => {
                      // handled in copyFollowUpMessage
                    });
                  }}
                >
                  {t('sparkery.quoteSubmissions.actions.copyReminder', {
                    defaultValue: 'Copy reminder',
                  })}
                </Button>
                <Button
                  size='small'
                  icon={<MailOutlined />}
                  onClick={() =>
                    openEmailDraft(selectedSubmission, nextFollowUpStep)
                  }
                >
                  {t('sparkery.quoteSubmissions.actions.openEmailDraft', {
                    defaultValue: 'Open email draft',
                  })}
                </Button>
                <Button
                  size='small'
                  icon={<MessageOutlined />}
                  onClick={() =>
                    openSmsDraft(selectedSubmission, nextFollowUpStep)
                  }
                >
                  {t('sparkery.quoteSubmissions.actions.openSmsDraft', {
                    defaultValue: 'Open SMS draft',
                  })}
                </Button>
                {followUp.nextStep && (
                  <Button
                    size='small'
                    icon={<ClockCircleOutlined />}
                    loading={followUpSavingId === selectedSubmission.id}
                    onClick={() => {
                      if (!followUp.nextStep) {
                        return;
                      }
                      markFollowUpSent(
                        selectedSubmission,
                        followUp.nextStep
                      ).catch(() => {
                        // handled in markFollowUpSent
                      });
                    }}
                  >
                    {t('sparkery.quoteSubmissions.actions.markSent', {
                      defaultValue: 'Mark {{step}} sent',
                      step: getFollowUpStepLabel(followUp.nextStep, t),
                    })}
                  </Button>
                )}
              </Space>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.customerName', {
              defaultValue: 'Customer Name',
            })}
          >
            {selectedSubmission.customerName}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.phone', {
              defaultValue: 'Phone',
            })}
          >
            {selectedSubmission.phone}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.email', {
              defaultValue: 'Email',
            })}
            span={2}
          >
            {selectedSubmission.email}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.propertyAddress', {
              defaultValue: 'Property Address',
            })}
            span={2}
          >
            {selectedSubmission.propertyAddress}
          </Descriptions.Item>

          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.propertyType', {
              defaultValue: 'Property Type',
            })}
          >
            {selectedSubmission.propertyType}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.roomType', {
              defaultValue: 'Room Type',
            })}
          >
            {selectedSubmission.roomType === 'other'
              ? selectedSubmission.customRoomType
              : selectedSubmission.roomType}
          </Descriptions.Item>
          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.hasCarpet', {
              defaultValue: 'Has Carpet',
            })}
          >
            {selectedSubmission.hasCarpet
              ? t('sparkery.quoteSubmissions.fields.hasCarpetWithRooms', {
                  defaultValue: 'Yes ({{count}} rooms)',
                  count: selectedSubmission.carpetRooms,
                })
              : t('sparkery.quoteSubmissions.common.no', {
                  defaultValue: 'No',
                })}
          </Descriptions.Item>

          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.additionalServices', {
              defaultValue: 'Additional Services',
            })}
            span={2}
          >
            <Space wrap>
              {selectedSubmission.garage && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.garageBalcony', {
                    defaultValue: 'Garage/Balcony',
                  })}
                </Tag>
              )}
              {selectedSubmission.glassDoorWindowCount > 0 && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.glass', {
                    defaultValue: 'Glass: {{count}}',
                    count: selectedSubmission.glassDoorWindowCount,
                  })}
                </Tag>
              )}
              {selectedSubmission.oven && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.oven', {
                    defaultValue: 'Oven',
                  })}
                </Tag>
              )}
              {selectedSubmission.fridge && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.fridge', {
                    defaultValue: 'Fridge',
                  })}
                </Tag>
              )}
              {selectedSubmission.wallStainsCount > 0 && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.wallStains', {
                    defaultValue: 'Wall Stains: {{count}}',
                    count: selectedSubmission.wallStainsCount,
                  })}
                </Tag>
              )}
              {selectedSubmission.acFilterCount > 0 && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.ac', {
                    defaultValue: 'AC: {{count}}',
                    count: selectedSubmission.acFilterCount,
                  })}
                </Tag>
              )}
              {selectedSubmission.blindsCount > 0 && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.blinds', {
                    defaultValue: 'Blinds: {{count}}',
                    count: selectedSubmission.blindsCount,
                  })}
                </Tag>
              )}
              {selectedSubmission.moldCount > 0 && (
                <Tag color='blue'>
                  {t('sparkery.quoteSubmissions.services.mold', {
                    defaultValue: 'Mold: {{count}}',
                    count: selectedSubmission.moldCount,
                  })}
                </Tag>
              )}
              {selectedSubmission.heavySoiling && (
                <Tag color='orange'>
                  {t('sparkery.quoteSubmissions.services.heavySoiling', {
                    defaultValue: 'Heavy Soiling',
                  })}
                </Tag>
              )}
              {selectedSubmission.rubbishRemoval && (
                <Tag color='orange'>
                  {t('sparkery.quoteSubmissions.services.rubbishRemoval', {
                    defaultValue: 'Rubbish Removal',
                  })}
                </Tag>
              )}
            </Space>
          </Descriptions.Item>

          {selectedSubmission.rubbishRemovalNotes && (
            <Descriptions.Item
              label={t('sparkery.quoteSubmissions.fields.rubbishNotes', {
                defaultValue: 'Rubbish Notes',
              })}
              span={2}
            >
              {selectedSubmission.rubbishRemovalNotes}
            </Descriptions.Item>
          )}

          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.preferredDate', {
              defaultValue: 'Preferred Date',
            })}
            span={2}
          >
            {selectedSubmission.preferredDate ||
              t('sparkery.quoteSubmissions.common.notSpecified', {
                defaultValue: 'Not specified',
              })}
          </Descriptions.Item>

          <Descriptions.Item
            label={t('sparkery.quoteSubmissions.fields.additionalNotes', {
              defaultValue: 'Additional Notes',
            })}
            span={2}
          >
            {selectedSubmission.additionalNotes ||
              t('sparkery.quoteSubmissions.common.none', {
                defaultValue: 'None',
              })}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    );
  };

  return (
    <div className='sparkery-submissions-page sparkery-submissions-shell'>
      <div className='sparkery-submissions-header'>
        <Title level={3} className='sparkery-submissions-title'>
          <FileTextOutlined className='sparkery-submissions-title-icon' />
          {t('sparkery.quoteSubmissions.title', {
            defaultValue: 'Bond Clean Quote Submissions',
          })}
        </Title>
        <Text className='sparkery-submissions-subtitle' type='secondary'>
          {t('sparkery.quoteSubmissions.subtitle', {
            defaultValue: 'View and manage customer quote requests',
          })}
        </Text>
      </div>

      {/* Statistics */}
      <Row gutter={16} className='sparkery-submissions-stats-row'>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={t('sparkery.quoteSubmissions.stats.total', {
                defaultValue: 'Total',
              })}
              value={stats.total}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={statusLabels.new}
              value={stats.new}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={statusLabels.contacted}
              value={stats.contacted}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={statusLabels.quoted}
              value={stats.quoted}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={statusLabels.confirmed}
              value={stats.confirmed}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={statusLabels.completed}
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className='sparkery-stat-card'>
            <Statistic
              title={t('sparkery.quoteSubmissions.stats.overdueFollowUp', {
                defaultValue: 'Overdue Follow-up',
              })}
              value={stats.overdueFollowUps}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className='sparkery-filter-card'>
        <Row gutter={16} align='middle'>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder={t('sparkery.quoteSubmissions.filters.search', {
                defaultValue: 'Search name, email, phone...',
              })}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              className='sparkery-submissions-filter-select'
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value='all'>
                {t('sparkery.quoteSubmissions.filters.allStatus', {
                  defaultValue: 'All Status',
                })}
              </Option>
              <Option value='new'>{statusLabels.new}</Option>
              <Option value='contacted'>{statusLabels.contacted}</Option>
              <Option value='quoted'>{statusLabels.quoted}</Option>
              <Option value='confirmed'>{statusLabels.confirmed}</Option>
              <Option value='completed'>{statusLabels.completed}</Option>
              <Option value='cancelled'>{statusLabels.cancelled}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              className='sparkery-submissions-filter-select'
              value={formTypeFilter}
              onChange={setFormTypeFilter}
            >
              <Option value='all'>
                {t('sparkery.quoteSubmissions.filters.allForms', {
                  defaultValue: 'All Forms',
                })}
              </Option>
              <Option value='bond_clean_quote_request'>
                {t('sparkery.quoteSubmissions.formType.english', {
                  defaultValue: 'English',
                })}
              </Option>
              <Option value='bond_clean_quote_request_cn'>
                {t('sparkery.quoteSubmissions.formType.chinese', {
                  defaultValue: 'Chinese',
                })}
              </Option>
            </Select>
          </Col>
          <Col
            xs={24}
            sm={24}
            md={10}
            className='sparkery-submissions-filter-actions'
          >
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setAdvancedFilterOpen(true)}
              >
                {t('sparkery.quoteSubmissions.filters.advanced', {
                  defaultValue: 'Advanced Rules ({{count}})',
                  count: advancedRules.length,
                })}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadSubmissions().catch(() => {
                    // handled in loadSubmissions
                  });
                }}
              >
                {t('sparkery.quoteSubmissions.actions.refresh', {
                  defaultValue: 'Refresh',
                })}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToCSV}
                type='primary'
              >
                {t('sparkery.quoteSubmissions.actions.exportCsv', {
                  defaultValue: 'Export CSV',
                })}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className='sparkery-table-card'>
        <SparkeryDataTable<QuoteSubmission>
          tableId='bond-clean-quote-submissions'
          toolbar={selectionToolbar}
          columns={columns}
          dataSource={filteredSubmissions}
          rowKey='id'
          rowSelection={{
            selectedRowKeys: selectedSubmissionIds,
            onChange: keys => setSelectedSubmissionIds(keys.map(String)),
          }}
          loading={loading}
          onRowOpen={openSubmissionDetails}
          showQuickFilterRow
          showSortBuilder
          quickFilterColumns={quickFilterColumns}
          virtualizeThreshold={80}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total =>
              t('sparkery.quoteSubmissions.pagination.total', {
                defaultValue: 'Total {{count}} submissions',
                count: total,
              }),
          }}
        />
      </Card>

      {renderAdvancedFilterModal()}
      {renderBatchPreviewModal()}
      {renderDetailModal()}
    </div>
  );
};

export default BondCleanQuoteSubmissions;
