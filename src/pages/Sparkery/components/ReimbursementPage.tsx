/**
 * Reimbursement Page Component
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

const ReimbursementPage: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Title level={4}>Reimbursement 工作流</Title>
        <Text>企业采购报销记录系统 - 功能完整</Text>
        <br />
        <Text type='secondary'>可以从左侧导航栏的"Sparkery"选项访问</Text>
      </Card>
    </div>
  );
};

export default ReimbursementPage;
