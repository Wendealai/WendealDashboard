/**
 * Step 3..N: Room-by-Room Inspection
 * Checklist + photos + reference images for a single room.
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Input,
  Button,
  Progress,
  Space,
  Modal,
  Divider,
  Tag,
} from 'antd';
import {
  CameraOutlined,
  EyeOutlined,
  CheckCircleFilled,
  PictureOutlined,
} from '@ant-design/icons';
import type { RoomSection, ChecklistItem } from './types';
import PhotoCapture from './components/PhotoCapture';
import ChecklistCard from './components/ChecklistCard';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface StepRoomInspectionProps {
  section: RoomSection;
  sectionIndex: number;
  totalSections: number;
  propertyAddress: string;
  onUpdate: (updated: RoomSection) => void;
  disabled?: boolean;
}

/**
 * Single room inspection step with checklist + photos + reference images
 */
const StepRoomInspection: React.FC<StepRoomInspectionProps> = ({
  section,
  sectionIndex,
  totalSections,
  propertyAddress,
  onUpdate,
  disabled = false,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  }>({
    src: '',
    desc: '',
  });

  /** Currently active checklist item awaiting photo */
  const [photoTargetItemId, setPhotoTargetItemId] = useState<string | null>(
    null
  );

  /** Checklist progress */
  const totalItems = section.checklist.length;
  const checkedItems = section.checklist.filter(i => i.checked).length;
  const progress =
    totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 100;

  /** Toggle a checklist item */
  const handleToggleItem = useCallback(
    (itemId: string, checked: boolean) => {
      onUpdate({
        ...section,
        checklist: section.checklist.map(i =>
          i.id === itemId ? { ...i, checked } : i
        ),
      });
    },
    [section, onUpdate]
  );

  /** Handle photo capture for a checklist item */
  const handleItemPhotoCapture = useCallback(
    (dataUrl: string) => {
      if (!photoTargetItemId) return;
      onUpdate({
        ...section,
        checklist: section.checklist.map(i =>
          i.id === photoTargetItemId ? { ...i, photo: dataUrl } : i
        ),
      });
      setPhotoTargetItemId(null);
    },
    [section, onUpdate, photoTargetItemId]
  );

  /** Handle additional room photo capture */
  const handleRoomPhotoCapture = useCallback(
    (dataUrl: string) => {
      const newPhoto = {
        uid: `photo-${Date.now()}`,
        name: `photo-${Date.now()}.jpg`,
        status: 'done' as const,
        url: dataUrl,
        type: 'image/jpeg',
      };
      onUpdate({
        ...section,
        photos: [...section.photos, newPhoto],
      });
    },
    [section, onUpdate]
  );

  /** Remove a room photo */
  const handleRemovePhoto = useCallback(
    (uid: string) => {
      onUpdate({
        ...section,
        photos: section.photos.filter(p => p.uid !== uid),
      });
    },
    [section, onUpdate]
  );

  /** Preview an image */
  const handlePreview = (src: string, desc = '') => {
    setPreviewImage({ src, desc });
    setPreviewVisible(true);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Room Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <Tag color='green' style={{ marginRight: '8px' }}>
            Room {sectionIndex + 1} / {totalSections}
          </Tag>
          <Text strong style={{ fontSize: '16px' }}>
            {section.name}
          </Text>
        </div>
        <Progress
          type='circle'
          percent={progress}
          size={40}
          strokeColor='#52c41a'
          format={p => `${p}%`}
        />
      </div>

      <Text
        type='secondary'
        style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}
      >
        {section.description}
      </Text>

      {/* Reference Images */}
      {section.referenceImages.length > 0 && (
        <Card
          size='small'
          style={{
            marginBottom: '12px',
            borderRadius: '8px',
            background: '#f0f9eb',
            borderColor: '#d9f7be',
          }}
          title={
            <span style={{ fontSize: '13px' }}>
              <PictureOutlined style={{ marginRight: '6px' }} />
              Reference Photos ({section.referenceImages.length})
            </span>
          }
        >
          <Row gutter={[8, 8]}>
            {section.referenceImages.map((ref, idx) => (
              <Col xs={8} sm={6} key={idx}>
                <img
                  src={ref.image}
                  alt={`Ref ${idx + 1}`}
                  onClick={() =>
                    handlePreview(ref.image, ref.description || '')
                  }
                  style={{
                    width: '100%',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: '2px solid #b7eb8f',
                  }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Checklist */}
      {section.checklist.length > 0 && (
        <Card
          size='small'
          style={{ marginBottom: '12px', borderRadius: '8px' }}
          title={
            <span style={{ fontSize: '13px' }}>
              <CheckCircleFilled
                style={{ marginRight: '6px', color: '#52c41a' }}
              />
              Checklist ({checkedItems}/{totalItems})
            </span>
          }
        >
          {section.checklist.map(item => (
            <ChecklistCard
              key={item.id}
              item={item}
              onToggle={checked => handleToggleItem(item.id, checked)}
              onPhotoRequest={() => setPhotoTargetItemId(item.id)}
              disabled={disabled}
            />
          ))}
        </Card>
      )}

      {/* Checklist item photo capture (floating) */}
      {photoTargetItemId && (
        <Card
          size='small'
          style={{
            marginBottom: '12px',
            borderRadius: '8px',
            borderColor: '#fa8c16',
            background: '#fff7e6',
          }}
          title={
            <Text strong style={{ fontSize: '13px' }}>
              <CameraOutlined style={{ marginRight: '6px' }} />
              Take photo for:{' '}
              {section.checklist.find(i => i.id === photoTargetItemId)?.label}
            </Text>
          }
          extra={
            <Button size='small' onClick={() => setPhotoTargetItemId(null)}>
              Cancel
            </Button>
          }
        >
          <PhotoCapture
            onCapture={handleItemPhotoCapture}
            address={propertyAddress}
            cameraText='Take Evidence Photo'
            uploadText='Upload Evidence'
          />
        </Card>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Additional Room Photos */}
      <Card
        size='small'
        style={{ marginBottom: '12px', borderRadius: '8px' }}
        title={
          <span style={{ fontSize: '13px' }}>
            <CameraOutlined style={{ marginRight: '6px' }} />
            Additional Photos ({section.photos.length})
          </span>
        }
        extra={
          !disabled && (
            <PhotoCapture
              onCapture={handleRoomPhotoCapture}
              address={propertyAddress}
            />
          )
        }
      >
        {section.photos.length > 0 ? (
          <Row gutter={[8, 8]}>
            {section.photos.map(photo => (
              <Col xs={8} sm={6} key={photo.uid}>
                <div style={{ position: 'relative' }}>
                  {photo.url && (
                    <img
                      src={photo.url}
                      alt={photo.name}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9',
                        cursor: 'pointer',
                      }}
                      onClick={() => handlePreview(photo.url || '', '')}
                    />
                  )}
                  {!disabled && (
                    <Button
                      type='text'
                      danger
                      size='small'
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(255,255,255,0.9)',
                        padding: '0 4px',
                        lineHeight: '20px',
                        height: '20px',
                      }}
                      onClick={() => handleRemovePhoto(photo.uid)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              background: '#fafafa',
              borderRadius: '6px',
              border: '1px dashed #d9d9d9',
            }}
          >
            <CameraOutlined style={{ fontSize: '20px', color: '#bfbfbf' }} />
            <Paragraph
              type='secondary'
              style={{ margin: '4px 0 0', fontSize: '12px' }}
            >
              No additional photos yet
            </Paragraph>
          </div>
        )}
      </Card>

      {/* Notes */}
      <div>
        <Text strong style={{ fontSize: '13px' }}>
          Notes
        </Text>
        <TextArea
          value={section.notes}
          onChange={e => onUpdate({ ...section, notes: e.target.value })}
          placeholder='Add any notes about this room...'
          rows={2}
          style={{ marginTop: '4px' }}
          disabled={disabled}
        />
      </div>

      {/* Image Preview Modal */}
      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width='auto'
        style={{ maxWidth: '90vw' }}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={previewImage.src}
            alt='Preview'
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
            }}
          />
          {previewImage.desc && (
            <Paragraph style={{ marginTop: '12px' }}>
              {previewImage.desc}
            </Paragraph>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StepRoomInspection;
