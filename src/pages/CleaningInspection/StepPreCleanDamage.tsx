/**
 * Step 2: Pre-Clean Damage Report
 * Document any existing damage before cleaning starts.
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Button,
  Input,
  Select,
  Checkbox,
  Space,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  WarningOutlined,
  CameraOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { DamageReport, RoomSection } from './types';
import { generateId } from './types';
import PhotoCapture from './components/PhotoCapture';
import { useLang } from './i18n';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface StepPreCleanDamageProps {
  damageReports: DamageReport[];
  sections: RoomSection[];
  propertyAddress: string;
  onUpdate: (reports: DamageReport[]) => void;
}

/**
 * Pre-clean damage reporting step
 */
const StepPreCleanDamage: React.FC<StepPreCleanDamageProps> = ({
  damageReports,
  sections,
  propertyAddress,
  onUpdate,
}) => {
  const { t } = useLang();
  const [noDamageConfirmed, setNoDamageConfirmed] = useState(
    damageReports.length === 0
  );

  /** Location options from sections */
  const locationOptions = sections.map(s => ({
    value: s.name,
    label: s.name,
  }));

  /** Add a new blank damage entry */
  const handleAddDamage = useCallback(() => {
    setNoDamageConfirmed(false);
    const newReport: DamageReport = {
      id: generateId('dmg'),
      description: '',
      photo: '',
      location: sections[0]?.name || '',
      timestamp: new Date().toISOString(),
    };
    onUpdate([...damageReports, newReport]);
  }, [damageReports, sections, onUpdate]);

  /** Update a damage report field */
  const handleUpdateDamage = useCallback(
    (id: string, patch: Partial<DamageReport>) => {
      onUpdate(damageReports.map(r => (r.id === id ? { ...r, ...patch } : r)));
    },
    [damageReports, onUpdate]
  );

  /** Delete a damage report */
  const handleDeleteDamage = useCallback(
    (id: string) => {
      const updated = damageReports.filter(r => r.id !== id);
      onUpdate(updated);
      if (updated.length === 0) setNoDamageConfirmed(true);
    },
    [damageReports, onUpdate]
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Info Banner */}
      <Card
        size='small'
        style={{
          marginBottom: '16px',
          borderRadius: '8px',
          background: '#fff7e6',
          borderColor: '#ffd591',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <WarningOutlined
            style={{ fontSize: '24px', color: '#fa8c16', marginTop: '2px' }}
          />
          <div>
            <Text strong>{t('damage.title')}</Text>
            <Paragraph
              type='secondary'
              style={{ margin: '4px 0 0', fontSize: '13px' }}
            >
              {t('damage.desc')}
            </Paragraph>
          </div>
        </div>
      </Card>

      {/* No damage checkbox */}
      {damageReports.length === 0 && (
        <Card
          size='small'
          style={{
            marginBottom: '16px',
            borderRadius: '8px',
            background: noDamageConfirmed ? '#f6ffed' : '#fafafa',
            borderColor: noDamageConfirmed ? '#b7eb8f' : '#d9d9d9',
          }}
        >
          <Checkbox
            checked={noDamageConfirmed}
            onChange={e => setNoDamageConfirmed(e.target.checked)}
          >
            <Text strong>
              <SafetyCertificateOutlined
                style={{ marginRight: '6px', color: '#52c41a' }}
              />
              {t('damage.noDamage')}
            </Text>
          </Checkbox>
          <Paragraph
            type='secondary'
            style={{ margin: '4px 0 0 24px', fontSize: '12px' }}
          >
            {t('damage.noDamageDesc')}
          </Paragraph>
        </Card>
      )}

      {/* Damage entries */}
      {damageReports.map((report, index) => (
        <Card
          key={report.id}
          size='small'
          style={{ marginBottom: '12px', borderRadius: '8px' }}
          title={
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text strong>{t('damage.entry', { index: index + 1 })}</Text>
              <Button
                type='text'
                danger
                size='small'
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteDamage(report.id)}
              >
                {t('damage.remove')}
              </Button>
            </div>
          }
        >
          <Row gutter={[12, 12]}>
            {/* Location */}
            <Col span={24}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {t('damage.location')}
              </Text>
              <Select
                value={report.location}
                onChange={val =>
                  handleUpdateDamage(report.id, { location: val })
                }
                options={[
                  ...locationOptions,
                  { value: 'Entrance', label: t('damage.entrance') },
                  { value: 'Hallway', label: t('damage.hallway') },
                  { value: 'Other', label: t('damage.other') },
                ]}
                style={{ width: '100%' }}
                size='small'
              />
            </Col>

            {/* Description */}
            <Col span={24}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {t('damage.description')}
              </Text>
              <TextArea
                value={report.description}
                onChange={e =>
                  handleUpdateDamage(report.id, { description: e.target.value })
                }
                placeholder={t('damage.descPlaceholder')}
                rows={2}
                size='small'
              />
            </Col>

            {/* Photo */}
            <Col span={24}>
              <Text
                type='secondary'
                style={{
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                {t('damage.photoRequired')}
              </Text>
              {report.photo ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <img
                    src={report.photo}
                    alt={`Damage ${index + 1}`}
                    style={{
                      width: '120px',
                      height: '90px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #d9d9d9',
                    }}
                  />
                  <PhotoCapture
                    onCapture={url =>
                      handleUpdateDamage(report.id, { photo: url })
                    }
                    address={propertyAddress}
                    cameraText={t('photo.retake')}
                    uploadText={t('photo.replace')}
                  />
                </div>
              ) : (
                <PhotoCapture
                  onCapture={url =>
                    handleUpdateDamage(report.id, { photo: url })
                  }
                  address={propertyAddress}
                  cameraText={t('photo.takePhoto')}
                  uploadText={t('photo.uploadPhoto')}
                />
              )}
            </Col>
          </Row>
        </Card>
      ))}

      {/* Add damage button */}
      <Button
        type='dashed'
        block
        icon={<PlusOutlined />}
        onClick={handleAddDamage}
        style={{ borderRadius: '8px', height: '44px' }}
      >
        {t('damage.addButton')}
      </Button>
    </div>
  );
};

export default StepPreCleanDamage;
