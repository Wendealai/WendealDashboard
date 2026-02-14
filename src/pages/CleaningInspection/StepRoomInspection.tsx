/**
 * Step 3..N: Room-by-Room Inspection
 * Checklist + photos + reference images for a single room.
 */

import React, { useState, useCallback, useRef } from 'react';
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
import PhotoCapture, { type PhotoCaptureRef } from './components/PhotoCapture';
import ChecklistCard from './components/ChecklistCard';
import { useLang } from './i18n';
import { addWatermarkToImage, captureGPSWithAddress } from './utils';

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
  const { t } = useLang();
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

  /** Ref to hidden PhotoCapture for direct camera trigger */
  const checklistCameraRef = useRef<PhotoCaptureRef>(null);

  /** Hidden file input ref for checklist file picker */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTargetItemIdRef = useRef<string | null>(null);

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

  /** Handle photo capture for a checklist item (camera) */
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

  /** Directly open camera for a checklist item (no intermediate step) */
  const handleCameraRequest = useCallback((itemId: string) => {
    setPhotoTargetItemId(itemId);
    // Use setTimeout(0) to ensure state is set before ref triggers
    setTimeout(() => {
      checklistCameraRef.current?.openCamera();
    }, 0);
  }, []);

  /** Handle file picker for a checklist item */
  const handleFileSelect = useCallback((itemId: string) => {
    fileTargetItemIdRef.current = itemId;
    fileInputRef.current?.click();
  }, []);

  /** Process the selected file and apply watermark */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const targetId = fileTargetItemIdRef.current;
      if (!file || !targetId) return;

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = async ev => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        try {
          const { coords: gps, address: geoAddr } =
            await captureGPSWithAddress();
          const watermarked = await addWatermarkToImage(dataUrl, {
            gps,
            address: geoAddr || propertyAddress,
          });
          onUpdate({
            ...section,
            checklist: section.checklist.map(i =>
              i.id === targetId ? { ...i, photo: watermarked } : i
            ),
          });
        } catch {
          // Fallback: use without watermark
          onUpdate({
            ...section,
            checklist: section.checklist.map(i =>
              i.id === targetId ? { ...i, photo: dataUrl } : i
            ),
          });
        }
        fileTargetItemIdRef.current = null;
      };
      reader.readAsDataURL(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [section, onUpdate, propertyAddress]
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
      {/* Hidden file input for checklist item file picker */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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
            {t('room.title', { index: sectionIndex + 1, total: totalSections })}
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
              {t('room.referenceImages')} ({section.referenceImages.length})
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
              {t('room.checklistProgress', {
                checked: checkedItems,
                total: totalItems,
              })}
            </span>
          }
        >
          {section.checklist.map(item => (
            <ChecklistCard
              key={item.id}
              item={item}
              onToggle={checked => handleToggleItem(item.id, checked)}
              onCameraRequest={() => handleCameraRequest(item.id)}
              onFileRequest={() => handleFileSelect(item.id)}
              disabled={disabled}
            />
          ))}
        </Card>
      )}

      {/* Hidden PhotoCapture for direct camera trigger from checklist icons */}
      <PhotoCapture
        ref={checklistCameraRef}
        onCapture={handleItemPhotoCapture}
        address={propertyAddress}
        hideButtons
      />

      <Divider style={{ margin: '12px 0' }} />

      {/* Additional Room Photos */}
      <Card
        size='small'
        style={{ marginBottom: '12px', borderRadius: '8px' }}
        title={
          <span style={{ fontSize: '13px' }}>
            <CameraOutlined style={{ marginRight: '6px' }} />
            {t('room.additionalPhotos', { count: section.photos.length })}
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
              {t('room.noPhotos')}
            </Paragraph>
          </div>
        )}
      </Card>

      {/* Notes */}
      <div>
        <Text strong style={{ fontSize: '13px' }}>
          {t('room.notes')}
        </Text>
        <TextArea
          value={section.notes}
          onChange={e => onUpdate({ ...section, notes: e.target.value })}
          placeholder={t('room.notesPlaceholder')}
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
