import React from 'react';
import { Card, List, Typography, Badge, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  ExclamationCircleOutlined,
  SafetyOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import './WhatsNewPanel.css';

const { Text } = Typography;

export interface WhatsNewItem {
  id: string;
  title: string;
  type: 'security' | 'feature' | 'report';
  isNew?: boolean;
}

export interface WhatsNewPanelProps {
  collapsed?: boolean;
}

const WhatsNewPanel: React.FC<WhatsNewPanelProps> = ({ collapsed = false }) => {
  const { t } = useTranslation();

  const whatsNewItems: WhatsNewItem[] = [
    {
      id: '1',
      title: t('whatsNew.items.2faSecurityTitle', '2FA security'),
      type: 'security',
      isNew: true,
    },
    {
      id: '2',
      title: t('whatsNew.items.bareTrustsTitle', 'Bare trusts & SPVs'),
      type: 'feature',
      isNew: true,
    },
    {
      id: '3',
      title: t('whatsNew.items.reportingTitle', 'Reporting'),
      type: 'report',
      isNew: false,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'security':
        return (
          <SafetyOutlined style={{ color: 'var(--color-success, #52c41a)' }} />
        );
      case 'feature':
        return (
          <ExclamationCircleOutlined
            style={{ color: 'var(--color-primary, #1890ff)' }}
          />
        );
      case 'report':
        return (
          <FileTextOutlined
            style={{ color: 'var(--color-warning, #fa8c16)' }}
          />
        );
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className='whats-new-panel'>
      <Card
        size='small'
        title={
          <Space>
            <ExclamationCircleOutlined
              style={{ color: 'var(--color-accent, #722ed1)' }}
            />
            <Text
              strong
              style={{ color: 'var(--color-white, white)', fontSize: '14px' }}
            >
              {t('whatsNew.title', "What's New")}
            </Text>
          </Space>
        }
        styles={{
          header: {
            backgroundColor:
              'var(--color-bg-whatsnew-header, rgba(255, 255, 255, 0.1))',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            minHeight: '40px',
            padding: '8px 16px',
          },
          body: {
            padding: '8px',
            backgroundColor:
              'var(--color-bg-whatsnew-body, rgba(255, 255, 255, 0.05))',
          },
        }}
        style={{
          backgroundColor: 'transparent',
          border:
            '1px solid var(--color-border-whatsnew, rgba(255, 255, 255, 0.1))',
          borderRadius: '8px',
        }}
      >
        <List
          size='small'
          dataSource={whatsNewItems}
          renderItem={item => (
            <List.Item
              className='whats-new-item'
              style={{
                padding: '8px 12px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space size='small'>
                  {getIcon(item.type)}
                  <Text
                    style={{
                      color:
                        'var(--color-text-whatsnew, rgba(255, 255, 255, 0.85))',
                      fontSize: '12px',
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.isNew && (
                    <Badge
                      size='small'
                      status='processing'
                      style={{ marginLeft: '4px' }}
                    />
                  )}
                </Space>
                <RightOutlined
                  style={{
                    color:
                      'var(--color-text-whatsnew-secondary, rgba(255, 255, 255, 0.45))',
                    fontSize: '10px',
                  }}
                />
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export { WhatsNewPanel as default };
export { WhatsNewPanel };
