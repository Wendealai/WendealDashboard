/**
 * TK Viral Extract Component
 * 使用Notion官方iframe嵌入的病毒内容提取工作流组件
 */

import React, { useState, useCallback } from 'react';
import { Card, Button, Alert } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useMessage } from '@/hooks/useMessage';
import { tkWebhookService } from '@/services/tkWebhookService';

// 导入子组件
import InputForm from './InputForm';

// 导入类型
import type { WorkflowParameters } from '../types';

/**
 * TK Viral Extract主组件
 * 简化的参数输入和webhook调用组件
 */
const TKViralExtract: React.FC = () => {
  // 状态管理
  const defaultParameters: WorkflowParameters = {
    keyword: '',
    offset: '0',
    count: '20',
    sortMethod: '0',
    timeRange: '7',
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 使用message hook
  const message = useMessage();

  /**
   * 刷新Notion页面
   */
  const handleRefresh = useCallback(() => {
    console.log('🔄 刷新Notion页面数据...');
    // 通过改变key来强制重新加载iframe
    setRefreshKey(prev => prev + 1);
    message.success('✅ Notion页面已刷新');
  }, [message]);

  /**
   * 处理工作流提交
   */
  const handleWorkflowSubmit = useCallback(
    async (params: WorkflowParameters) => {
      try {
        console.log('🚀 开始执行TK Viral Extract工作流:', params);
        setLoading(true);
        setError(null);

        // 验证必填参数
        if (!params.keyword.trim()) {
          throw new Error('检索关键词不能为空');
        }

        // 调用webhook服务（spec-workflow规范）
        const result = await tkWebhookService.sendParameters(params);

        if (result.success) {
          message.success(`${result.message} (执行ID: ${result.executionId})`);
          console.log('✅ 工作流执行完成:', result);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        console.error('❌ 工作流执行失败:', err);
        const errorMessage =
          err instanceof Error ? err.message : '工作流执行失败';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  // 渲染组件
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 上方：输入表单 - 横向分布 */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border, #e8e8e8)',
          background: 'var(--color-bg-layout, #fafafa)',
        }}
      >
        <InputForm
          value={defaultParameters}
          onSubmit={handleWorkflowSubmit}
          onRefresh={handleRefresh}
          loading={loading}
          disabled={loading}
        />
      </div>

      {/* 下方：Notion文档 - 全宽显示 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Card
          title='📄 TK Viral Extract - Notion 文档'
          style={{ height: '100%', margin: 16 }}
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <div
            style={{
              position: 'relative',
              height: 'calc(100vh - 120px)',
              minHeight: '600px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid var(--color-border, #e8e8e8)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'var(--color-bg-container, #ffffff)',
              }}
            >
              <iframe
                key={refreshKey}
                src='https://wendealau.notion.site/ebd/266efdb673e08067908be152e0be1cdb?v=266efdb673e08178939d000ca7c81cbb&pvs=4'
                width='100%'
                height='100%'
                frameBorder='0'
                allowFullScreen
                title='TK Viral Extract Notion 文档'
                style={{ border: 'none' }}
                referrerPolicy='no-referrer-when-downgrade'
              />
            </div>
            <div
              style={{
                marginTop: 16,
                textAlign: 'right',
                padding: '0 16px 16px 16px',
              }}
            >
              <Button
                type='link'
                size='small'
                href='https://wendealau.notion.site/ebd/266efdb673e08067908be152e0be1cdb?v=266efdb673e08178939d000ca7c81cbb'
                target='_blank'
                icon={<GlobalOutlined />}
              >
                在新标签页打开 Notion 文档
              </Button>
            </div>
          </div>
          {error && (
            <Alert
              message='数据加载错误'
              description={error}
              type='error'
              showIcon
              style={{ margin: 16 }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default TKViralExtract;
