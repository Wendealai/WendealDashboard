/**
 * Step 0: Task Overview
 * Displays property info, task summary, cleaner enters their name.
 */

import React from 'react';
import { Card, Typography, Input, Row, Col, Tag, Divider, Alert } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UserOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { CleaningInspection } from './types';

const { Title, Text, Paragraph } = Typography;

interface StepTaskOverviewProps {
  inspection: CleaningInspection;
  onUpdate: (patch: Partial<CleaningInspection>) => void;
}

/**
 * Task overview step - shows property info and lets cleaner enter their name
 */
const StepTaskOverview: React.FC<StepTaskOverviewProps> = ({
  inspection,
  onUpdate,
}) => {
  const roomCount = inspection.sections.length;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        style={{
          textAlign: 'center',
          padding: '24px 16px',
          background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
          borderRadius: '12px',
          color: '#fff',
          marginBottom: '20px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          Cleaning Inspection
        </Title>
        <Paragraph
          style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}
        >
          Follow the steps to complete your cleaning inspection
        </Paragraph>
      </div>

      {/* Property Info Card */}
      <Card
        size='small'
        style={{ marginBottom: '16px', borderRadius: '8px' }}
        title={
          <span>
            <HomeOutlined style={{ marginRight: '8px' }} />
            Property Details
          </span>
        }
      >
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              Property ID
            </Text>
            <Input
              value={inspection.propertyId}
              onChange={e => onUpdate({ propertyId: e.target.value })}
              placeholder='e.g. UNIT-101'
              size='small'
            />
          </Col>
          <Col span={12}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              <CalendarOutlined style={{ marginRight: '4px' }} />
              Check-out Date
            </Text>
            <Input
              type='date'
              value={inspection.checkOutDate}
              onChange={e => onUpdate({ checkOutDate: e.target.value })}
              size='small'
            />
          </Col>
          <Col span={24}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              Property Address
            </Text>
            <Input
              value={inspection.propertyAddress}
              onChange={e => onUpdate({ propertyAddress: e.target.value })}
              placeholder='e.g. 52 Wecker Road, Mansfield QLD 4122'
              size='small'
            />
          </Col>
        </Row>
      </Card>

      {/* Property Notes / Key Instructions */}
      {inspection.propertyNotes && (
        <Alert
          type='info'
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: '16px', borderRadius: '8px' }}
          message={
            <Text strong style={{ fontSize: '13px' }}>
              Important Notes
            </Text>
          }
          description={
            <Text style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
              {inspection.propertyNotes}
            </Text>
          }
        />
      )}

      {/* Task Summary */}
      <Card
        size='small'
        style={{ marginBottom: '16px', borderRadius: '8px' }}
        title='Task Summary'
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <Tag color='green'>{roomCount} rooms to inspect</Tag>
          {inspection.templateName && (
            <Tag color='blue'>Template: {inspection.templateName}</Tag>
          )}
        </div>
        <Text type='secondary' style={{ fontSize: '12px' }}>
          Rooms: {inspection.sections.map(s => s.name).join(' → ')}
        </Text>
      </Card>

      {/* Cleaner Name */}
      <Card
        size='small'
        style={{ borderRadius: '8px' }}
        title={
          <span>
            <UserOutlined style={{ marginRight: '8px' }} />
            Your Name
          </span>
        }
      >
        <Input
          value={inspection.submitterName || ''}
          onChange={e => onUpdate({ submitterName: e.target.value })}
          placeholder='Enter your name'
          size='large'
          style={{ fontSize: '16px' }}
        />
      </Card>
    </div>
  );
};

export default StepTaskOverview;
