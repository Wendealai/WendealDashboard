/**
 * Reimbursement Page Component
 */

import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import '../sparkery.css';

const { Paragraph, Text, Title } = Typography;

const ReimbursementPage: React.FC = () => {
  return (
    <div className='sparkery-reimbursement-page sparkery-reimbursement-shell'>
      <Card className='sparkery-reimbursement-card'>
        <Space
          direction='vertical'
          size={12}
          className='sparkery-reimbursement-content'
        >
          <Space size={[6, 6]} wrap className='sparkery-reimbursement-tags'>
            <Tag className='sparkery-reimbursement-tag sparkery-reimbursement-tag-ready'>
              Ready
            </Tag>
            <Tag className='sparkery-reimbursement-tag'>Sparkery Internal</Tag>
          </Space>
          <Title level={4} className='sparkery-reimbursement-title'>
            Reimbursement Workspace
          </Title>
          <Paragraph className='sparkery-reimbursement-description'>
            This page is reserved for internal reimbursement workflows and
            reporting.
          </Paragraph>
          <div className='sparkery-reimbursement-notes'>
            <Text strong className='sparkery-reimbursement-notes-title'>
              Planned modules
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              1. Submit reimbursement request
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              2. Approval status tracking
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              3. Export monthly reimbursement summary
            </Text>
          </div>
        </Space>
      </Card>
      <Card className='sparkery-reimbursement-card sparkery-reimbursement-card-tip'>
        <Text type='secondary' className='sparkery-reimbursement-tip'>
          You can access this page from the Sparkery navigation menu.
        </Text>
      </Card>
    </div>
  );
};

export default ReimbursementPage;
