# Invoice OCR 工作流设计文档

## 概述

本设计文档详细描述了 Invoice OCR 工作流功能的技术实现方案。该功能将在现有的工作流管理系统中新增一个专门用于发票 OCR 处理的工作流，包括文件上传、工作流执行、结果展示和设置管理等核心功能。

## 技术标准对齐

### 前端技术栈
- **框架**: React 18 + TypeScript
- **状态管理**: Redux Toolkit
- **UI组件库**: Ant Design 5.x
- **路由**: React Router v6
- **HTTP客户端**: Axios
- **构建工具**: Vite

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 组件采用函数式组件 + Hooks
- 使用 CSS Modules 或 styled-components

## 代码复用分析

### 可复用的现有组件
1. **WorkflowCard.tsx** - 工作流卡片组件，可直接复用展示 Invoice OCR 工作流
2. **WorkflowGrid.tsx** - 工作流网格布局，已支持动态工作流列表
3. **WorkflowSidebar.tsx** - 侧边栏组件，可扩展新的工作流项
4. **Upload组件** - Profile页面中的文件上传功能可作为参考

### 可复用的服务和类型
1. **workflowService.ts** - 工作流服务，可扩展 Invoice OCR 相关API
2. **types.ts** - 现有工作流类型定义，可扩展 Invoice OCR 特定类型
3. **路由配置** - routes.ts 中的路由模式可直接应用

## 架构

### 组件架构
```
InvoiceOCRWorkflow/
├── components/
│   ├── InvoiceOCRCard.tsx          # Invoice OCR 工作流卡片
│   ├── InvoiceFileUpload.tsx       # 文件上传组件
│   ├── InvoiceOCRResults.tsx       # 结果展示组件
│   ├── InvoiceOCRSettings.tsx      # 设置组件
│   └── InvoiceOCRProgress.tsx      # 进度展示组件
├── pages/
│   └── InvoiceOCRPage.tsx          # Invoice OCR 主页面
├── services/
│   └── invoiceOCRService.ts        # Invoice OCR 服务
├── types/
│   └── invoiceOCR.ts               # Invoice OCR 类型定义
└── hooks/
    └── useInvoiceOCR.tsx           # Invoice OCR 自定义Hook
```

### 数据流架构
```
用户操作 → React组件 → Redux Action → Service层 → API调用 → 后端处理
                ↓
            状态更新 ← Redux Reducer ← API响应 ← Webhook回调
```

## 组件和接口

### 1. InvoiceOCRCard 组件
**位置**: `src/pages/InformationDashboard/components/InvoiceOCRCard.tsx`

**功能**: 在工作流列表中展示 Invoice OCR 工作流卡片

**Props接口**:
```typescript
interface InvoiceOCRCardProps {
  workflow: WorkflowInfo;
  size?: 'small' | 'default';
  onTrigger: (workflowId: string) => void;
  onNavigate: (workflowId: string) => void;
}
```

**复用**: 基于现有 WorkflowCard 组件，添加 Invoice OCR 特定的图标和样式

### 2. InvoiceFileUpload 组件
**位置**: `src/pages/InformationDashboard/components/InvoiceFileUpload.tsx`

**功能**: 多文件上传，支持 PDF 和图片格式，带进度条和删除功能

**Props接口**:
```typescript
interface InvoiceFileUploadProps {
  files: UploadFile[];
  onFilesChange: (files: UploadFile[]) => void;
  onUpload: (files: UploadFile[]) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

interface UploadFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error' | 'removed';
  percent?: number;
  response?: any;
  error?: any;
  originFileObj?: File;
}
```

**技术实现**:
- 使用 Ant Design Upload 组件
- 支持拖拽上传
- 文件类型验证: `.pdf`, `.jpg`, `.jpeg`, `.png`
- 文件大小限制: 10MB
- 进度条展示上传状态

### 3. InvoiceOCRPage 组件
**位置**: `src/pages/InformationDashboard/InvoiceOCRPage.tsx`

**功能**: Invoice OCR 主页面，包含文件上传、工作流执行、结果展示

**State接口**:
```typescript
interface InvoiceOCRPageState {
  files: UploadFile[];
  uploading: boolean;
  executing: boolean;
  results: InvoiceOCRResult | null;
  error: string | null;
  settings: InvoiceOCRSettings;
}
```

### 4. InvoiceOCRResults 组件
**位置**: `src/pages/InformationDashboard/components/InvoiceOCRResults.tsx`

**功能**: 展示 OCR 处理结果和 Google Sheets 跳转按钮

**Props接口**:
```typescript
interface InvoiceOCRResultsProps {
  results: InvoiceOCRResult;
  onViewSheet: () => void;
  loading?: boolean;
}
```

### 5. InvoiceOCRSettings 组件
**位置**: `src/pages/InformationDashboard/components/InvoiceOCRSettings.tsx`

**功能**: 工作流设置，包括名称和 Webhook 地址修改

**Props接口**:
```typescript
interface InvoiceOCRSettingsProps {
  settings: InvoiceOCRSettings;
  onSettingsChange: (settings: InvoiceOCRSettings) => void;
  onSave: () => Promise<void>;
  loading?: boolean;
}
```

## 数据模型

### Invoice OCR 工作流类型
```typescript
// 扩展现有 WorkflowInfo 类型
interface InvoiceOCRWorkflow extends WorkflowInfo {
  type: 'invoice-ocr';
  settings: InvoiceOCRSettings;
}

// Invoice OCR 设置
interface InvoiceOCRSettings {
  workflowName: string;
  webhookUrl: string;
  googleSheetUrl: string;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  autoExecute: boolean;
}

// Invoice OCR 结果
interface InvoiceOCRResult {
  id: string;
  executionId: string;
  status: 'processing' | 'completed' | 'failed';
  processedFiles: ProcessedFile[];
  extractedData: InvoiceData[];
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalAmount: number;
    currency: string;
  };
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// 处理后的文件
interface ProcessedFile {
  originalName: string;
  fileId: string;
  status: 'success' | 'failed';
  extractedData?: InvoiceData;
  error?: string;
  processingTime: number;
}

// 发票数据
interface InvoiceData {
  invoiceNumber: string;
  date: string;
  vendor: string;
  amount: number;
  currency: string;
  taxAmount?: number;
  description?: string;
  lineItems?: InvoiceLineItem[];
  confidence: number;
}

// 发票行项目
interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
```

### API 接口
```typescript
// 触发 Invoice OCR 工作流
interface TriggerInvoiceOCRRequest {
  files: File[];
  settings?: Partial<InvoiceOCRSettings>;
}

interface TriggerInvoiceOCRResponse {
  executionId: string;
  status: 'started';
  estimatedTime: number; // 秒
}

// 获取 OCR 结果
interface GetInvoiceOCRResultRequest {
  executionId: string;
}

interface GetInvoiceOCRResultResponse {
  result: InvoiceOCRResult;
}

// 更新设置
interface UpdateInvoiceOCRSettingsRequest {
  settings: InvoiceOCRSettings;
}

interface UpdateInvoiceOCRSettingsResponse {
  success: boolean;
  settings: InvoiceOCRSettings;
}
```

## 错误处理

### 文件上传错误
- 文件类型不支持
- 文件大小超限
- 网络上传失败
- 服务器存储错误

### 工作流执行错误
- Webhook 地址无效
- OCR 服务不可用
- 处理超时
- 文件损坏或无法读取

### 结果获取错误
- 执行ID无效
- 结果尚未准备就绪
- 权限不足

### 错误处理策略
```typescript
// 错误类型定义
type InvoiceOCRError = 
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED'
  | 'WEBHOOK_INVALID'
  | 'OCR_SERVICE_UNAVAILABLE'
  | 'PROCESSING_TIMEOUT'
  | 'EXECUTION_NOT_FOUND'
  | 'PERMISSION_DENIED';

// 错误处理函数
const handleInvoiceOCRError = (error: InvoiceOCRError, context?: any) => {
  const errorMessages = {
    INVALID_FILE_TYPE: '不支持的文件类型，请上传 PDF 或图片文件',
    FILE_TOO_LARGE: '文件大小超过限制，请上传小于 10MB 的文件',
    UPLOAD_FAILED: '文件上传失败，请检查网络连接后重试',
    WEBHOOK_INVALID: 'Webhook 地址无效，请检查设置',
    OCR_SERVICE_UNAVAILABLE: 'OCR 服务暂时不可用，请稍后重试',
    PROCESSING_TIMEOUT: '处理超时，请重新提交',
    EXECUTION_NOT_FOUND: '执行记录不存在',
    PERMISSION_DENIED: '权限不足，无法访问该资源'
  };
  
  return {
    message: errorMessages[error],
    type: 'error' as const,
    context
  };
};
```

## 测试策略

### 单元测试
- 组件渲染测试
- Props 传递测试
- 事件处理测试
- 状态管理测试

### 集成测试
- 文件上传流程测试
- 工作流执行流程测试
- API 调用测试
- 错误处理测试

### E2E 测试
- 完整用户流程测试
- 多文件上传测试
- 设置修改测试
- 结果展示测试

### 测试工具
- **单元测试**: Jest + React Testing Library
- **集成测试**: MSW (Mock Service Worker)
- **E2E测试**: Playwright

## 性能优化

### 文件上传优化
- 分片上传大文件
- 并发上传限制
- 上传进度实时更新
- 失败重试机制

### 组件性能优化
- React.memo 优化重渲染
- useMemo 缓存计算结果
- useCallback 优化事件处理
- 虚拟滚动处理大量结果

### 状态管理优化
- Redux Toolkit 减少样板代码
- RTK Query 缓存 API 响应
- 选择器优化状态订阅

## 路由集成

### 新增路由
```typescript
// 在 routes.ts 中添加
{
  path: '/dashboard/invoice-ocr',
  element: lazy(() => import('../pages/InformationDashboard/InvoiceOCRPage')),
  meta: {
    title: 'Invoice OCR',
    requiresAuth: true
  }
}
```

### 导航集成
```typescript
// 在 locales 中添加
{
  'menu.dashboard.invoice-ocr': 'Invoice OCR',
  'menu.dashboard.invoice-ocr.description': '发票 OCR 处理'
}
```

## 部署考虑

### 环境变量
```typescript
// 新增环境变量
VITE_INVOICE_OCR_WEBHOOK_URL=https://n8n.wendealai.com/webhook/invoiceOCR
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing
VITE_MAX_FILE_SIZE=10485760  # 10MB
```

### 构建优化
- 代码分割减少初始包大小
- 图片资源优化
- 依赖包分析和优化

## 安全考虑

### 文件上传安全
- 文件类型白名单验证
- 文件大小限制
- 文件内容扫描
- 上传路径限制

### API 安全
- 请求认证和授权
- 输入参数验证
- 敏感信息加密
- CORS 配置

### 数据安全
- 敏感数据脱敏
- 传输加密 (HTTPS)
- 存储加密
- 访问日志记录