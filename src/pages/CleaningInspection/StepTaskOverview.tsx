/**
 * Step 0: Task Overview
 * Displays property info, task summary, cleaner enters their name.
 */

import React from 'react';
import { Card, Typography, Input, Row, Col, Tag, Alert, Image } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UserOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { CleaningInspection } from './types';
import { useLang } from './i18n';

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
  const { t, lang } = useLang();
  const roomCount = inspection.sections.length;

  /**
   * Pre-filled inspection: when property info comes from admin-generated link.
   * These fields should be read-only (not editable by cleaner).
   */
  const isPreFilled = !!(
    inspection.propertyId &&
    inspection.propertyAddress &&
    inspection.propertyAddress.length > 0
  );

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
          {t('overview.title')}
        </Title>
        <Paragraph
          style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}
        >
          {t('overview.subtitle')}
        </Paragraph>
      </div>

      {/* Property Info Card */}
      <Card
        size='small'
        style={{ marginBottom: '16px', borderRadius: '8px' }}
        title={
          <span>
            <HomeOutlined style={{ marginRight: '8px' }} />
            {t('overview.propertyDetails')}
          </span>
        }
      >
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              {t('overview.propertyId')}
            </Text>
            {isPreFilled ? (
              <Text strong style={{ fontSize: '15px' }}>
                {inspection.propertyId || '—'}
              </Text>
            ) : (
              <Input
                value={inspection.propertyId}
                onChange={e => onUpdate({ propertyId: e.target.value })}
                placeholder={t('overview.propertyIdPlaceholder')}
                size='small'
              />
            )}
          </Col>
          <Col span={12}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              <CalendarOutlined style={{ marginRight: '4px' }} />
              {t('overview.checkOutDate')}
            </Text>
            {isPreFilled ? (
              <Text strong style={{ fontSize: '15px' }}>
                {inspection.checkOutDate || '—'}
              </Text>
            ) : (
              <Input
                type='date'
                value={inspection.checkOutDate}
                onChange={e => onUpdate({ checkOutDate: e.target.value })}
                size='small'
              />
            )}
          </Col>
          <Col span={24}>
            <Text
              type='secondary'
              style={{ fontSize: '12px', display: 'block' }}
            >
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              {t('overview.propertyAddress')}
            </Text>
            {isPreFilled ? (
              <Text strong style={{ fontSize: '15px' }}>
                {inspection.propertyAddress || '—'}
              </Text>
            ) : (
              <Input
                value={inspection.propertyAddress}
                onChange={e => onUpdate({ propertyAddress: e.target.value })}
                placeholder={t('overview.propertyAddressPlaceholder')}
                size='small'
              />
            )}
          </Col>
        </Row>
      </Card>

      {/* Property Notes / Key Instructions — display Chinese or English based on current language */}
      {(inspection.propertyNotes ||
        inspection.propertyNotesZh ||
        (inspection.propertyNoteImages &&
          inspection.propertyNoteImages.length > 0)) && (
        <Card
          size='small'
          style={{
            marginBottom: '16px',
            borderRadius: '8px',
            border: '1px solid #91d5ff',
            background: '#e6f7ff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <InfoCircleOutlined
              style={{ color: '#1890ff', fontSize: '16px' }}
            />
            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
              {t('overview.importantNotes')}
            </Text>
          </div>
          {/* Show Chinese notes when lang=zh (fallback to English); show English when lang=en (fallback to Chinese) */}
          {(() => {
            const notesText =
              lang === 'zh'
                ? inspection.propertyNotesZh || inspection.propertyNotes
                : inspection.propertyNotes || inspection.propertyNotesZh;
            return notesText ? (
              <Text
                style={{
                  fontSize: '13px',
                  whiteSpace: 'pre-wrap',
                  display: 'block',
                  marginBottom: inspection.propertyNoteImages?.length
                    ? '12px'
                    : '0',
                }}
              >
                {notesText}
              </Text>
            ) : null;
          })()}
          {inspection.propertyNoteImages &&
            inspection.propertyNoteImages.length > 0 && (
              <div>
                <Text
                  type='secondary'
                  style={{
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '8px',
                  }}
                >
                  <PictureOutlined />
                  参考图片（点击查看大图）
                </Text>
                <Image.PreviewGroup>
                  <div
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                  >
                    {inspection.propertyNoteImages.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        alt={`说明图${idx + 1}`}
                        width={120}
                        height={120}
                        style={{
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #d9d9d9',
                        }}
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}
        </Card>
      )}

      {/* Task Summary */}
      <Card
        size='small'
        style={{ marginBottom: '16px', borderRadius: '8px' }}
        title={t('overview.taskSummary')}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <Tag color='green'>
            {t('overview.roomsToInspect', { count: roomCount })}
          </Tag>
          {inspection.templateName && (
            <Tag color='blue'>
              {t('overview.template', { name: inspection.templateName })}
            </Tag>
          )}
        </div>
        <Text type='secondary' style={{ fontSize: '12px' }}>
          {t('overview.rooms')}
          {inspection.sections.map(s => s.name).join(' → ')}
        </Text>
      </Card>

      {/* Assigned Employee (read-only) or Cleaner Name Input */}
      {inspection.assignedEmployee ? (
        <Card
          size='small'
          style={{ borderRadius: '8px' }}
          title={
            <span>
              <UserOutlined style={{ marginRight: '8px' }} />
              {t('overview.assignedEmployee')}
            </span>
          }
        >
          <Text strong style={{ fontSize: '16px' }}>
            {inspection.assignedEmployee.name}
          </Text>
          {inspection.assignedEmployee.phone && (
            <Text
              type='secondary'
              style={{ display: 'block', fontSize: '13px', marginTop: '4px' }}
            >
              {inspection.assignedEmployee.phone}
            </Text>
          )}
        </Card>
      ) : (
        <Card
          size='small'
          style={{ borderRadius: '8px' }}
          title={
            <span>
              <UserOutlined style={{ marginRight: '8px' }} />
              {t('overview.yourName')}
            </span>
          }
        >
          <Input
            value={inspection.submitterName || ''}
            onChange={e => onUpdate({ submitterName: e.target.value })}
            placeholder={t('overview.namePlaceholder')}
            size='large'
            style={{ fontSize: '16px' }}
          />
        </Card>
      )}
    </div>
  );
};

export default StepTaskOverview;
