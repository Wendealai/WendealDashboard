/**
 * Invoice OCR Redux Slice
 * 管理 Invoice OCR 工作流的状态和异步操作
 */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
// import { invoiceOCRService } from '../../services/invoiceOCRService';
import {
  DEFAULT_INVOICE_OCR_SETTINGS,
  type InvoiceOCRWorkflow,
  type InvoiceOCRSettings,
  type InvoiceOCRResult,
  type InvoiceOCRStatus,
  type InvoiceOCRBatchTask,
  type InvoiceOCRStatistics,
  type InvoiceOCRQueryParams,
  type CreateInvoiceOCRWorkflowRequest,
  type UpdateInvoiceOCRWorkflowRequest,
  type InvoiceOCRUploadRequest,
  type InvoiceOCRExecution,
} from '../../pages/InformationDashboard/types/invoiceOCR';

/**
 * Invoice OCR 状态接口
 */
export interface InvoiceOCRState {
  // 工作流相关
  workflows: InvoiceOCRWorkflow[];
  currentWorkflow: InvoiceOCRWorkflow | null;
  workflowLoading: boolean;
  workflowError: string | null;

  // 处理结果相关
  results: InvoiceOCRResult[];
  currentResult: InvoiceOCRResult | null;
  resultsLoading: boolean;
  resultsError: string | null;

  // 执行记录相关
  executions: InvoiceOCRExecution[];
  executionsLoading: boolean;
  executionsError: string | null;

  // 批处理任务相关
  batchTasks: InvoiceOCRBatchTask[];
  currentBatchTask: InvoiceOCRBatchTask | null;
  batchTasksLoading: boolean;
  batchTasksError: string | null;

  // 统计信息
  statistics: InvoiceOCRStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;

  // 设置相关
  settings: InvoiceOCRSettings;
  settingsLoading: boolean;
  settingsError: string | null;

  // 上传相关
  uploadProgress: Record<string, number>;
  uploadLoading: boolean;
  uploadError: string | null;

  // UI 状态
  selectedWorkflowId: string | null;
  selectedResultIds: string[];
  filterParams: InvoiceOCRQueryParams;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}

/**
 * 初始状态
 */
const initialState: InvoiceOCRState = {
  // 工作流相关
  workflows: [],
  currentWorkflow: null,
  workflowLoading: false,
  workflowError: null,

  // 处理结果相关
  results: [],
  currentResult: null,
  resultsLoading: false,
  resultsError: null,

  // 执行记录相关
  executions: [],
  executionsLoading: false,
  executionsError: null,

  // 批处理任务相关
  batchTasks: [],
  currentBatchTask: null,
  batchTasksLoading: false,
  batchTasksError: null,

  // 统计信息
  statistics: null,
  statisticsLoading: false,
  statisticsError: null,

  // 设置相关
  settings: DEFAULT_INVOICE_OCR_SETTINGS,
  settingsLoading: false,
  settingsError: null,

  // 上传相关
  uploadProgress: {},
  uploadLoading: false,
  uploadError: null,

  // UI 状态
  selectedWorkflowId: null,
  selectedResultIds: [],
  filterParams: {
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
};

// ==================== 异步 Thunks ====================

/**
 * 获取 Invoice OCR 工作流列表
 */
export const fetchInvoiceOCRWorkflows = createAsyncThunk(
  'invoiceOCR/fetchWorkflows',
  async (_, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockWorkflows: InvoiceOCRWorkflow[] = [
        {
          id: 'invoice-ocr-1',
          name: 'Invoice OCR Workflow',
          description: '智能发票识别与数据提取工作流',
          type: 'invoice-ocr',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionCount: 1250,
          successRate: 0.92,
          author: {
            id: 'user-1',
            name: 'System Admin',
            avatar: '',
          },
          settings: DEFAULT_INVOICE_OCR_SETTINGS,
          statistics: {
            totalProcessed: 1250,
            successCount: 1180,
            failureCount: 70,
            averageProcessingTime: 15.5,
            averageConfidence: 0.92,
            monthlyProcessed: 320,
            storageUsed: 2048,
          },
        },
      ];

      return mockWorkflows;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取工作流失败'
      );
    }
  }
);

/**
 * 创建 Invoice OCR 工作流
 */
export const createInvoiceOCRWorkflow = createAsyncThunk(
  'invoiceOCR/createWorkflow',
  async (request: CreateInvoiceOCRWorkflowRequest, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newWorkflow: InvoiceOCRWorkflow = {
        id: `invoice-ocr-${Date.now()}`,
        name: request.name,
        description: request.description || '',
        type: 'invoice-ocr',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        executionCount: 0,
        successRate: 0,
        author: {
          id: 'user-1',
          name: 'System Admin',
          avatar: '',
        },
        settings: { ...DEFAULT_INVOICE_OCR_SETTINGS, ...request.settings },
        statistics: {
          totalProcessed: 0,
          successCount: 0,
          failureCount: 0,
          averageProcessingTime: 0,
          averageConfidence: 0,
          monthlyProcessed: 0,
          storageUsed: 0,
        },
      };

      return newWorkflow;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '创建工作流失败'
      );
    }
  }
);

/**
 * 更新 Invoice OCR 工作流
 */
export const updateInvoiceOCRWorkflow = createAsyncThunk(
  'invoiceOCR/updateWorkflow',
  async (
    { id, request }: { id: string; request: UpdateInvoiceOCRWorkflowRequest },
    { rejectWithValue }
  ) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { id, updates: request };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '更新工作流失败'
      );
    }
  }
);

/**
 * 删除 Invoice OCR 工作流
 */
export const deleteInvoiceOCRWorkflow = createAsyncThunk(
  'invoiceOCR/deleteWorkflow',
  async (id: string, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 800));

      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '删除工作流失败'
      );
    }
  }
);

/**
 * 上传文件并开始 OCR 处理
 */
export const uploadAndProcessFiles = createAsyncThunk(
  'invoiceOCR/uploadAndProcess',
  async (request: InvoiceOCRUploadRequest, { rejectWithValue, dispatch }) => {
    try {
      // 模拟文件上传进度
      for (let progress = 0; progress <= 100; progress += 10) {
        dispatch(updateUploadProgress({ fileId: 'batch-upload', progress }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockBatchTask: InvoiceOCRBatchTask = {
        id: `batch-${Date.now()}`,
        workflowId: request.workflowId,
        name: request.batchName || `批处理任务 ${new Date().toLocaleString()}`,
        files: request.files.map((file, index) => ({
          id: `file-${index}`,
          name: file.name,
          size: file.size,
          type: file.name.split('.').pop() as any,
          status: 'completed' as InvoiceOCRStatus,
          result: {
            id: `result-${index}`,
            workflowId: request.workflowId,
            executionId: `exec-${index}`,
            originalFile: {
              name: file.name,
              size: file.size,
              type: file.name.split('.').pop() as any,
              uploadedAt: new Date().toISOString(),
            },
            status: 'completed' as InvoiceOCRStatus,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            processingDuration: Math.floor(Math.random() * 30) + 10,
            confidence: Math.random() * 0.3 + 0.7,
          },
        })),
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        progress: {
          total: request.files.length,
          completed: request.files.length,
          failed: 0,
          percentage: 100,
        },
      };

      return mockBatchTask;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '文件处理失败'
      );
    }
  }
);

/**
 * 获取 OCR 处理结果
 */
export const fetchInvoiceOCRResults = createAsyncThunk(
  'invoiceOCR/fetchResults',
  async (params: InvoiceOCRQueryParams, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockResults: InvoiceOCRResult[] = [];
      const total = 50;

      for (let i = 0; i < Math.min(params.pageSize || 20, total); i++) {
        mockResults.push({
          id: `result-${i}`,
          workflowId: 'invoice-ocr-1',
          executionId: `exec-${i}`,
          originalFile: {
            name: `invoice_${i + 1}.pdf`,
            size: Math.floor(Math.random() * 5000000) + 100000,
            type: 'pdf',
            uploadedAt: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          status: ['completed', 'processing', 'failed'][
            Math.floor(Math.random() * 3)
          ] as InvoiceOCRStatus,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          processingDuration: Math.floor(Math.random() * 60) + 5,
          confidence: Math.random() * 0.4 + 0.6,
        });
      }

      return {
        items: mockResults,
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total,
          totalPages: Math.ceil(total / (params.pageSize || 20)),
        },
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取结果失败'
      );
    }
  }
);

/**
 * 获取统计信息
 */
export const fetchInvoiceOCRStatistics = createAsyncThunk(
  'invoiceOCR/fetchStatistics',
  async (_workflowId: string, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockStatistics: InvoiceOCRStatistics = {
        totalProcessed: 1250,
        successCount: 1180,
        failureCount: 70,
        averageProcessingTime: 15.5,
        averageConfidence: 0.92,
        monthlyProcessed: 320,
        storageUsed: 2048,
      };

      return mockStatistics;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取统计信息失败'
      );
    }
  }
);

/**
 * 获取执行记录
 */
export const fetchInvoiceOCRExecutions = createAsyncThunk(
  'invoiceOCR/fetchExecutions',
  async (_params: InvoiceOCRQueryParams, { rejectWithValue }) => {
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 700));

      const mockExecutions: InvoiceOCRExecution[] = [];

      for (let i = 0; i < 10; i++) {
        mockExecutions.push({
          id: `exec-${i}`,
          workflowId: 'invoice-ocr-1',
          status: ['completed', 'running', 'failed'][
            Math.floor(Math.random() * 3)
          ] as any,
          startedAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          finishedAt: new Date().toISOString(),
          duration: Math.floor(Math.random() * 300) + 30,
          fileInfo: {
            originalName: `invoice_${i + 1}.pdf`,
            size: Math.floor(Math.random() * 5000000) + 100000,
            type: 'pdf',
          },
          processingStats: {
            confidence: Math.random() * 0.4 + 0.6,
            processingTime: Math.floor(Math.random() * 60) + 5,
            extractedFieldsCount: Math.floor(Math.random() * 20) + 10,
          },
        });
      }

      return mockExecutions;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : '获取执行记录失败'
      );
    }
  }
);

// ==================== Slice 定义 ====================

const invoiceOCRSlice = createSlice({
  name: 'invoiceOCR',
  initialState,
  reducers: {
    // UI 状态管理
    setSelectedWorkflow: (state, action: PayloadAction<string | null>) => {
      state.selectedWorkflowId = action.payload;
    },

    setSelectedResults: (state, action: PayloadAction<string[]>) => {
      state.selectedResultIds = action.payload;
    },

    toggleResultSelection: (state, action: PayloadAction<string>) => {
      const resultId = action.payload;
      const index = state.selectedResultIds.indexOf(resultId);
      if (index > -1) {
        state.selectedResultIds.splice(index, 1);
      } else {
        state.selectedResultIds.push(resultId);
      }
    },

    setFilterParams: (
      state,
      action: PayloadAction<Partial<InvoiceOCRQueryParams>>
    ) => {
      state.filterParams = { ...state.filterParams, ...action.payload };
    },

    setPagination: (
      state,
      action: PayloadAction<Partial<typeof initialState.pagination>>
    ) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // 上传进度管理
    updateUploadProgress: (
      state,
      action: PayloadAction<{ fileId: string; progress: number }>
    ) => {
      const { fileId, progress } = action.payload;
      state.uploadProgress[fileId] = progress;
    },

    clearUploadProgress: state => {
      state.uploadProgress = {};
    },

    // 设置当前工作流
    setCurrentWorkflow: (
      state,
      action: PayloadAction<InvoiceOCRWorkflow | null>
    ) => {
      state.currentWorkflow = action.payload;
    },

    // 设置当前结果
    setCurrentResult: (
      state,
      action: PayloadAction<InvoiceOCRResult | null>
    ) => {
      state.currentResult = action.payload;
    },

    // 设置当前批处理任务
    setCurrentBatchTask: (
      state,
      action: PayloadAction<InvoiceOCRBatchTask | null>
    ) => {
      state.currentBatchTask = action.payload;
    },

    // 清除错误
    clearErrors: state => {
      state.workflowError = null;
      state.resultsError = null;
      state.executionsError = null;
      state.batchTasksError = null;
      state.statisticsError = null;
      state.settingsError = null;
      state.uploadError = null;
    },

    // 重置状态
    resetState: () => initialState,
  },

  extraReducers: builder => {
    // 获取工作流列表
    builder
      .addCase(fetchInvoiceOCRWorkflows.pending, state => {
        state.workflowLoading = true;
        state.workflowError = null;
      })
      .addCase(fetchInvoiceOCRWorkflows.fulfilled, (state, action) => {
        state.workflowLoading = false;
        state.workflows = action.payload;
        state.workflowError = null;
      })
      .addCase(fetchInvoiceOCRWorkflows.rejected, (state, action) => {
        state.workflowLoading = false;
        state.workflowError = action.payload as string;
      })

      // 创建工作流
      .addCase(createInvoiceOCRWorkflow.pending, state => {
        state.workflowLoading = true;
        state.workflowError = null;
      })
      .addCase(createInvoiceOCRWorkflow.fulfilled, (state, action) => {
        state.workflowLoading = false;
        state.workflows.push(action.payload);
        state.currentWorkflow = action.payload;
        state.workflowError = null;
      })
      .addCase(createInvoiceOCRWorkflow.rejected, (state, action) => {
        state.workflowLoading = false;
        state.workflowError = action.payload as string;
      })

      // 更新工作流
      .addCase(updateInvoiceOCRWorkflow.pending, state => {
        state.workflowLoading = true;
        state.workflowError = null;
      })
      .addCase(updateInvoiceOCRWorkflow.fulfilled, (state, action) => {
        state.workflowLoading = false;
        const { id, updates } = action.payload;
        const index = state.workflows.findIndex(w => w.id === id);
        if (index > -1) {
          const existingWorkflow = state.workflows[index];
          if (existingWorkflow) {
            state.workflows[index] = {
              ...existingWorkflow,
              ...updates,
              settings: updates.settings
                ? { ...existingWorkflow.settings, ...updates.settings }
                : existingWorkflow.settings,
              updatedAt: new Date().toISOString(),
            };
            if (state.currentWorkflow?.id === id) {
              state.currentWorkflow = state.workflows[index] || null;
            }
          }
        }
        state.workflowError = null;
      })
      .addCase(updateInvoiceOCRWorkflow.rejected, (state, action) => {
        state.workflowLoading = false;
        state.workflowError = action.payload as string;
      })

      // 删除工作流
      .addCase(deleteInvoiceOCRWorkflow.pending, state => {
        state.workflowLoading = true;
        state.workflowError = null;
      })
      .addCase(deleteInvoiceOCRWorkflow.fulfilled, (state, action) => {
        state.workflowLoading = false;
        const id = action.payload;
        state.workflows = state.workflows.filter(w => w.id !== id);
        if (state.currentWorkflow?.id === id) {
          state.currentWorkflow = null;
        }
        state.workflowError = null;
      })
      .addCase(deleteInvoiceOCRWorkflow.rejected, (state, action) => {
        state.workflowLoading = false;
        state.workflowError = action.payload as string;
      })

      // 上传和处理文件
      .addCase(uploadAndProcessFiles.pending, state => {
        state.uploadLoading = true;
        state.uploadError = null;
      })
      .addCase(uploadAndProcessFiles.fulfilled, (state, action) => {
        state.uploadLoading = false;
        state.batchTasks.push(action.payload);
        state.currentBatchTask = action.payload;
        state.uploadError = null;
        state.uploadProgress = {};
      })
      .addCase(uploadAndProcessFiles.rejected, (state, action) => {
        state.uploadLoading = false;
        state.uploadError = action.payload as string;
        state.uploadProgress = {};
      })

      // 获取处理结果
      .addCase(fetchInvoiceOCRResults.pending, state => {
        state.resultsLoading = true;
        state.resultsError = null;
      })
      .addCase(fetchInvoiceOCRResults.fulfilled, (state, action) => {
        state.resultsLoading = false;
        state.results = action.payload.items;
        state.pagination = {
          current: action.payload.pagination.page,
          pageSize: action.payload.pagination.pageSize,
          total: action.payload.pagination.total,
        };
        state.resultsError = null;
      })
      .addCase(fetchInvoiceOCRResults.rejected, (state, action) => {
        state.resultsLoading = false;
        state.resultsError = action.payload as string;
      })

      // 获取统计信息
      .addCase(fetchInvoiceOCRStatistics.pending, state => {
        state.statisticsLoading = true;
        state.statisticsError = null;
      })
      .addCase(fetchInvoiceOCRStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.statistics = action.payload;
        state.statisticsError = null;
      })
      .addCase(fetchInvoiceOCRStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.statisticsError = action.payload as string;
      })

      // 获取执行记录
      .addCase(fetchInvoiceOCRExecutions.pending, state => {
        state.executionsLoading = true;
        state.executionsError = null;
      })
      .addCase(fetchInvoiceOCRExecutions.fulfilled, (state, action) => {
        state.executionsLoading = false;
        state.executions = action.payload;
        state.executionsError = null;
      })
      .addCase(fetchInvoiceOCRExecutions.rejected, (state, action) => {
        state.executionsLoading = false;
        state.executionsError = action.payload as string;
      });
  },
});

// 导出 actions
export const {
  setSelectedWorkflow,
  setSelectedResults,
  toggleResultSelection,
  setFilterParams,
  setPagination,
  updateUploadProgress,
  clearUploadProgress,
  setCurrentWorkflow,
  setCurrentResult,
  setCurrentBatchTask,
  clearErrors,
  resetState,
} = invoiceOCRSlice.actions;

// 导出 reducer
export default invoiceOCRSlice.reducer;

// 导出选择器
export const selectInvoiceOCRState = (state: { invoiceOCR: InvoiceOCRState }) =>
  state.invoiceOCR;
export const selectInvoiceOCRWorkflows = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.workflows;
export const selectCurrentInvoiceOCRWorkflow = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.currentWorkflow;
export const selectInvoiceOCRResults = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.results;
export const selectCurrentInvoiceOCRResult = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.currentResult;
export const selectInvoiceOCRStatistics = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.statistics;
export const selectInvoiceOCRExecutions = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.executions;
export const selectInvoiceOCRBatchTasks = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.batchTasks;
export const selectCurrentInvoiceOCRBatchTask = (state: {
  invoiceOCR: InvoiceOCRState;
}) => state.invoiceOCR.currentBatchTask;
export const selectInvoiceOCRLoading = (state: {
  invoiceOCR: InvoiceOCRState;
}) => ({
  workflow: state.invoiceOCR.workflowLoading,
  results: state.invoiceOCR.resultsLoading,
  executions: state.invoiceOCR.executionsLoading,
  statistics: state.invoiceOCR.statisticsLoading,
  upload: state.invoiceOCR.uploadLoading,
});
export const selectInvoiceOCRErrors = (state: {
  invoiceOCR: InvoiceOCRState;
}) => ({
  workflow: state.invoiceOCR.workflowError,
  results: state.invoiceOCR.resultsError,
  executions: state.invoiceOCR.executionsError,
  statistics: state.invoiceOCR.statisticsError,
  upload: state.invoiceOCR.uploadError,
});
export const selectUploadProgress = (state: { invoiceOCR: InvoiceOCRState }) =>
  state.invoiceOCR.uploadProgress;
