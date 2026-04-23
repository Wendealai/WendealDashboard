import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

type WorkflowKey =
  | 'topic-intake'
  | 'content-generation'
  | 'approval-publish'
  | 'closed-loop';

type RunStatus = 'running' | 'success' | 'error';

interface WorkflowMeta {
  key: WorkflowKey;
  title: string;
  description: string;
}

interface ContentCreatorSettings {
  baseUrl: string;
  workflowFolder: string;
  industryPreset: string;
  endpoints: Record<WorkflowKey, string>;
}

interface WorkflowRunRecord {
  id: string;
  workflowKey: WorkflowKey;
  status: RunStatus;
  endpoint: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  requestPayload: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
}

interface TopicIntakeValues {
  campaignName: string;
  topic: string;
  audience: string;
  region: string;
  sourceChannels: string[];
  infoFilters: string;
  promptPack: string;
}

interface ContentGenerationValues {
  objective: string;
  format: string;
  tone: string;
  targetLength: number;
  seedKeywords: string[];
  includeCallToAction: boolean;
  structureNotes: string;
}

interface PublishValues {
  channels: string[];
  publishMode: 'instant' | 'scheduled';
  publishAt?: string;
  reviewer: string;
  approvalRequired: boolean;
  complianceNotes: string;
}

interface ClosedLoopValues {
  summaryPeriod: string;
  attributionWindowDays: number;
  coreMetrics: string[];
  optimizationNotes: string;
}

const CONTENT_CREATOR_SETTINGS_STORAGE_KEY =
  'sparkery_content_creator_settings_v1';
const MAX_RUN_HISTORY = 30;

const WORKFLOWS: WorkflowMeta[] = [
  {
    key: 'topic-intake',
    title: '1. Topic Intake',
    description: 'Collect intent, sources and domain filters for this batch.',
  },
  {
    key: 'content-generation',
    title: '2. Content Generation',
    description: 'Generate draft assets with structured prompt packs.',
  },
  {
    key: 'approval-publish',
    title: '3. Approval & Publish',
    description: 'Route through approval and trigger multi-channel distribution.',
  },
  {
    key: 'closed-loop',
    title: '4. Cleaning Closed Loop',
    description: 'Feed performance data back into the next content cycle.',
  },
];

const DEFAULT_SETTINGS: ContentCreatorSettings = {
  baseUrl: 'http://localhost:5678',
  workflowFolder: 'mvp-content-creator',
  industryPreset: 'cleaning-service',
  endpoints: {
    'topic-intake': '/webhook/mvp/topic/intake',
    'content-generation': '/webhook/mvp/content/generate',
    'approval-publish': '/webhook/mvp/content/approve-and-publish',
    'closed-loop': '/webhook/mvp/cleaning/closed-loop',
  },
};

const INDUSTRY_PRESETS = [
  {
    value: 'cleaning-service',
    label: 'Cleaning Service (Sparkery)',
    promptHint:
      'Prioritize trust, before/after clarity, local service proof, and conversion-focused CTA.',
  },
  {
    value: 'real-estate',
    label: 'Real Estate',
    promptHint:
      'Prioritize property value, suburb-level market context, and lead qualification details.',
  },
  {
    value: 'local-retail',
    label: 'Local Retail',
    promptHint:
      'Prioritize promotions, walk-in intent, repeat customer behavior, and channel timing.',
  },
  {
    value: 'consulting',
    label: 'Professional Consulting',
    promptHint:
      'Prioritize authority proof, outcome framing, case snippets, and consult booking flow.',
  },
];

const SOURCE_CHANNEL_OPTIONS = [
  'Google Trends',
  'Xiaohongshu',
  'TikTok',
  'YouTube',
  '微信公众号',
  'Competitor RSS',
  'Customer FAQ',
];

const DISTRIBUTION_CHANNEL_OPTIONS = [
  'Xiaohongshu',
  '抖音',
  '微信公众号',
  'LinkedIn',
  'YouTube Shorts',
  'Email Newsletter',
];

const METRIC_OPTIONS = [
  'Impressions',
  'CTR',
  'Saves',
  'Comments',
  'Leads',
  'Bookings',
  'Revenue',
];

const STATUS_TAG_COLOR: Record<RunStatus, string> = {
  running: 'processing',
  success: 'green',
  error: 'red',
};

const readStoredSettings = (): ContentCreatorSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(
      CONTENT_CREATOR_SETTINGS_STORAGE_KEY
    );
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<ContentCreatorSettings>;
    return {
      baseUrl:
        typeof parsed.baseUrl === 'string'
          ? parsed.baseUrl
          : DEFAULT_SETTINGS.baseUrl,
      workflowFolder:
        typeof parsed.workflowFolder === 'string'
          ? parsed.workflowFolder
          : DEFAULT_SETTINGS.workflowFolder,
      industryPreset:
        typeof parsed.industryPreset === 'string'
          ? parsed.industryPreset
          : DEFAULT_SETTINGS.industryPreset,
      endpoints: {
        'topic-intake':
          parsed.endpoints?.['topic-intake'] ||
          DEFAULT_SETTINGS.endpoints['topic-intake'],
        'content-generation':
          parsed.endpoints?.['content-generation'] ||
          DEFAULT_SETTINGS.endpoints['content-generation'],
        'approval-publish':
          parsed.endpoints?.['approval-publish'] ||
          DEFAULT_SETTINGS.endpoints['approval-publish'],
        'closed-loop':
          parsed.endpoints?.['closed-loop'] ||
          DEFAULT_SETTINGS.endpoints['closed-loop'],
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const resolveEndpointUrl = (baseUrl: string, endpointPath: string): string => {
  const normalizedEndpoint = endpointPath.trim();
  if (!normalizedEndpoint) {
    return '';
  }
  if (/^https?:\/\//i.test(normalizedEndpoint)) {
    return normalizedEndpoint;
  }
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '');
  if (!normalizedBase) {
    return '';
  }
  const normalizedPath = normalizedEndpoint.startsWith('/')
    ? normalizedEndpoint
    : `/${normalizedEndpoint}`;
  return `${normalizedBase}${normalizedPath}`;
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringifyPayload = (payload: unknown): string => {
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
};

const formatDuration = (durationMs?: number): string => {
  if (!durationMs || durationMs <= 0) {
    return '-';
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
};

const ContentCreatorPage: React.FC = () => {
  const [settings, setSettings] = useState<ContentCreatorSettings>(() =>
    readStoredSettings()
  );
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([]);
  const [runningWorkflow, setRunningWorkflow] = useState<WorkflowKey | null>(
    null
  );
  const [inspectingRunId, setInspectingRunId] = useState<string | null>(null);

  const selectedIndustryPreset = useMemo(
    () =>
      INDUSTRY_PRESETS.find(item => item.value === settings.industryPreset) ||
      INDUSTRY_PRESETS[0],
    [settings.industryPreset]
  );

  const workflowByKey = useMemo(
    () =>
      WORKFLOWS.reduce<Record<WorkflowKey, WorkflowMeta>>((acc, workflow) => {
        acc[workflow.key] = workflow;
        return acc;
      }, {} as Record<WorkflowKey, WorkflowMeta>),
    []
  );

  const activeRun = useMemo(
    () => runs.find(run => run.id === inspectingRunId) || null,
    [inspectingRunId, runs]
  );

  const completedRuns = useMemo(
    () => runs.filter(run => run.status !== 'running'),
    [runs]
  );
  const successRuns = useMemo(
    () => completedRuns.filter(run => run.status === 'success').length,
    [completedRuns]
  );
  const successRate =
    completedRuns.length > 0
      ? Math.round((successRuns / completedRuns.length) * 100)
      : 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      CONTENT_CREATOR_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  }, [settings]);

  const updateEndpoint = (workflowKey: WorkflowKey, value: string) => {
    setSettings(prev => ({
      ...prev,
      endpoints: {
        ...prev.endpoints,
        [workflowKey]: value,
      },
    }));
  };

  const updateRunRecord = (
    runId: string,
    patch: Partial<WorkflowRunRecord>
  ) => {
    setRuns(prev =>
      prev.map(run => (run.id === runId ? { ...run, ...patch } : run))
    );
  };

  const executeWorkflow = async (
    workflowKey: WorkflowKey,
    payload: Record<string, unknown>
  ) => {
    const endpoint = resolveEndpointUrl(
      settings.baseUrl,
      settings.endpoints[workflowKey]
    );
    if (!endpoint) {
      message.error('Please set a valid n8n base URL and endpoint.');
      return;
    }

    const startedAt = new Date().toISOString();
    const runId = `${workflowKey}-${Date.now()}`;
    const requestPayload = {
      ...payload,
      workflowFolder: settings.workflowFolder.trim(),
      industryPreset: settings.industryPreset,
      triggeredFrom: 'sparkery-content-creator-ui',
      triggeredAt: startedAt,
    };

    const newRun: WorkflowRunRecord = {
      id: runId,
      workflowKey,
      status: 'running',
      endpoint,
      startedAt,
      requestPayload,
    };
    setRuns(prev => [newRun, ...prev].slice(0, MAX_RUN_HISTORY));
    setRunningWorkflow(workflowKey);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      const responseText = await response.text();
      const responsePayload = responseText
        ? tryParseJson(responseText)
        : { ok: response.ok };

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}${
            responseText ? `: ${responseText}` : ''
          }`
        );
      }

      const finishedAt = new Date().toISOString();
      updateRunRecord(runId, {
        status: 'success',
        finishedAt,
        durationMs:
          new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        responsePayload,
      });
      message.success(`${workflowByKey[workflowKey].title} completed.`);
    } catch (error) {
      const finishedAt = new Date().toISOString();
      updateRunRecord(runId, {
        status: 'error',
        finishedAt,
        durationMs:
          new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        errorMessage:
          error instanceof Error ? error.message : 'Workflow execution failed.',
      });
      message.error(
        error instanceof Error ? error.message : 'Workflow execution failed.'
      );
    } finally {
      setRunningWorkflow(null);
    }
  };

  const handleTopicIntake = (values: TopicIntakeValues) => {
    void executeWorkflow('topic-intake', values as unknown as Record<string, unknown>);
  };

  const handleContentGeneration = (values: ContentGenerationValues) => {
    void executeWorkflow(
      'content-generation',
      values as unknown as Record<string, unknown>
    );
  };

  const handleApprovalPublish = (values: PublishValues) => {
    void executeWorkflow(
      'approval-publish',
      values as unknown as Record<string, unknown>
    );
  };

  const handleClosedLoop = (values: ClosedLoopValues) => {
    void executeWorkflow('closed-loop', values as unknown as Record<string, unknown>);
  };

  const tabs = [
    {
      key: 'topic-intake',
      label: workflowByKey['topic-intake'].title,
      children: (
        <Form<TopicIntakeValues>
          layout='vertical'
          className='sparkery-content-creator-form'
          initialValues={{
            campaignName: 'April Cleaning Growth Sprint',
            topic: 'End-of-lease cleaning checklist',
            audience: 'Property managers and busy tenants',
            region: 'Brisbane',
            sourceChannels: ['Google Trends', 'Customer FAQ'],
            infoFilters:
              'Only keep topics with local intent and cleaning purchase signals.',
            promptPack:
              'Use trust-focused language, local compliance references, and practical before/after outcomes.',
          }}
          onFinish={handleTopicIntake}
        >
          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label='Campaign Name'
                name='campaignName'
                rules={[{ required: true, message: 'Campaign name is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Topic'
                name='topic'
                rules={[{ required: true, message: 'Topic is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label='Target Audience'
                name='audience'
                rules={[{ required: true, message: 'Audience is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Region'
                name='region'
                rules={[{ required: true, message: 'Region is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label='Source Channels'
            name='sourceChannels'
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: 'Select at least one source channel.',
              },
            ]}
          >
            <Select mode='multiple' options={SOURCE_CHANNEL_OPTIONS.map(value => ({ value }))} />
          </Form.Item>
          <Form.Item label='Info Filters' name='infoFilters'>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label='Prompt Pack / Strategy' name='promptPack'>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            icon={<SendOutlined />}
            loading={runningWorkflow === 'topic-intake'}
            disabled={Boolean(runningWorkflow && runningWorkflow !== 'topic-intake')}
          >
            Run Topic Intake
          </Button>
        </Form>
      ),
    },
    {
      key: 'content-generation',
      label: workflowByKey['content-generation'].title,
      children: (
        <Form<ContentGenerationValues>
          layout='vertical'
          className='sparkery-content-creator-form'
          initialValues={{
            objective: 'Generate a 3-post conversion-focused mini campaign',
            format: 'short-video-script',
            tone: 'professional-friendly',
            targetLength: 220,
            seedKeywords: ['bond clean', 'end of lease', 'inspection-ready'],
            includeCallToAction: true,
            structureNotes:
              'Follow: hook -> pain -> proof -> offer -> CTA. Keep sentence rhythm suitable for short-form video.',
          }}
          onFinish={handleContentGeneration}
        >
          <Form.Item
            label='Objective'
            name='objective'
            rules={[{ required: true, message: 'Objective is required.' }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={8}>
              <Form.Item label='Format' name='format'>
                <Select
                  options={[
                    { value: 'short-video-script', label: 'Short Video Script' },
                    { value: 'carousel', label: 'Carousel' },
                    { value: 'long-post', label: 'Long Post' },
                    { value: 'email', label: 'Email Newsletter' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label='Tone' name='tone'>
                <Select
                  options={[
                    { value: 'professional-friendly', label: 'Professional Friendly' },
                    { value: 'expert-authoritative', label: 'Expert Authoritative' },
                    { value: 'light-and-human', label: 'Light and Human' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label='Target Length (words)' name='targetLength'>
                <InputNumber min={60} max={1200} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label='Seed Keywords' name='seedKeywords'>
            <Select
              mode='tags'
              tokenSeparators={[',']}
              placeholder='Add keywords and press Enter'
            />
          </Form.Item>
          <Form.Item
            label='Include CTA'
            name='includeCallToAction'
            valuePropName='checked'
          >
            <Switch />
          </Form.Item>
          <Form.Item label='Structure Notes' name='structureNotes'>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            icon={<RocketOutlined />}
            loading={runningWorkflow === 'content-generation'}
            disabled={Boolean(
              runningWorkflow && runningWorkflow !== 'content-generation'
            )}
          >
            Run Content Generation
          </Button>
        </Form>
      ),
    },
    {
      key: 'approval-publish',
      label: workflowByKey['approval-publish'].title,
      children: (
        <Form<PublishValues>
          layout='vertical'
          className='sparkery-content-creator-form'
          initialValues={{
            channels: ['Xiaohongshu', '微信公众号'],
            publishMode: 'instant',
            reviewer: 'ops@sparkery.com.au',
            approvalRequired: true,
            complianceNotes:
              'Ensure no unsupported claims and include location-specific disclaimers where needed.',
          }}
          onFinish={handleApprovalPublish}
        >
          <Form.Item
            label='Distribution Channels'
            name='channels'
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: 'Select at least one channel.',
              },
            ]}
          >
            <Select
              mode='multiple'
              options={DISTRIBUTION_CHANNEL_OPTIONS.map(value => ({ value }))}
            />
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label='Publish Mode' name='publishMode'>
                <Select
                  options={[
                    { value: 'instant', label: 'Publish Now' },
                    { value: 'scheduled', label: 'Schedule' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, next) => prev.publishMode !== next.publishMode}
              >
                {({ getFieldValue }) =>
                  getFieldValue('publishMode') === 'scheduled' ? (
                    <Form.Item
                      label='Schedule Time'
                      name='publishAt'
                      rules={[
                        {
                          required: true,
                          message: 'Please set a schedule time.',
                        },
                      ]}
                    >
                      <Input placeholder='2026-04-23 18:30' />
                    </Form.Item>
                  ) : (
                    <Form.Item label='Schedule Time (optional)' name='publishAt'>
                      <Input disabled placeholder='Only required in schedule mode' />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label='Reviewer' name='reviewer'>
            <Input />
          </Form.Item>
          <Form.Item
            label='Approval Required'
            name='approvalRequired'
            valuePropName='checked'
          >
            <Switch />
          </Form.Item>
          <Form.Item label='Compliance Notes' name='complianceNotes'>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            icon={<CheckCircleOutlined />}
            loading={runningWorkflow === 'approval-publish'}
            disabled={Boolean(
              runningWorkflow && runningWorkflow !== 'approval-publish'
            )}
          >
            Run Approval & Publish
          </Button>
        </Form>
      ),
    },
    {
      key: 'closed-loop',
      label: workflowByKey['closed-loop'].title,
      children: (
        <Form<ClosedLoopValues>
          layout='vertical'
          className='sparkery-content-creator-form'
          initialValues={{
            summaryPeriod: 'Last 7 days',
            attributionWindowDays: 7,
            coreMetrics: ['Impressions', 'CTR', 'Leads', 'Bookings'],
            optimizationNotes:
              'Prioritize hooks with high retention, remove low-intent keywords, and improve CTA clarity.',
          }}
          onFinish={handleClosedLoop}
        >
          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label='Summary Period' name='summaryPeriod'>
                <Select
                  options={[
                    { value: 'Last 7 days', label: 'Last 7 days' },
                    { value: 'Last 14 days', label: 'Last 14 days' },
                    { value: 'Last 30 days', label: 'Last 30 days' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label='Attribution Window (days)' name='attributionWindowDays'>
                <InputNumber min={1} max={90} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label='Core Metrics' name='coreMetrics'>
            <Select mode='multiple' options={METRIC_OPTIONS.map(value => ({ value }))} />
          </Form.Item>
          <Form.Item label='Optimization Notes' name='optimizationNotes'>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            icon={<SyncOutlined />}
            loading={runningWorkflow === 'closed-loop'}
            disabled={Boolean(runningWorkflow && runningWorkflow !== 'closed-loop')}
          >
            Run Closed Loop
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <div className='sparkery-content-creator-page'>
      <Card bordered={false} className='sparkery-content-creator-hero'>
        <Space direction='vertical' size={6} className='sparkery-content-creator-hero-body'>
          <Space size={8} wrap>
            <Tag color='blue'>Tools</Tag>
            <Tag color='purple'>Content Creator</Tag>
            <Tag color='geekblue'>n8n Workflow GUI</Tag>
          </Space>
          <Title level={3} className='sparkery-content-creator-title'>
            Content Creator Control Tower
          </Title>
          <Paragraph className='sparkery-content-creator-subtitle'>
            A sales-ready frontend cockpit for Topic Intake, Content Generation,
            Approval & Publish, and Cleaning Closed Loop workflows.
          </Paragraph>
        </Space>
        <Row gutter={[12, 12]} className='sparkery-content-creator-kpis'>
          <Col xs={12} md={6}>
            <Card bordered={false}>
              <Statistic title='Runs' value={runs.length} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card bordered={false}>
              <Statistic title='Success Rate' value={successRate} suffix='%' />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title='Completed'
                value={completedRuns.length}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card bordered={false}>
              <Statistic
                title='In Progress'
                value={runningWorkflow ? 1 : 0}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            title='Workflow Execution'
            extra={
              <Space>
                {WORKFLOWS.map(workflow => (
                  <Tag key={workflow.key}>{workflow.title}</Tag>
                ))}
              </Space>
            }
          >
            <Tabs
              className='sparkery-content-creator-tabs'
              items={tabs.map(item => ({
                ...item,
                label: (
                  <span title={workflowByKey[item.key as WorkflowKey].description}>
                    {item.label}
                  </span>
                ),
              }))}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Space direction='vertical' size={16} className='sparkery-content-creator-sidebar'>
            <Card
              bordered={false}
              title={
                <Space>
                  <ApiOutlined />
                  <span>Connection, Folder & Endpoints</span>
                </Space>
              }
              extra={
                <Button
                  type='link'
                  size='small'
                  onClick={() => setSettings(DEFAULT_SETTINGS)}
                >
                  Reset Defaults
                </Button>
              }
            >
              <Space direction='vertical' size={12} className='sparkery-content-creator-settings'>
                <Input
                  addonBefore='n8n Base URL'
                  value={settings.baseUrl}
                  onChange={event =>
                    setSettings(prev => ({
                      ...prev,
                      baseUrl: event.target.value,
                    }))
                  }
                  placeholder='http://localhost:5678'
                />
                <Input
                  addonBefore='Workflow Folder'
                  value={settings.workflowFolder}
                  onChange={event =>
                    setSettings(prev => ({
                      ...prev,
                      workflowFolder: event.target.value,
                    }))
                  }
                  placeholder='mvp-content-creator'
                />
                <Select
                  value={settings.industryPreset}
                  options={INDUSTRY_PRESETS.map(item => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  onChange={value =>
                    setSettings(prev => ({
                      ...prev,
                      industryPreset: value,
                    }))
                  }
                />
                <Alert
                  type='info'
                  showIcon
                  message={selectedIndustryPreset?.label}
                  description={selectedIndustryPreset?.promptHint}
                />

                {WORKFLOWS.map(workflow => (
                  <Input
                    key={workflow.key}
                    addonBefore={workflow.title}
                    value={settings.endpoints[workflow.key]}
                    onChange={event =>
                      updateEndpoint(workflow.key, event.target.value)
                    }
                    placeholder='/webhook/path'
                  />
                ))}

                <Alert
                  type='success'
                  showIcon
                  message='Credential Safety Rule Active'
                  description='This GUI only triggers n8n webhooks. LLM credentials must be selected from saved n8n credentials in nodes, never exposed in code.'
                />
              </Space>
            </Card>

            <Card bordered={false} title='Run History'>
              <List<WorkflowRunRecord>
                className='sparkery-content-creator-run-list'
                dataSource={runs}
                locale={{
                  emptyText:
                    'No workflow runs yet. Submit a workflow to populate execution history.',
                }}
                renderItem={run => (
                  <List.Item
                    actions={[
                      <Button
                        key={`view-${run.id}`}
                        size='small'
                        onClick={() => setInspectingRunId(run.id)}
                      >
                        View
                      </Button>,
                    ]}
                  >
                    <Space direction='vertical' size={2}>
                      <Space size={6} wrap>
                        <Text strong>{workflowByKey[run.workflowKey].title}</Text>
                        <Tag color={STATUS_TAG_COLOR[run.status]}>
                          {run.status.toUpperCase()}
                        </Tag>
                      </Space>
                      <Text type='secondary'>{formatDateTime(run.startedAt)}</Text>
                      <Text type='secondary'>Duration: {formatDuration(run.durationMs)}</Text>
                      <Text type='secondary' ellipsis={{ tooltip: run.endpoint }}>
                        {run.endpoint}
                      </Text>
                      {run.errorMessage ? (
                        <Text type='danger'>{run.errorMessage}</Text>
                      ) : null}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>
      </Row>

      <Modal
        title='Workflow Run Details'
        open={Boolean(activeRun)}
        onCancel={() => setInspectingRunId(null)}
        footer={[
          <Button key='close' onClick={() => setInspectingRunId(null)}>
            Close
          </Button>,
        ]}
        width={900}
      >
        {activeRun ? (
          <Space direction='vertical' size={12} className='sparkery-content-creator-run-detail'>
            <Space size={8} wrap>
              <Tag color={STATUS_TAG_COLOR[activeRun.status]}>
                {activeRun.status.toUpperCase()}
              </Tag>
              <Tag>{workflowByKey[activeRun.workflowKey].title}</Tag>
              <Tag>{formatDateTime(activeRun.startedAt)}</Tag>
              <Tag>{formatDuration(activeRun.durationMs)}</Tag>
            </Space>

            {activeRun.errorMessage ? (
              <Alert
                type='error'
                showIcon
                message='Workflow Error'
                description={activeRun.errorMessage}
              />
            ) : null}

            <div className='sparkery-content-creator-json-block'>
              <Text strong>Request Payload</Text>
              <pre className='sparkery-content-creator-json'>
                {stringifyPayload(activeRun.requestPayload)}
              </pre>
            </div>
            <div className='sparkery-content-creator-json-block'>
              <Text strong>Response Payload</Text>
              <pre className='sparkery-content-creator-json'>
                {stringifyPayload(activeRun.responsePayload || {})}
              </pre>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default ContentCreatorPage;
