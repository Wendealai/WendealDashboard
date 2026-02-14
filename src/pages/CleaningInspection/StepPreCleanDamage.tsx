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
            <Text strong>Pre-Clean Damage Check</Text>
            <Paragraph
              type='secondary'
              style={{ margin: '4px 0 0', fontSize: '13px' }}
            >
              Before you start cleaning, document any existing damage you find
              (stains, holes, broken items, etc.). This protects you from being
              blamed for pre-existing issues.
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
              No pre-existing damage found
            </Text>
          </Checkbox>
          <Paragraph
            type='secondary'
            style={{ margin: '4px 0 0 24px', fontSize: '12px' }}
          >
            Check this box to confirm you have inspected the property and found
            no existing damage.
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
              <Text strong>Damage #{index + 1}</Text>
              <Button
                type='text'
                danger
                size='small'
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteDamage(report.id)}
              >
                Remove
              </Button>
            </div>
          }
        >
          <Row gutter={[12, 12]}>
            {/* Location */}
            <Col span={24}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                Location
              </Text>
              <Select
                value={report.location}
                onChange={val =>
                  handleUpdateDamage(report.id, { location: val })
                }
                options={[
                  ...locationOptions,
                  { value: 'Entrance', label: 'Entrance' },
                  { value: 'Hallway', label: 'Hallway' },
                  { value: 'Other', label: 'Other' },
                ]}
                style={{ width: '100%' }}
                size='small'
              />
            </Col>

            {/* Description */}
            <Col span={24}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                Description
              </Text>
              <TextArea
                value={report.description}
                onChange={e =>
                  handleUpdateDamage(report.id, { description: e.target.value })
                }
                placeholder='Describe the damage (e.g. carpet stain near window, wall scratch)'
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
                Photo (required)
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
                    cameraText='Retake'
                    uploadText='Replace'
                  />
                </div>
              ) : (
                <PhotoCapture
                  onCapture={url =>
                    handleUpdateDamage(report.id, { photo: url })
                  }
                  address={propertyAddress}
                  cameraText='Take Photo'
                  uploadText='Upload Photo'
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
        Add Damage Report
      </Button>
    </div>
  );
};

export default StepPreCleanDamage;
