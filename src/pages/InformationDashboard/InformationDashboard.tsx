/**
 * 信息展示模块主页面组件
 * 集成n8n工作流系统的数据展示平台
 */

import React from 'react';
import { Card, Row, Col, Typography, Space, Divider } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

/**
 * 信息展示模块主页面
 * 提供统一的信息聚合和展示界面
 */
const InformationDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='information-dashboard'>
      {/* 页面标题 */}
      <div className='page-header'>
        <Title level={2}>
          <DashboardOutlined /> 信息展示模块
        </Title>
        <Paragraph>
          集成n8n工作流系统的数据展示平台，提供统一的信息聚合和展示界面
        </Paragraph>
      </div>

      <Divider />

      {/* 主要内容区域 */}
      <Row gutter={[24, 24]}>
        {/* 工作流管理面板 */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <ApiOutlined />
                工作流管理
              </Space>
            }
            className='workflow-panel-card'
          >
            <div
              style={{
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Paragraph type='secondary'>工作流面板组件开发中...</Paragraph>
            </div>
          </Card>
        </Col>

        {/* 数据展示区域 */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <FilterOutlined />
                信息展示
              </Space>
            }
            className='data-display-card'
            extra={
              <Space>
                {/* 过滤控制组件将在这里 */}
                <span style={{ color: '#999' }}>过滤控制开发中...</span>
              </Space>
            }
          >
            <div
              style={{
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Paragraph type='secondary'>数据展示网格组件开发中...</Paragraph>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 统计信息区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={12} sm={6}>
          <Card size='small'>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                0
              </Title>
              <Paragraph style={{ margin: 0 }}>活跃工作流</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size='small'>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                0
              </Title>
              <Paragraph style={{ margin: 0 }}>今日信息</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size='small'>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                0
              </Title>
              <Paragraph style={{ margin: 0 }}>待处理</Paragraph>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size='small'>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#f5222d' }}>
                0
              </Title>
              <Paragraph style={{ margin: 0 }}>错误数量</Paragraph>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InformationDashboard;
