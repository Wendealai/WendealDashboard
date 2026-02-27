/**
 * Reimbursement Page Component
 */

import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import '../sparkery.css';

const { Paragraph, Text, Title } = Typography;

const ReimbursementPage: React.FC = () => {
  const { t } = useTranslation();

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
              {t('sparkery.reimbursement.tags.ready')}
            </Tag>
            <Tag className='sparkery-reimbursement-tag'>
              {t('sparkery.reimbursement.tags.internal')}
            </Tag>
          </Space>
          <Title level={4} className='sparkery-reimbursement-title'>
            {t('sparkery.reimbursement.title')}
          </Title>
          <Paragraph className='sparkery-reimbursement-description'>
            {t('sparkery.reimbursement.description')}
          </Paragraph>
          <div className='sparkery-reimbursement-notes'>
            <Text strong className='sparkery-reimbursement-notes-title'>
              {t('sparkery.reimbursement.plannedModulesTitle')}
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              {t('sparkery.reimbursement.plannedModules.submitRequest')}
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              {t('sparkery.reimbursement.plannedModules.approvalTracking')}
            </Text>
            <Text type='secondary' className='sparkery-reimbursement-note-item'>
              {t('sparkery.reimbursement.plannedModules.monthlyExport')}
            </Text>
          </div>
        </Space>
      </Card>
      <Card className='sparkery-reimbursement-card sparkery-reimbursement-card-tip'>
        <Text type='secondary' className='sparkery-reimbursement-tip'>
          {t('sparkery.reimbursement.tip')}
        </Text>
      </Card>
    </div>
  );
};

export default ReimbursementPage;
