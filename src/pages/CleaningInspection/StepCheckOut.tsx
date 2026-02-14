/**
 * Final Step: Check-out & Submit
 *
 * Flow:
 *   1. Key return + lock photo
 *   2. Checklist validation (all items must be checked before proceeding)
 *   3. "Finish Work" button → confirmation dialog → locks checkout timestamp
 *   4. "Submit Report" button
 *   5. After submit: show success with PDF/link + Edit button
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Modal,
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
  EditOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CleaningInspection, CheckInOut } from './types';
import { captureGPSWithAddress, formatGPS, calculateDuration } from './utils';
import PhotoCapture from './components/PhotoCapture';
import { useLang, getKeyReturnMethods } from './i18n';

const { Title, Text, Paragraph } = Typography;

interface StepCheckOutProps {
  inspection: CleaningInspection;
  onCheckOut: (data: CheckInOut) => void;
  onSubmit: () => void;
  onGeneratePDF: () => void;
  onCopyLink: () => void;
  /** Called when user wants to edit after submission */
  onEdit: () => void;
  isSubmitting: boolean;
}

/**
 * Check-out and submission step with checklist validation
 */
const StepCheckOut: React.FC<StepCheckOutProps> = ({
  inspection,
  onCheckOut,
  onSubmit,
  onGeneratePDF,
  onCopyLink,
  onEdit,
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

  /**
   * Checklist validation: find all unchecked items across all rooms.
   * Returns { allChecked, uncheckedItems: [{ room, item }] }
   */
  const checklistValidation = useMemo(() => {
    const uncheckedItems: { roomName: string; itemLabel: string }[] = [];
    inspection.sections.forEach(section => {
      section.checklist.forEach(item => {
        if (!item.checked) {
          uncheckedItems.push({
            roomName: section.name,
            itemLabel:
              lang === 'en' && item.labelEn ? item.labelEn : item.label,
          });
        }
      });
    });
    return { allChecked: uncheckedItems.length === 0, uncheckedItems };
  }, [inspection.sections, lang]);

  /**
   * Handle "Finish Work" button: validate checklist, then confirm.
   * On confirm, capture GPS + timestamp (locked permanently).
   */
  const handleFinishWork = useCallback(() => {
    // Block if checklist is incomplete
    if (!checklistValidation.allChecked) {
      const maxShow = 5;
      const items = checklistValidation.uncheckedItems.slice(0, maxShow);
      const remaining = checklistValidation.uncheckedItems.length - maxShow;
      Modal.warning({
        title: t('checkOut.incompleteTitle'),
        content: (
          <div>
            <p>{t('checkOut.incompleteDesc')}</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              {items.map((u, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  <Tag color='orange' style={{ marginRight: '4px' }}>
                    {u.roomName}
                  </Tag>
                  {u.itemLabel}
                </li>
              ))}
              {remaining > 0 && (
                <li style={{ color: '#999' }}>
                  {t('checkOut.incompleteMore', { count: remaining })}
                </li>
              )}
            </ul>
          </div>
        ),
        okText: t('checkOut.understood'),
      });
      return;
    }

    // All checked → show confirmation dialog
    Modal.confirm({
      title: t('checkOut.confirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('checkOut.confirmContent'),
      okText: t('checkOut.confirmOk'),
      cancelText: t('photo.cancel'),
      okButtonProps: {
        style: { background: '#52c41a', borderColor: '#52c41a' },
      },
      onOk: async () => {
        setLoading(true);
        try {
          const { coords, address: geoAddress } = await captureGPSWithAddress();
          const data: CheckInOut = {
            timestamp: dayjs().toISOString(),
            gpsLat: coords?.lat ?? null,
            gpsLng: coords?.lng ?? null,
            gpsAddress: geoAddress || inspection.propertyAddress,
            photo: lockPhoto,
            keyReturnMethod: keyMethod,
          };
          onCheckOut(data);
        } finally {
          setLoading(false);
        }
      },
    });
  }, [
    checklistValidation,
    inspection.propertyAddress,
    lockPhoto,
    keyMethod,
    onCheckOut,
    t,
  ]);

  /**
   * Handle "Submit Report" button: also validate checklist before allowing submit
   */
  const handleSubmit = useCallback(() => {
    if (!checklistValidation.allChecked) {
      Modal.warning({
        title: t('checkOut.incompleteTitle'),
        content: t('checkOut.incompleteDesc'),
        okText: t('checkOut.understood'),
      });
      return;
    }
    onSubmit();
  }, [checklistValidation, onSubmit, t]);

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

  // ── Already submitted - show success with Edit option ──
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
            <Button
              key='edit'
              icon={<EditOutlined />}
              onClick={onEdit}
              style={{ marginTop: '8px' }}
            >
              {t('checkOut.editButton')}
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

      {/* Checklist validation warning */}
      {!checklistValidation.allChecked && (
        <Alert
          type='warning'
          showIcon
          icon={<WarningOutlined />}
          message={t('checkOut.checklistWarning', {
            count: checklistValidation.uncheckedItems.length,
          })}
          description={t('checkOut.checklistWarningDesc')}
          style={{ marginBottom: '12px', borderRadius: '8px' }}
        />
      )}

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
              valueStyle={{
                fontSize: '18px',
                color: checklistValidation.allChecked ? '#52c41a' : '#fa8c16',
              }}
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

      {/* Step 1: Finish Work (check out with GPS timestamp - locked) */}
      {!isCheckedOut ? (
        <Button
          type='primary'
          size='large'
          block
          icon={<CheckCircleOutlined />}
          onClick={handleFinishWork}
          loading={loading}
          disabled={!checklistValidation.allChecked}
          style={{
            height: '52px',
            fontSize: '16px',
            borderRadius: '26px',
            background: checklistValidation.allChecked ? '#52c41a' : undefined,
            borderColor: checklistValidation.allChecked ? '#52c41a' : undefined,
          }}
        >
          {t('checkOut.finishButton')}
        </Button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Checkout timestamp (locked) */}
          <Alert
            type='success'
            showIcon
            icon={<LockOutlined />}
            message={t('checkOut.checkedOutAt', {
              time: dayjs(inspection.checkOut!.timestamp).format('HH:mm:ss'),
            })}
            description={
              <>
                {inspection.checkOut!.gpsAddress
                  ? `📍 ${inspection.checkOut!.gpsAddress}`
                  : t('checkOut.gpsInfo', {
                      gps: formatGPS(
                        inspection.checkOut!.gpsLat,
                        inspection.checkOut!.gpsLng
                      ),
                    })}
                <br />
                <Text type='secondary' style={{ fontSize: '11px' }}>
                  {t('checkOut.timeLocked')}
                </Text>
              </>
            }
            style={{ borderRadius: '8px' }}
          />

          {/* Step 2: Submit Report */}
          <Button
            type='primary'
            size='large'
            block
            icon={<CheckCircleOutlined />}
            onClick={handleSubmit}
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
