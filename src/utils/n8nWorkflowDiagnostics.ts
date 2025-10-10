/**
 * n8n Workflow Diagnostics Utility
 * 用于诊断n8n工作流配置问题的工具
 */

export interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
  suggestions?: string[];
}

export interface WebhookRequestData {
  description: string;
  requestId: string;
  timestamp: string;
  source: string;
  version: string;
  images?: File[];
  metadata?: string;
}

/**
 * n8n工作流诊断工具类
 */
export class N8nWorkflowDiagnostics {
  /**
   * 分析FormData内容，生成n8n工作流配置建议
   */
  static analyzeFormData(formData: FormData): DiagnosticResult {
    console.log('🔍 分析FormData内容...');

    const analysis: any = {
      fields: [],
      hasImages: false,
      imageCount: 0,
      totalSize: 0,
      contentTypes: new Set(),
    };

    // 分析FormData中的每个字段
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        analysis.hasImages = true;
        analysis.imageCount++;
        analysis.totalSize += value.size;
        analysis.contentTypes.add(value.type);

        analysis.fields.push({
          name: key,
          type: 'File',
          fileName: value.name,
          fileSize: value.size,
          mimeType: value.type,
          lastModified: new Date(value.lastModified).toISOString(),
        });
      } else {
        analysis.fields.push({
          name: key,
          type: 'String',
          value: value,
          length: value.length,
        });
      }
    }

    console.log('📊 FormData分析结果:', analysis);

    // 生成n8n工作流配置建议
    const suggestions = this.generateWorkflowSuggestions(analysis);

    return {
      success: true,
      message: 'FormData分析完成',
      details: analysis,
      suggestions,
    };
  }

  /**
   * 生成n8n工作流配置建议
   */
  private static generateWorkflowSuggestions(analysis: any): string[] {
    const suggestions: string[] = [];

    // 基本配置建议
    suggestions.push('🔧 n8n工作流配置检查清单:');
    suggestions.push('');

    // Webhook触发器配置
    suggestions.push('1. Webhook触发器配置:');
    suggestions.push('   - 路径设置为: /webhook/sora2');
    suggestions.push('   - HTTP方法: POST');
    suggestions.push('   - 认证: None (或根据需要配置)');
    suggestions.push('   - 响应: 200 OK + JSON');
    suggestions.push('');

    // 数据处理建议
    suggestions.push('2. 数据处理配置:');
    suggestions.push('   - 解析multipart/form-data格式');
    suggestions.push('   - 提取description字段作为视频描述');

    if (analysis.hasImages) {
      suggestions.push('   - 处理上传的图片文件');
      suggestions.push(`   - 图片数量: ${analysis.imageCount}`);
      suggestions.push(
        `   - 支持格式: ${Array.from(analysis.contentTypes).join(', ')}`
      );
      suggestions.push(
        `   - 总大小: ${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB`
      );
    }
    suggestions.push('');

    // 字段映射建议
    suggestions.push('3. 字段映射检查:');
    analysis.fields.forEach((field: any) => {
      if (field.type === 'String') {
        suggestions.push(
          `   - ${field.name}: "${field.value}" (${field.length}字符)`
        );
      } else if (field.type === 'File') {
        suggestions.push(
          `   - ${field.name}: ${field.fileName} (${field.fileSize}bytes, ${field.mimeType})`
        );
      }
    });
    suggestions.push('');

    // 工作流逻辑建议
    suggestions.push('4. 工作流逻辑建议:');
    suggestions.push('   - 添加数据验证节点检查必填字段');
    suggestions.push('   - 添加错误处理节点捕获异常');
    suggestions.push('   - 设置适当的超时时间(建议20分钟)');
    suggestions.push('   - 配置重试机制处理临时失败');
    suggestions.push('');

    // 响应格式建议
    suggestions.push('5. 响应格式要求:');
    suggestions.push(
      '   - 成功时返回: { "videoUrl": "https://...", "executionId": "..." }'
    );
    suggestions.push(
      '   - 失败时返回: { "error": "错误信息", "executionId": "..." }'
    );
    suggestions.push('   - 确保Content-Type为application/json');
    suggestions.push('');

    // 测试建议
    suggestions.push('6. 测试建议:');
    suggestions.push('   - 在n8n界面中手动测试工作流');
    suggestions.push('   - 检查执行历史中的详细错误信息');
    suggestions.push('   - 验证每个节点的输入输出数据');
    suggestions.push('   - 测试不同大小的图片文件');

    return suggestions;
  }

  /**
   * 生成测试用的FormData
   */
  static generateTestData(): FormData {
    const formData = new FormData();

    // 添加基本字段
    formData.append('description', '测试视频生成 - 一只可爱的猫在花园里玩耍');
    formData.append('requestId', `test-${Date.now()}`);
    formData.append('timestamp', new Date().toISOString());
    formData.append('source', 'wendeal-dashboard');
    formData.append('version', '1.0');

    // 创建测试图片文件
    const testImageBlob = this.createTestImageBlob();
    const testFile = new File([testImageBlob], 'test-image.png', {
      type: 'image/png',
    });
    formData.append('images', testFile);

    return formData;
  }

  /**
   * 创建测试用的图片Blob
   */
  private static createTestImageBlob(): Blob {
    // 创建一个简单的1x1像素PNG图片
    const pngData = Uint8Array.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // Width: 1
      0x00,
      0x00,
      0x00,
      0x01, // Height: 1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // Bit depth: 8, Color type: 2 (RGB), Compression: 0, Filter: 0, Interlace: 0
      0x90,
      0x77,
      0x53,
      0xde, // CRC
      0x00,
      0x00,
      0x00,
      0x0c, // IDAT chunk length
      0x49,
      0x44,
      0x41,
      0x54, // IDAT
      0x08,
      0x99,
      0x01,
      0x01,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00, // Compressed image data
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ]);

    return new Blob([pngData], { type: 'image/png' });
  }

  /**
   * 生成完整的诊断报告
   */
  static generateDiagnosticReport(
    webhookUrl: string,
    formData: FormData
  ): string {
    const analysis = this.analyzeFormData(formData);

    let report = '# n8n工作流诊断报告\n\n';
    report += `生成时间: ${new Date().toISOString()}\n`;
    report += `Webhook URL: ${webhookUrl}\n\n`;

    report += '## FormData分析结果\n\n';
    report += `- 字段数量: ${analysis.details?.fields?.length || 0}\n`;
    report += `- 包含图片: ${analysis.details?.hasImages ? '是' : '否'}\n`;
    report += `- 图片数量: ${analysis.details?.imageCount || 0}\n`;
    report += `- 总大小: ${((analysis.details?.totalSize || 0) / 1024 / 1024).toFixed(2)}MB\n\n`;

    report += '## 字段详情\n\n';
    analysis.details?.fields?.forEach((field: any, index: number) => {
      report += `${index + 1}. **${field.name}** (${field.type})\n`;
      if (field.type === 'String') {
        report += `   - 值: "${field.value}"\n`;
        report += `   - 长度: ${field.length}字符\n`;
      } else if (field.type === 'File') {
        report += `   - 文件名: ${field.fileName}\n`;
        report += `   - 大小: ${field.fileSize}bytes\n`;
        report += `   - 类型: ${field.mimeType}\n`;
      }
      report += '\n';
    });

    report += '## 配置建议\n\n';
    if (analysis.suggestions) {
      report += analysis.suggestions.join('\n');
    }

    return report;
  }
}

export default N8nWorkflowDiagnostics;
