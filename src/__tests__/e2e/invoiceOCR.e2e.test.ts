import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Invoice OCR E2E 测试
 * 测试完整的用户场景，包括文件上传、工作流执行和结果查看
 */

// 测试配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  username: 'testuser',
  password: 'password123',
};

// 测试文件路径
const TEST_FILES = {
  validPDF: path.join(__dirname, '../fixtures/invoice-sample.pdf'),
  invalidFile: path.join(__dirname, '../fixtures/invalid-file.txt'),
  largePDF: path.join(__dirname, '../fixtures/large-invoice.pdf'),
};

// 页面对象模式
class InvoiceOCRPage {
  constructor(private page: Page) {}

  // 导航方法
  async goto() {
    await this.page.goto(`${BASE_URL}/information-dashboard`);
    await this.page.waitForLoadState('networkidle');
  }

  async login() {
    await this.page.goto(`${BASE_URL}/login`);
    await this.page.fill('[data-testid="username-input"]', TEST_USER.username);
    await this.page.fill('[data-testid="password-input"]', TEST_USER.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('**/dashboard');
  }

  // 工作流管理方法
  async createWorkflow(name: string, description: string) {
    await this.page.click('[data-testid="create-workflow-button"]');
    await this.page.waitForSelector('[data-testid="workflow-modal"]');

    await this.page.fill('[data-testid="workflow-name-input"]', name);
    await this.page.fill(
      '[data-testid="workflow-description-input"]',
      description
    );

    await this.page.click('[data-testid="create-workflow-submit"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async selectWorkflow(workflowId: string) {
    await this.page.click(`[data-testid="workflow-card-${workflowId}"]`);
    await this.page.waitForSelector('[data-testid="workflow-selected"]');
  }

  async deleteWorkflow(workflowId: string) {
    await this.page.click(`[data-testid="workflow-delete-${workflowId}"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  // 文件上传方法
  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(filePath);
    await this.page.waitForSelector('[data-testid="upload-success"]');
  }

  async uploadMultipleFiles(filePaths: string[]) {
    const fileInput = this.page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(filePaths);
    await this.page.waitForSelector('[data-testid="upload-success"]');
  }

  async dragAndDropFile(filePath: string) {
    const dropZone = this.page.locator('[data-testid="file-drop-zone"]');

    // 模拟拖拽文件
    const dataTransfer = await this.page.evaluateHandle(
      () => new DataTransfer()
    );

    await dropZone.dispatchEvent('dragenter', { dataTransfer });
    await dropZone.dispatchEvent('dragover', { dataTransfer });
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // 设置文件
    const fileInput = this.page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(filePath);
  }

  // 设置管理方法
  async openSettings() {
    await this.page.click('[data-testid="workflow-settings-button"]');
    await this.page.waitForSelector('[data-testid="settings-panel"]');
  }

  async updateSettings(settings: {
    outputFormat?: string;
    enableWebhook?: boolean;
    webhookUrl?: string;
    enableNotifications?: boolean;
    confidenceThreshold?: number;
  }) {
    await this.openSettings();

    if (settings.outputFormat) {
      await this.page.selectOption(
        '[data-testid="output-format-select"]',
        settings.outputFormat
      );
    }

    if (settings.enableWebhook !== undefined) {
      const webhookToggle = this.page.locator('[data-testid="webhook-toggle"]');
      const isChecked = await webhookToggle.isChecked();
      if (isChecked !== settings.enableWebhook) {
        await webhookToggle.click();
      }
    }

    if (settings.webhookUrl) {
      await this.page.fill(
        '[data-testid="webhook-url-input"]',
        settings.webhookUrl
      );
    }

    if (settings.enableNotifications !== undefined) {
      const notificationToggle = this.page.locator(
        '[data-testid="notification-toggle"]'
      );
      const isChecked = await notificationToggle.isChecked();
      if (isChecked !== settings.enableNotifications) {
        await notificationToggle.click();
      }
    }

    if (settings.confidenceThreshold) {
      await this.page.fill(
        '[data-testid="confidence-threshold-input"]',
        settings.confidenceThreshold.toString()
      );
    }

    await this.page.click('[data-testid="save-settings-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async testWebhookConnection() {
    await this.openSettings();
    await this.page.click('[data-testid="test-webhook-button"]');
    await this.page.waitForSelector('[data-testid="webhook-test-result"]');
  }

  // 结果查看方法
  async viewResults() {
    await this.page.click('[data-testid="results-tab"]');
    await this.page.waitForSelector('[data-testid="results-list"]');
  }

  async viewResultDetails(resultId: string) {
    await this.page.click(`[data-testid="view-details-${resultId}"]`);
    await this.page.waitForSelector('[data-testid="result-details-modal"]');
  }

  async downloadResult(resultId: string) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="download-${resultId}"]`);
    const download = await downloadPromise;
    return download;
  }

  async deleteResult(resultId: string) {
    await this.page.click(`[data-testid="delete-result-${resultId}"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForSelector('[data-testid="success-message"]');
  }

  async retryResult(resultId: string) {
    await this.page.click(`[data-testid="retry-${resultId}"]`);
    await this.page.waitForSelector('[data-testid="retry-started-message"]');
  }

  // 搜索和过滤方法
  async searchWorkflows(query: string) {
    await this.page.fill('[data-testid="workflow-search-input"]', query);
    await this.page.waitForTimeout(500); // 等待搜索防抖
  }

  async filterResultsByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await this.page.waitForSelector('[data-testid="filtered-results"]');
  }

  async searchResults(query: string) {
    await this.page.fill('[data-testid="result-search-input"]', query);
    await this.page.waitForTimeout(500);
  }

  // 断言方法
  async expectWorkflowExists(name: string) {
    await expect(this.page.locator(`text=${name}`)).toBeVisible();
  }

  async expectResultExists(fileName: string) {
    await expect(this.page.locator(`text=${fileName}`)).toBeVisible();
  }

  async expectProcessingStatus(fileName: string, status: string) {
    const resultRow = this.page
      .locator(`[data-testid="result-row"]`)
      .filter({ hasText: fileName });
    await expect(resultRow.locator(`text=${status}`)).toBeVisible();
  }

  async expectConfidenceScore(fileName: string, minScore: number) {
    const resultRow = this.page
      .locator(`[data-testid="result-row"]`)
      .filter({ hasText: fileName });
    const confidenceText = await resultRow
      .locator('[data-testid="confidence-score"]')
      .textContent();
    const confidence = parseFloat(confidenceText?.replace('%', '') || '0');
    expect(confidence).toBeGreaterThanOrEqual(minScore);
  }
}

// 测试套件
test.describe('Invoice OCR E2E Tests', () => {
  let page: Page;
  let context: BrowserContext;
  let invoiceOCRPage: InvoiceOCRPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    invoiceOCRPage = new InvoiceOCRPage(page);

    // 登录
    await invoiceOCRPage.login();

    // 导航到Invoice OCR页面
    await invoiceOCRPage.goto();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('工作流管理', () => {
    test('应该能够创建、配置和删除工作流', async () => {
      const workflowName = `测试工作流_${Date.now()}`;
      const workflowDescription = '这是一个E2E测试工作流';

      // 创建工作流
      await invoiceOCRPage.createWorkflow(workflowName, workflowDescription);
      await invoiceOCRPage.expectWorkflowExists(workflowName);

      // 配置工作流设置
      await invoiceOCRPage.updateSettings({
        outputFormat: 'json',
        enableWebhook: true,
        webhookUrl: 'https://example.com/webhook',
        enableNotifications: true,
        confidenceThreshold: 0.85,
      });

      // 测试Webhook连接
      await invoiceOCRPage.testWebhookConnection();
      await expect(
        page.locator('[data-testid="webhook-test-success"]')
      ).toBeVisible();

      // 删除工作流
      const workflowId = await page.getAttribute(
        '[data-testid="selected-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.deleteWorkflow(workflowId);
      }
    });

    test('应该能够搜索和过滤工作流', async () => {
      // 创建测试工作流
      await invoiceOCRPage.createWorkflow('搜索测试工作流', '用于搜索测试');

      // 搜索工作流
      await invoiceOCRPage.searchWorkflows('搜索测试');
      await invoiceOCRPage.expectWorkflowExists('搜索测试工作流');

      // 搜索不存在的工作流
      await invoiceOCRPage.searchWorkflows('不存在的工作流');
      await expect(page.locator('text=未找到匹配的工作流')).toBeVisible();
    });
  });

  test.describe('文件上传和处理', () => {
    test('应该能够上传单个PDF文件并处理', async () => {
      // 创建并选择工作流
      const workflowName = `文件上传测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '文件上传测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 上传文件
      await invoiceOCRPage.uploadFile(TEST_FILES.validPDF);

      // 验证上传成功
      await expect(
        page.locator('[data-testid="upload-success"]')
      ).toBeVisible();

      // 等待处理开始
      await expect(page.locator('text=处理中')).toBeVisible();

      // 等待处理完成（最多30秒）
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });
    });

    test('应该能够上传多个文件并批量处理', async () => {
      // 创建并选择工作流
      const workflowName = `批量上传测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '批量上传测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 上传多个文件
      await invoiceOCRPage.uploadMultipleFiles([
        TEST_FILES.validPDF,
        TEST_FILES.largePDF,
      ]);

      // 验证批量上传成功
      await expect(page.locator('text=2个文件上传成功')).toBeVisible();

      // 检查文件列表
      await expect(page.locator('[data-testid="file-list"]')).toContainText(
        'invoice-sample.pdf'
      );
      await expect(page.locator('[data-testid="file-list"]')).toContainText(
        'large-invoice.pdf'
      );
    });

    test('应该能够通过拖拽上传文件', async () => {
      // 创建并选择工作流
      const workflowName = `拖拽上传测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '拖拽上传测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 拖拽上传文件
      await invoiceOCRPage.dragAndDropFile(TEST_FILES.validPDF);

      // 验证拖拽上传成功
      await expect(
        page.locator('[data-testid="upload-success"]')
      ).toBeVisible();
    });

    test('应该能够处理无效文件格式', async () => {
      // 创建并选择工作流
      const workflowName = `无效文件测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '无效文件测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 尝试上传无效文件
      await invoiceOCRPage.uploadFile(TEST_FILES.invalidFile);

      // 验证错误消息
      await expect(page.locator('text=文件格式不支持')).toBeVisible();
    });
  });

  test.describe('结果查看和管理', () => {
    test('应该能够查看处理结果详情', async () => {
      // 创建工作流并上传文件
      const workflowName = `结果查看测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '结果查看测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      await invoiceOCRPage.uploadFile(TEST_FILES.validPDF);

      // 等待处理完成
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // 查看结果
      await invoiceOCRPage.viewResults();
      await invoiceOCRPage.expectResultExists('invoice-sample.pdf');

      // 查看结果详情
      const resultId = await page.getAttribute(
        '[data-testid="first-result"]',
        'data-result-id'
      );
      if (resultId) {
        await invoiceOCRPage.viewResultDetails(resultId);

        // 验证详情内容
        await expect(
          page.locator('[data-testid="result-details-modal"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="extracted-data"]')
        ).toBeVisible();
      }
    });

    test('应该能够下载处理结果', async () => {
      // 创建工作流并处理文件
      const workflowName = `下载测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '下载测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      await invoiceOCRPage.uploadFile(TEST_FILES.validPDF);
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // 下载结果
      await invoiceOCRPage.viewResults();
      const resultId = await page.getAttribute(
        '[data-testid="first-result"]',
        'data-result-id'
      );
      if (resultId) {
        const download = await invoiceOCRPage.downloadResult(resultId);

        // 验证下载
        expect(download.suggestedFilename()).toContain('.json');
      }
    });

    test('应该能够重试失败的处理', async () => {
      // 模拟处理失败的场景
      // 这里需要根据实际的失败场景来设计测试

      // 创建工作流
      const workflowName = `重试测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '重试测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 假设有一个失败的结果
      await invoiceOCRPage.viewResults();

      // 查找失败的结果并重试
      const failedResult = page
        .locator('[data-testid="result-row"]')
        .filter({ hasText: '处理失败' })
        .first();
      if ((await failedResult.count()) > 0) {
        const resultId = await failedResult.getAttribute('data-result-id');
        if (resultId) {
          await invoiceOCRPage.retryResult(resultId);
          await expect(page.locator('text=重新处理已开始')).toBeVisible();
        }
      }
    });

    test('应该能够删除处理结果', async () => {
      // 创建工作流并处理文件
      const workflowName = `删除结果测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '删除结果测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      await invoiceOCRPage.uploadFile(TEST_FILES.validPDF);
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // 删除结果
      await invoiceOCRPage.viewResults();
      const resultId = await page.getAttribute(
        '[data-testid="first-result"]',
        'data-result-id'
      );
      if (resultId) {
        await invoiceOCRPage.deleteResult(resultId);

        // 验证删除成功
        await expect(
          page.locator(`[data-result-id="${resultId}"]`)
        ).not.toBeVisible();
      }
    });
  });

  test.describe('搜索和过滤功能', () => {
    test('应该能够搜索和过滤处理结果', async () => {
      // 创建工作流并处理多个文件
      const workflowName = `搜索过滤测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '搜索过滤测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 上传多个文件
      await invoiceOCRPage.uploadMultipleFiles([
        TEST_FILES.validPDF,
        TEST_FILES.largePDF,
      ]);
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 30000,
      });

      // 查看结果
      await invoiceOCRPage.viewResults();

      // 搜索特定文件
      await invoiceOCRPage.searchResults('invoice-sample');
      await invoiceOCRPage.expectResultExists('invoice-sample.pdf');

      // 按状态过滤
      await invoiceOCRPage.filterResultsByStatus('completed');
      await expect(
        page.locator('[data-testid="filtered-results"]')
      ).toBeVisible();
    });
  });

  test.describe('性能和稳定性', () => {
    test('应该能够处理大文件上传', async () => {
      // 创建工作流
      const workflowName = `大文件测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '大文件测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 上传大文件
      await invoiceOCRPage.uploadFile(TEST_FILES.largePDF);

      // 验证上传成功
      await expect(
        page.locator('[data-testid="upload-success"]')
      ).toBeVisible();

      // 等待处理完成（增加超时时间）
      await page.waitForSelector('[data-testid="processing-complete"]', {
        timeout: 60000,
      });
    });

    test('应该能够处理并发文件上传', async () => {
      // 创建工作流
      const workflowName = `并发测试_${Date.now()}`;
      await invoiceOCRPage.createWorkflow(workflowName, '并发测试工作流');

      const workflowId = await page.getAttribute(
        '[data-testid="latest-workflow"]',
        'data-workflow-id'
      );
      if (workflowId) {
        await invoiceOCRPage.selectWorkflow(workflowId);
      }

      // 快速连续上传多个文件
      const uploadPromises = [
        invoiceOCRPage.uploadFile(TEST_FILES.validPDF),
        invoiceOCRPage.uploadFile(TEST_FILES.largePDF),
      ];

      await Promise.all(uploadPromises);

      // 验证所有文件都上传成功
      await expect(page.locator('text=2个文件上传成功')).toBeVisible();
    });
  });

  test.describe('错误处理', () => {
    test('应该能够处理网络错误', async () => {
      // 模拟网络断开
      await context.setOffline(true);

      // 尝试创建工作流
      await page.click('[data-testid="create-workflow-button"]');
      await page.fill('[data-testid="workflow-name-input"]', '网络错误测试');
      await page.click('[data-testid="create-workflow-submit"]');

      // 验证错误消息
      await expect(page.locator('text=网络连接错误')).toBeVisible();

      // 恢复网络连接
      await context.setOffline(false);

      // 重试操作
      await page.click('[data-testid="retry-button"]');
      await expect(
        page.locator('[data-testid="success-message"]')
      ).toBeVisible();
    });

    test('应该能够处理服务器错误', async () => {
      // 这里需要配合后端模拟服务器错误
      // 或者使用MSW等工具模拟API错误响应

      // 尝试执行操作
      await page.click('[data-testid="create-workflow-button"]');
      await page.fill('[data-testid="workflow-name-input"]', '服务器错误测试');
      await page.click('[data-testid="create-workflow-submit"]');

      // 如果服务器返回错误，验证错误处理
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText('服务器错误');
      }
    });
  });

  test.describe('用户体验', () => {
    test('应该提供良好的加载状态反馈', async () => {
      // 创建工作流
      await page.click('[data-testid="create-workflow-button"]');

      // 检查加载状态
      await expect(page.locator('[data-testid="modal-loading"]')).toBeVisible();

      // 等待加载完成
      await page.waitForSelector('[data-testid="workflow-modal"]');
      await expect(
        page.locator('[data-testid="modal-loading"]')
      ).not.toBeVisible();
    });

    test('应该支持键盘导航', async () => {
      // 使用Tab键导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 使用Enter键激活
      await page.keyboard.press('Enter');

      // 验证键盘导航有效
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('应该在移动设备上正常工作', async () => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 });

      // 重新加载页面
      await invoiceOCRPage.goto();

      // 验证移动端布局
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();

      // 测试移动端功能
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });
  });
});
