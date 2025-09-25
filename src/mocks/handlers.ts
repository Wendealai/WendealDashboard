import { http, HttpResponse } from 'msw';

// Notification item interface for mocks
interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  content?: string;
  message?: string;
  timestamp: string;
  read: boolean;
  category: string;
  priority: 'low' | 'medium' | 'high';
  actionText?: string;
  actionUrl?: string;
  duration?: number;
}

// 模拟用户数据
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@wendeal.com',
    displayName: '管理员',
    role: 'admin',
    avatar: null,
    status: 'active',
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'user1',
    email: 'user1@wendeal.com',
    displayName: '普通用户',
    role: 'user',
    avatar: null,
    status: 'active',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    username: 'user2',
    email: 'user2@wendeal.com',
    displayName: '测试用户',
    role: 'user',
    avatar: null,
    status: 'inactive',
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// 模拟仪表板数据
const mockDashboardData = {
  stats: {
    totalUsers: 1234,
    activeUsers: 856,
    totalRevenue: 98765.43,
    monthlyGrowth: 12.5,
    systemLoad: 68,
    memoryUsage: 72,
    diskUsage: 45,
    networkLatency: 23,
  },
  chartData: {
    userGrowth: Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}月`,
      users: Math.floor(Math.random() * 1000) + 500,
      revenue: Math.floor(Math.random() * 50000) + 20000,
    })),
    deviceDistribution: [
      { type: '桌面端', value: 45, color: '#1890ff' },
      { type: '移动端', value: 35, color: '#52c41a' },
      { type: '平板端', value: 20, color: '#faad14' },
    ],
    activityData: Array.from({ length: 7 }, (_, i) => ({
      day: `第${i + 1}天`,
      visits: Math.floor(Math.random() * 1000) + 200,
      pageViews: Math.floor(Math.random() * 5000) + 1000,
    })),
  },
};

// 模拟通知数据
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'info',
    title: '系统维护通知',
    content:
      '系统将于今晚 23:00-01:00 进行例行维护，期间可能影响部分功能使用。',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'system',
    priority: 'medium',
    actionText: '查看详情',
    actionUrl: '/maintenance',
  },
  {
    id: '2',
    type: 'success',
    title: '数据备份完成',
    content: '您的数据已成功备份到云端，备份文件大小：2.3GB。',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'system',
    priority: 'low',
  },
  {
    id: '3',
    type: 'warning',
    title: '安全提醒',
    content: '检测到您的账户在异地登录，如非本人操作请及时修改密码。',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'security',
    priority: 'high',
    actionText: '立即处理',
    actionUrl: '/security',
  },
];

// 模拟活动日志
const mockActivities = Array.from({ length: 20 }, (_, i) => ({
  id: `activity-${i + 1}`,
  user: mockUsers[Math.floor(Math.random() * mockUsers.length)],
  action: ['登录', '退出', '创建文档', '编辑资料', '删除文件'][
    Math.floor(Math.random() * 5)
  ],
  target: ['用户管理', '文档系统', '个人资料', '系统设置'][
    Math.floor(Math.random() * 4)
  ],
  timestamp: new Date(
    Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
  ).toISOString(),
  ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
  status: Math.random() > 0.1 ? 'success' : 'failed',
}));

export const handlers = [
  // 认证相关API
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = (await request.json()) as {
      username: string;
      password: string;
    };

    // 简单的认证逻辑
    if (
      (username === 'admin' && password === 'admin') ||
      (username === 'user' && password === 'user')
    ) {
      const user = mockUsers.find(u => u.username === username);
      return HttpResponse.json({
        success: true,
        data: {
          user,
          token: 'mock-jwt-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
        },
      });
    }

    return HttpResponse.json(
      { success: false, message: '用户名或密码错误' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true, message: '退出成功' });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: mockUsers[0], // 返回管理员用户
    });
  }),

  // 用户管理API
  http.get('/api/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';

    let filteredUsers = mockUsers;
    if (search) {
      filteredUsers = mockUsers.filter(
        user =>
          user.username.includes(search) ||
          user.email.includes(search) ||
          user.displayName.includes(search)
      );
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = filteredUsers.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        total: filteredUsers.length,
        page,
        pageSize,
      },
    });
  }),

  http.post('/api/users', async ({ request }) => {
    const userData = (await request.json()) as Record<string, any>;
    const newUser = {
      id: Date.now().toString(),
      username: userData.username || '',
      email: userData.email || '',
      displayName: userData.displayName || '',
      role: userData.role || 'user',
      avatar: userData.avatar || null,
      status: 'active',
      lastLogin: userData.lastLogin || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);

    return HttpResponse.json({
      success: true,
      data: newUser,
      message: '用户创建成功',
    });
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const { id } = params;
    const userData = (await request.json()) as Record<string, any>;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    const existingUser = mockUsers[userIndex]!;
    mockUsers[userIndex] = {
      id: existingUser.id,
      username: userData.username ?? existingUser.username,
      email: userData.email ?? existingUser.email,
      displayName: userData.displayName ?? existingUser.displayName,
      role: userData.role ?? existingUser.role,
      avatar: userData.avatar ?? existingUser.avatar,
      status: userData.status ?? existingUser.status,
      lastLogin: userData.lastLogin ?? existingUser.lastLogin,
      createdAt: existingUser.createdAt,
    };

    return HttpResponse.json({
      success: true,
      data: mockUsers[userIndex],
      message: '用户更新成功',
    });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const { id } = params;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return HttpResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    mockUsers.splice(userIndex, 1);

    return HttpResponse.json({
      success: true,
      message: '用户删除成功',
    });
  }),

  // 仪表板数据API
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardData.stats,
    });
  }),

  http.get('/api/dashboard/charts', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (
      type &&
      mockDashboardData.chartData[
        type as keyof typeof mockDashboardData.chartData
      ]
    ) {
      return HttpResponse.json({
        success: true,
        data: mockDashboardData.chartData[
          type as keyof typeof mockDashboardData.chartData
        ],
      });
    }

    return HttpResponse.json({
      success: true,
      data: mockDashboardData.chartData,
    });
  }),

  // 通知API
  http.get('/api/notifications', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    let filteredNotifications = [...mockNotifications];

    if (category && category !== 'all') {
      filteredNotifications = filteredNotifications.filter(
        n => n.category === category
      );
    }

    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }

    return HttpResponse.json({
      success: true,
      data: filteredNotifications,
    });
  }),

  http.put('/api/notifications/:id/read', ({ params }) => {
    const { id } = params;
    const notification = mockNotifications.find(n => n.id === id);

    if (!notification) {
      return HttpResponse.json(
        { success: false, message: '通知不存在' },
        { status: 404 }
      );
    }

    notification.read = true;

    return HttpResponse.json({
      success: true,
      message: '标记为已读成功',
    });
  }),

  http.put('/api/notifications/read-all', () => {
    mockNotifications.forEach(n => (n.read = true));

    return HttpResponse.json({
      success: true,
      message: '全部标记为已读成功',
    });
  }),

  http.delete('/api/notifications/:id', ({ params }) => {
    const { id } = params;
    const index = mockNotifications.findIndex(n => n.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { success: false, message: '通知不存在' },
        { status: 404 }
      );
    }

    mockNotifications.splice(index, 1);

    return HttpResponse.json({
      success: true,
      message: '通知删除成功',
    });
  }),

  // 活动日志API
  http.get('/api/activities', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedActivities = mockActivities.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: mockActivities.length,
        page,
        pageSize,
      },
    });
  }),

  // 系统设置API
  http.get('/api/settings', () => {
    return HttpResponse.json({
      success: true,
      data: {
        theme: 'light',
        language: 'zh-CN',
        notifications: {
          email: true,
          push: false,
          sms: true,
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          passwordExpiry: 90,
        },
      },
    });
  }),

  http.put('/api/settings', async ({ request }) => {
    const settings = await request.json();

    // 模拟保存设置
    return HttpResponse.json({
      success: true,
      data: settings,
      message: '设置保存成功',
    });
  }),

  // Invoice OCR API
  // 文件上传处理
  http.post(
    '/api/invoice-ocr/:workflowId/upload',
    async ({ request, params }) => {
      const { workflowId } = params;
      const formData = await request.formData();
      const files = formData.getAll('files');
      const batchName = formData.get('batchName');

      // 模拟文件上传和OCR处理
      await new Promise(resolve => setTimeout(resolve, 1500));

      const batchTask = {
        id: `batch-${Date.now()}`,
        workflowId,
        name: batchName || `Batch ${new Date().toLocaleString()}`,
        files: files.map((file: any, index: number) => ({
          id: `file-${Date.now()}-${index}`,
          name: file.name || `file-${index}`,
          size: file.size || 0,
          type:
            file.name?.split('.').pop()?.toLowerCase() === 'pdf'
              ? 'pdf'
              : 'image',
          status: 'pending' as const,
        })),
        status: 'processing' as const,
        createdAt: new Date().toISOString(),
        progress: {
          total: files.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        },
      };

      return HttpResponse.json({
        success: true,
        data: batchTask,
        message: '文件上传成功，开始处理',
      });
    }
  ),

  http.post('/api/invoice-ocr/process', async ({ request }) => {
    try {
      const body = (await request.json()) as {
        fileIds: string[];
        webhookUrl?: string;
      };
      const { fileIds, webhookUrl } = body;

      // 验证输入参数
      if (!fileIds || !Array.isArray(fileIds)) {
        return HttpResponse.json(
          {
            success: false,
            message: 'Invalid fileIds parameter',
          },
          { status: 400 }
        );
      }

      // 模拟OCR处理延迟
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 模拟OCR结果
      const results = fileIds.map((fileId: string, index: number) => ({
        id: `ocr-result-${Date.now()}-${index}`,
        fileId,
        fileName: `invoice-${index + 1}.pdf`,
        status: 'completed',
        extractedData: {
          invoiceNumber: `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          date: new Date().toISOString().split('T')[0],
          vendor: '示例供应商',
          amount: (Math.random() * 10000).toFixed(2),
          currency: 'CNY',
          items: [
            {
              description: '商品描述',
              quantity: Math.floor(Math.random() * 10) + 1,
              unitPrice: (Math.random() * 1000).toFixed(2),
              total: (Math.random() * 5000).toFixed(2),
            },
          ],
        },
        confidence: 0.95,
        processingTime: Math.floor(Math.random() * 3000) + 1000,
      }));

      // 如果提供了webhook URL，模拟发送webhook
      if (webhookUrl) {
        console.log(`模拟发送webhook到: ${webhookUrl}`, results);
      }

      return HttpResponse.json({
        success: true,
        data: {
          results,
          stats: {
            totalFiles: fileIds.length,
            processedFiles: fileIds.length,
            failedFiles: 0,
            averageProcessingTime: 2000,
          },
        },
        message: 'OCR处理完成',
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      return HttpResponse.json(
        {
          success: false,
          message: 'Internal server error during OCR processing',
        },
        { status: 500 }
      );
    }
  }),

  http.post('/api/invoice-ocr/test-webhook', async ({ request }) => {
    const body = (await request.json()) as { webhookUrl: string };

    // 模拟webhook连接测试
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟测试结果（90%成功率）
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return HttpResponse.json({
        success: true,
        data: {
          status: 'connected',
          responseTime: Math.floor(Math.random() * 500) + 100,
          statusCode: 200,
        },
        message: 'Webhook连接测试成功',
      });
    } else {
      return HttpResponse.json(
        {
          success: false,
          message: 'Webhook连接测试失败：连接超时',
        },
        { status: 400 }
      );
    }
  }),

  http.get('/api/invoice-ocr/results/:batchId', ({ params }) => {
    const { batchId } = params;

    // 模拟获取OCR结果
    return HttpResponse.json({
      success: true,
      data: {
        batchId,
        status: 'completed',
        results: [
          {
            id: `result-${Date.now()}`,
            fileName: 'invoice-sample.pdf',
            status: 'completed',
            extractedData: {
              invoiceNumber: 'INV-2024-001',
              date: '2024-01-15',
              vendor: '示例供应商有限公司',
              amount: '5280.00',
              currency: 'CNY',
            },
            confidence: 0.98,
          },
        ],
      },
    });
  }),

  http.get('/api/invoice-ocr/workflows', () => {
    // 模拟获取工作流列表
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'workflow-1',
          name: '发票处理工作流',
          description: '自动处理发票OCR和数据提取',
          status: 'active',
          webhookUrl: 'https://n8n.wendealai.com/webhook/invoiceOCR',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  }),

  http.post('/api/invoice-ocr/workflows', async ({ request }) => {
    const workflow = (await request.json()) as Record<string, any>;

    // 模拟创建工作流
    return HttpResponse.json({
      success: true,
      data: {
        id: `workflow-${Date.now()}`,
        ...workflow,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: '工作流创建成功',
    });
  }),
];

export default handlers;
