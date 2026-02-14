/**
 * Final Step: Check-out
 * GPS capture, key return method, lock photo, summary, submit.
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Button,
  Select,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  Alert,
  Result,
} from 'antd';
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  KeyOutlined,
  FilePdfOutlined,
  LinkOutlined,
  LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CleaningInspection, CheckInOut } from './types';
import { captureGPS, formatGPS, calculateDuration } from './utils';
import PhotoCapture from './components/PhotoCapture';
import { useLang, getKeyReturnMethods } from './i18n';

const { Title, Text, Paragraph } = Typography;

interface StepCheckOutProps {
  inspection: CleaningInspection;
  onCheckOut: (data: CheckInOut) => void;
  onSubmit: () => void;
  onGeneratePDF: () => void;
  onCopyLink: () => void;
  isSubmitting: boolean;
}

/**
 * Check-out and submission step
 */
const StepCheckOut: React.FC<StepCheckOutProps> = ({
  inspection,
  onCheckOut,
  onSubmit,
  onGeneratePDF,
  onCopyLink,
  isSubmitting,
}) => {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [keyMethod, setKeyMethod] = useState<string>(
    inspection.checkOut?.keyReturnMethod || ''
  );
  const [lockPhoto, setLockPhoto] = useState<string>(
    inspection.checkOut?.photo || ''
  );

  const isCheckedOut = !!inspection.checkOut;
  const isSubmitted = inspection.status === 'submitted';

  /** Localized key return methods */
  const keyReturnMethods = getKeyReturnMethods(lang);

  /** Handle check-out button */
  const handleCheckOut = useCallback(async () => {
    setLoading(true);
    try {
      const gps = await captureGPS();
      const data: CheckInOut = {
        timestamp: dayjs().toISOString(),
        gpsLat: gps?.lat ?? null,
        gpsLng: gps?.lng ?? null,
        gpsAddress: inspection.propertyAddress,
        photo: lockPhoto,
        keyReturnMethod: keyMethod,
      };
      onCheckOut(data);
    } finally {
      setLoading(false);
    }
  }, [inspection.propertyAddress, lockPhoto, keyMethod, onCheckOut]);

  /** Calculate stats */
  const totalPhotos = inspection.sections.reduce(
    (sum, s) => sum + s.photos.length,
    0
  );
  const totalChecked = inspection.sections.reduce(
    (sum, s) => sum + s.checklist.filter(i => i.checked).length,
    0
  );
  const totalChecklistItems = inspection.sections.reduce(
    (sum, s) => sum + s.checklist.length,
    0
  );
  const duration =
    inspection.checkIn && inspection.checkOut
      ? calculateDuration(
          inspection.checkIn.timestamp,
          inspection.checkOut.timestamp
        )
      : '—';

  // Already submitted - show success
  if (isSubmitted) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <Result
          status='success'
          title={t('checkOut.submitted')}
          subTitle={t('checkOut.submittedDesc')}
          extra={[
            <Button
              key='pdf'
              type='primary'
              icon={<FilePdfOutlined />}
              onClick={onGeneratePDF}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              {t('checkOut.generatePdf')}
            </Button>,
            <Button key='link' icon={<LinkOutlined />} onClick={onCopyLink}>
              {t('checkOut.copyLink')}
            </Button>,
          ]}
        />
        {/* Summary Stats */}
        <Card size='small' style={{ borderRadius: '8px' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title={t('checkOut.duration')}
                value={duration}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('checkOut.photos')}
                value={totalPhotos}
                valueStyle={{ fontSize: '16px', color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={t('checkOut.checklist')}
                value={`${totalChecked}/${totalChecklistItems}`}
                valueStyle={{ fontSize: '16px', color: '#52c41a' }}
              />
            </Col>
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Title level={4} style={{ textAlign: 'center', marginBottom: '16px' }}>
        <LockOutlined style={{ marginRight: '8px' }} />
        {t('checkOut.title')}
      </Title>

      {/* Key Return */}
      <Card
        size='small'
        style={{ marginBottom: '12px', borderRadius: '8px' }}
        title={
          <span>
            <KeyOutlined style={{ marginRight: '8px' }} />
            {t('checkOut.keyReturn')}
          </span>
        }
      >
        <Select
          value={keyMethod || null}
          onChange={(val: string) => setKeyMethod(val)}
          placeholder={t('checkOut.keyPlaceholder')}
          options={keyReturnMethods}
          style={{ width: '100%' }}
        />
      </Card>

      {/* Lock Photo */}
      <Card
        size='small'
        style={{ marginBottom: '12px', borderRadius: '8px' }}
        title={
          <span>
            <CameraOutlined style={{ marginRight: '8px' }} />
            {t('checkOut.lockPhoto')}
          </span>
        }
      >
        {lockPhoto ? (
          <div
            style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
          >
            <img
              src={lockPhoto}
              alt='Lock'
              style={{
                width: '140px',
                height: '100px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '2px solid #52c41a',
              }}
            />
            <PhotoCapture
              onCapture={setLockPhoto}
              address={inspection.propertyAddress}
              cameraText={t('photo.retake')}
              uploadText={t('photo.replace')}
            />
          </div>
        ) : (
          <PhotoCapture
            onCapture={setLockPhoto}
            address={inspection.propertyAddress}
            cameraText={t('photo.takeLockPhoto')}
            uploadText={t('photo.uploadLockPhoto')}
          />
        )}
      </Card>

      {/* Summary Stats */}
      <Card
        size='small'
        style={{ marginBottom: '16px', borderRadius: '8px' }}
        title={t('checkOut.summary')}
      >
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <Statistic
              title={t('checkOut.rooms')}
              value={inspection.sections.length}
              valueStyle={{ fontSize: '18px' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={t('checkOut.photos')}
              value={totalPhotos}
              valueStyle={{ fontSize: '18px', color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={t('checkOut.checklist')}
              value={`${totalChecked}/${totalChecklistItems}`}
              valueStyle={{ fontSize: '18px', color: '#52c41a' }}
            />
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {inspection.checkIn && (
            <Text type='secondary' style={{ fontSize: '12px' }}>
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              {t('checkOut.checkInTime', {
                time: dayjs(inspection.checkIn.timestamp).format('HH:mm:ss'),
              })}
            </Text>
          )}
          <Text type='secondary' style={{ fontSize: '12px' }}>
            <CameraOutlined style={{ marginRight: '4px' }} />
            {t('checkOut.damageReports', {
              count: inspection.damageReports.length,
            })}
          </Text>
        </div>
      </Card>

      {/* Check-out & Submit */}
      {!isCheckedOut ? (
        <Button
          type='primary'
          size='large'
          block
          icon={<CheckCircleOutlined />}
          onClick={handleCheckOut}
          loading={loading}
          style={{
            height: '52px',
            fontSize: '16px',
            borderRadius: '26px',
            background: '#52c41a',
            borderColor: '#52c41a',
          }}
        >
          {t('checkOut.finishButton')}
        </Button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert
            type='success'
            showIcon
            message={t('checkOut.checkedOutAt', {
              time: dayjs(inspection.checkOut!.timestamp).format('HH:mm:ss'),
            })}
            description={t('checkOut.gpsInfo', {
              gps: formatGPS(
                inspection.checkOut!.gpsLat,
                inspection.checkOut!.gpsLng
              ),
            })}
            style={{ borderRadius: '8px' }}
          />
          <Button
            type='primary'
            size='large'
            block
            icon={<CheckCircleOutlined />}
            onClick={onSubmit}
            loading={isSubmitting}
            style={{
              height: '52px',
              fontSize: '16px',
              borderRadius: '26px',
              background: '#52c41a',
              borderColor: '#52c41a',
            }}
          >
            {t('checkOut.submitButton')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepCheckOut;
