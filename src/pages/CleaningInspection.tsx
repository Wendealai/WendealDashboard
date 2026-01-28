/**
 * Standalone Cleaning Inspection Page - With Property Template Support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Input,
  Button,
  Upload,
  message,
  Space,
  Modal,
  Popconfirm,
} from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import {
  CameraOutlined,
  UploadOutlined,
  SendOutlined,
  LinkOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/** Reference image interface */
interface ReferenceImage {
  image: string;
  description?: string;
}

/** Room/Area section interface */
interface RoomSection {
  id: string;
  name: string;
  description: string;
  referenceImages: ReferenceImage[];
  photos: UploadFile[];
  notes: string;
}

/** Cleaning inspection submission data */
interface CleaningInspection {
  id: string;
  propertyId: string;
  propertyAddress: string;
  checkOutDate: string;
  submittedAt: Date;
  sections: RoomSection[];
  submitterName: string | undefined;
  status: 'draft' | 'submitted';
  templateName: string | undefined;
}

/** Predefined room sections */
const DEFAULT_ROOM_SECTIONS: Omit<
  RoomSection,
  'photos' | 'notes' | 'referenceImages'
>[] = [
  { id: 'kitchen', name: 'Kitchen', description: 'Kitchen cleaning' },
  { id: 'living-room', name: 'Living Room', description: 'Living room' },
  { id: 'bedroom-1', name: 'Bedroom 1', description: 'Master bedroom' },
  { id: 'bedroom-2', name: 'Bedroom 2', description: 'Bedroom 2' },
  { id: 'bedroom-3', name: 'Bedroom 3', description: 'Bedroom 3' },
  { id: 'bedroom-4', name: 'Bedroom 4', description: 'Bedroom 4' },
  { id: 'bathroom-1', name: 'Bathroom 1', description: 'Main bathroom' },
  { id: 'bathroom-2', name: 'Bathroom 2', description: 'Second bathroom' },
  { id: 'balcony', name: 'Balcony', description: 'Balcony' },
];

/** Base room sections for property template matching */
const BASE_ROOM_SECTIONS_TPL = [
  { id: 'kitchen', name: 'Kitchen', description: 'Kitchen' },
  { id: 'living-room', name: 'Living Room', description: 'Living room' },
  { id: 'bedroom-1', name: 'Bedroom 1', description: 'Bedroom 1' },
  { id: 'bathroom-1', name: 'Bathroom 1', description: 'Bathroom 1' },
  { id: 'balcony', name: 'Balcony', description: 'Balcony' },
];

/** Optional sections */
const OPTIONAL_SECTIONS_TPL = [
  { id: 'bedroom-2', name: 'Bedroom 2', description: 'Bedroom 2' },
  { id: 'bathroom-2', name: 'Bathroom 2', description: 'Bathroom 2' },
  { id: 'bedroom-3', name: 'Bedroom 3', description: 'Bedroom 3' },
  { id: 'bathroom-3', name: 'Bathroom 3', description: 'Bathroom 3' },
  { id: 'toilet', name: 'Toilet', description: 'Toilet' },
  { id: 'laundry', name: 'Laundry', description: 'Laundry' },
  { id: 'garage', name: 'Garage', description: 'Garage' },
  { id: 'garden', name: 'Garden', description: 'Garden' },
];

/** Get all available sections */
const getAllSectionsTpl = (activeSectionIds: string[]) => {
  const activeIds = new Set(activeSectionIds);
  return BASE_ROOM_SECTIONS_TPL.filter(s => activeIds.has(s.id)).concat(
    OPTIONAL_SECTIONS_TPL.filter(s => activeIds.has(s.id))
  );
};

/** Generate unique ID */
const generateInspectionId = () =>
  `insp-${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9)}`;

/** Add timestamp watermark to image */
const addTimestampWatermark = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number
) => {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(imageWidth - 250, imageHeight - 40, 245, 35);
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText(timestamp, imageWidth - 15, imageHeight - 15);
};

/** Capture photo with timestamp */
const capturePhotoWithTimestamp = async (
  videoRef: HTMLVideoElement
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  canvas.width = videoRef.videoWidth;
  canvas.height = videoRef.videoHeight;
  ctx.drawImage(videoRef, 0, 0);
  addTimestampWatermark(canvas, ctx, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
};

/** Main Component */
const CleaningInspectionPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const searchParams = new URLSearchParams(window.location.search);
  const inspectionId = searchParams.get('id');
  const initialPropertyId = searchParams.get('property') || '';
  const initialDate = searchParams.get('date') || dayjs().format('YYYY-MM-DD');

  const [inspectionData, setInspectionData] =
    useState<CleaningInspection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCameraSection, setActiveCameraSection] = useState<string | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    desc: string;
  }>({ src: '', desc: '' });

  const handlePreviewImage = (src: string, desc: string = '') => {
    setPreviewImage({ src, desc });
    setPreviewVisible(true);
  };

  const loadArchivedInspections = useCallback((): CleaningInspection[] => {
    try {
      const data = localStorage.getItem('archived-cleaning-inspections');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  const saveArchivedInspection = useCallback(
    (inspection: CleaningInspection) => {
      const archives = loadArchivedInspections();
      const existingIndex = archives.findIndex(a => a.id === inspection.id);
      if (existingIndex >= 0) archives[existingIndex] = inspection;
      else archives.unshift(inspection);
      localStorage.setItem(
        'archived-cleaning-inspections',
        JSON.stringify(archives)
      );
    },
    [loadArchivedInspections]
  );

  const loadPropertyTemplates = useCallback((): any[] => {
    try {
      const data = localStorage.getItem('cleaning-inspection-properties');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, []);

  const initializeInspection = useCallback(() => {
    const id = generateInspectionId();
    const properties = loadPropertyTemplates();
    const matchingProperty = properties.find(
      (p: any) => p.name === initialPropertyId
    );

    if (matchingProperty) {
      const activeSections =
        matchingProperty.sections ||
        BASE_ROOM_SECTIONS_TPL.map((s: any) => s.id);
      const sections = getAllSectionsTpl(activeSections).map((s: any) => ({
        ...s,
        referenceImages: matchingProperty.referenceImages?.[s.id] || [],
        photos: [],
        notes: '',
      }));

      const newInspection: CleaningInspection = {
        id,
        propertyId: matchingProperty.name,
        propertyAddress: matchingProperty.address,
        checkOutDate: initialDate,
        submittedAt: new Date(),
        sections,
        submitterName: undefined,
        status: 'draft',
        templateName: matchingProperty.name,
      };
      setInspectionData(newInspection);
      setIsArchivedView(false);
    } else {
      const newInspection: CleaningInspection = {
        id,
        propertyId: initialPropertyId,
        propertyAddress: '',
        checkOutDate: initialDate,
        submittedAt: new Date(),
        sections: DEFAULT_ROOM_SECTIONS.map(section => ({
          ...section,
          referenceImages: [],
          photos: [],
          notes: '',
        })),
        submitterName: undefined,
        status: 'draft',
        templateName: undefined,
      };
      setInspectionData(newInspection);
      setIsArchivedView(false);
    }
  }, [initialPropertyId, initialDate, loadPropertyTemplates]);

  useEffect(() => {
    if (inspectionId) {
      if (inspectionData?.id === inspectionId) return;

      const archives = loadArchivedInspections();
      const existing = archives.find(a => a.id === inspectionId);
      if (existing) {
        const migrated = {
          ...existing,
          sections: existing.sections.map((s: any) => ({
            ...s,
            referenceImages: s.referenceImage
              ? [{ image: s.referenceImage, description: '' }]
              : s.referenceImages || [],
            referenceImage: undefined,
          })),
        };
        setInspectionData(migrated);
        setIsArchivedView(true);
      } else {
        const properties = loadPropertyTemplates();
        const matchingProperty = properties.find(
          (p: any) => p.name === initialPropertyId
        );

        if (matchingProperty) {
          const activeSections =
            matchingProperty.sections ||
            BASE_ROOM_SECTIONS_TPL.map((s: any) => s.id);
          const sections = getAllSectionsTpl(activeSections).map((s: any) => ({
            ...s,
            referenceImages: matchingProperty.referenceImages?.[s.id] || [],
            photos: [],
            notes: '',
          }));

          const newInspection: CleaningInspection = {
            id: inspectionId,
            propertyId: matchingProperty.name,
            propertyAddress: matchingProperty.address,
            checkOutDate: initialDate,
            submittedAt: new Date(),
            sections,
            submitterName: undefined,
            status: 'draft',
            templateName: matchingProperty.name,
          };
          setInspectionData(newInspection);
          setIsArchivedView(false);
        } else {
          const newInspection: CleaningInspection = {
            id: inspectionId,
            propertyId: initialPropertyId,
            propertyAddress: '',
            checkOutDate: initialDate,
            submittedAt: new Date(),
            sections: DEFAULT_ROOM_SECTIONS.map(section => ({
              ...section,
              referenceImages: [],
              photos: [],
              notes: '',
            })),
            submitterName: undefined,
            status: 'draft',
            templateName: undefined,
          };
          setInspectionData(newInspection);
          setIsArchivedView(false);
        }
      }
    } else {
      initializeInspection();
    }
  }, [
    inspectionId,
    loadArchivedInspections,
    initializeInspection,
    inspectionData,
    initialPropertyId,
    initialDate,
    loadPropertyTemplates,
  ]);

  const handleOpenCamera = useCallback(
    async (sectionId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        streamRef.current = stream;
        setActiveCameraSection(sectionId);
        setIsCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);
      } catch {
        messageApi.error('Could not access camera');
      }
    },
    [messageApi]
  );

  const handleCloseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setActiveCameraSection(null);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current || !activeCameraSection || !inspectionData) return;
    try {
      const dataUrl = await capturePhotoWithTimestamp(videoRef.current);
      const newPhoto: UploadFile = {
        uid: `photo-${Date.now()}`,
        name: `photo-${Date.now()}.jpg`,
        status: 'done',
        url: dataUrl,
        type: 'image/jpeg',
      };
      setInspectionData({
        ...inspectionData,
        sections: inspectionData.sections.map(s =>
          s.id === activeCameraSection
            ? { ...s, photos: [...s.photos, newPhoto] }
            : s
        ),
      });
      messageApi.success('Photo captured!');
      handleCloseCamera();
    } catch {
      messageApi.error('Failed to capture photo');
    }
  }, [activeCameraSection, inspectionData, messageApi, handleCloseCamera]);

  const handleFileUpload = useCallback(
    (sectionId: string, file: RcFile) => {
      if (!inspectionData) return;
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        const newPhoto: UploadFile = {
          uid: file.uid,
          name: file.name,
          originFileObj: file,
          status: 'done',
          url: result,
          type: file.type,
        };
        setInspectionData({
          ...inspectionData,
          sections: inspectionData.sections.map(s =>
            s.id === sectionId ? { ...s, photos: [...s.photos, newPhoto] } : s
          ),
        });
      };
      reader.readAsDataURL(file);
      return false;
    },
    [inspectionData]
  );

  const handleRemovePhoto = useCallback(
    (sectionId: string, fileUid: string) => {
      if (!inspectionData) return;
      setInspectionData({
        ...inspectionData,
        sections: inspectionData.sections.map(s =>
          s.id === sectionId
            ? { ...s, photos: s.photos.filter(f => f.uid !== fileUid) }
            : s
        ),
      });
    },
    [inspectionData]
  );

  const handleNoteChange = useCallback(
    (sectionId: string, note: string) => {
      if (!inspectionData) return;
      setInspectionData({
        ...inspectionData,
        sections: inspectionData.sections.map(s =>
          s.id === sectionId ? { ...s, notes: note } : s
        ),
      });
    },
    [inspectionData]
  );

  const handleSubmit = useCallback(() => {
    if (!inspectionData) return;
    if (!inspectionData.propertyId && !inspectionData.propertyAddress) {
      messageApi.warning('Enter property ID or address');
      return;
    }
    const hasPhotos = inspectionData.sections.some(s => s.photos.length > 0);
    if (!hasPhotos) {
      messageApi.warning('Upload at least one photo');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const submitted = {
        ...inspectionData,
        status: 'submitted' as const,
        submittedAt: new Date(),
      };
      saveArchivedInspection(submitted);
      setInspectionData(submitted);
      setIsSubmitting(false);
      messageApi.success('Submitted successfully!');
    }, 1000);
  }, [inspectionData, messageApi, saveArchivedInspection]);

  const generateShareableLink = useCallback(() => {
    if (!inspectionData) return;
    const url = `${window.location.origin}/cleaning-inspection?id=${inspectionData.id}`;
    navigator.clipboard.writeText(url);
    messageApi.success('Link copied!');
  }, [inspectionData, messageApi]);

  const handleDeleteInspection = useCallback(() => {
    if (!inspectionData) return;
    const archives = loadArchivedInspections().filter(
      a => a.id !== inspectionData.id
    );
    localStorage.setItem(
      'archived-cleaning-inspections',
      JSON.stringify(archives)
    );
    messageApi.success('Deleted');
    initializeInspection();
  }, [
    inspectionData,
    loadArchivedInspections,
    messageApi,
    initializeInspection,
  ]);

  if (!inspectionData) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f5f5f5',
        }}
      >
        Loading...
      </div>
    );
  }

  const Tag: React.FC<{ color: string; children: React.ReactNode }> = ({
    color,
    children,
  }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: '12px',
        borderRadius: '4px',
        background:
          color === 'green'
            ? '#f6ffed'
            : color === 'blue'
              ? '#e6f7ff'
              : '#fafafa',
        border: `1px solid ${color === 'green' ? '#b7eb8f' : color === 'blue' ? '#91d5ff' : '#d9d9d9'}`,
        color:
          color === 'green'
            ? '#52c41a'
            : color === 'blue'
              ? '#1890ff'
              : '#595959',
      }}
    >
      {children}
    </span>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        padding: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      }}
    >
      {contextHolder}

      <div
        style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '12px' }}
      >
        <Row align='middle' justify='space-between'>
          <Col>
            <Space>
              <Tag
                color={inspectionData.status === 'submitted' ? 'green' : 'blue'}
              >
                {inspectionData.status === 'submitted' ? 'SUBMITTED' : 'DRAFT'}
              </Tag>
              <Text
                type='secondary'
                style={{ fontSize: '12px', fontFamily: 'monospace' }}
              >
                ID: {inspectionData.id}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<LinkOutlined />} onClick={generateShareableLink}>
                Copy Link
              </Button>
              {isArchivedView && (
                <Popconfirm title='Delete?' onConfirm={handleDeleteInspection}>
                  <Button danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
              <Button
                type='primary'
                size='large'
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={inspectionData.status === 'submitted'}
              >
                {inspectionData.status === 'submitted' ? 'Submitted' : 'Submit'}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card
        size='small'
        style={{
          maxWidth: '1000px',
          margin: '0 auto 12px',
          borderRadius: '8px',
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Text strong>Property ID *</Text>
            <Input
              value={inspectionData.propertyId}
              onChange={e =>
                setInspectionData({
                  ...inspectionData,
                  propertyId: e.target.value,
                })
              }
              placeholder='UNIT-101'
              style={{ marginTop: '4px' }}
              disabled={isArchivedView && inspectionData.status === 'submitted'}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Property Address</Text>
            <Input
              value={inspectionData.propertyAddress}
              onChange={e =>
                setInspectionData({
                  ...inspectionData,
                  propertyAddress: e.target.value,
                })
              }
              placeholder='123 Main St'
              style={{ marginTop: '4px' }}
              disabled={isArchivedView && inspectionData.status === 'submitted'}
            />
          </Col>
          <Col xs={12} sm={4}>
            <Text strong>Check-out Date</Text>
            <Input
              type='date'
              value={inspectionData.checkOutDate}
              onChange={e =>
                setInspectionData({
                  ...inspectionData,
                  checkOutDate: e.target.value,
                })
              }
              style={{ marginTop: '4px' }}
              disabled={isArchivedView && inspectionData.status === 'submitted'}
            />
          </Col>
          <Col xs={12} sm={4}>
            <Text strong>Cleaner Name</Text>
            <Input
              value={inspectionData.submitterName || ''}
              onChange={e =>
                setInspectionData({
                  ...inspectionData,
                  submitterName: e.target.value,
                })
              }
              placeholder='Your name'
              style={{ marginTop: '4px' }}
              disabled={isArchivedView && inspectionData.status === 'submitted'}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {inspectionData.sections.map((section, index) => (
          <Card
            key={section.id}
            size='small'
            title={
              <Space>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#1890ff',
                    color: '#fff',
                    fontSize: '12px',
                    marginRight: '8px',
                  }}
                >
                  {index + 1}
                </span>
                {section.name}
              </Space>
            }
            style={{ marginBottom: '12px', borderRadius: '8px' }}
          >
            <Text
              type='secondary'
              style={{
                fontSize: '12px',
                display: 'block',
                marginBottom: '12px',
              }}
            >
              {section.description}
            </Text>
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Space style={{ marginBottom: '12px' }}>
                  {!isArchivedView || inspectionData.status !== 'submitted' ? (
                    <>
                      <Button
                        type='primary'
                        icon={<CameraOutlined />}
                        size='small'
                        onClick={() => handleOpenCamera(section.id)}
                      >
                        Take Photo
                      </Button>
                      <Upload
                        showUploadList={false}
                        beforeUpload={file =>
                          handleFileUpload(section.id, file)
                        }
                      >
                        <Button icon={<UploadOutlined />} size='small'>
                          Upload
                        </Button>
                      </Upload>
                    </>
                  ) : (
                    <Text type='secondary'>
                      Photos ({section.photos.length})
                    </Text>
                  )}
                </Space>
                {section.photos.length > 0 ? (
                  <Row gutter={[8, 8]}>
                    {section.photos.map(photo => (
                      <Col xs={12} sm={8} key={photo.uid}>
                        <div
                          style={{
                            position: 'relative',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          {photo.url && (
                            <img
                              src={photo.url}
                              alt={photo.name}
                              style={{
                                width: '100%',
                                height: '100px',
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          {!isArchivedView &&
                            inspectionData.status !== 'submitted' && (
                              <Button
                                type='text'
                                danger
                                size='small'
                                icon={<DeleteOutlined />}
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  background: 'rgba(255,255,255,0.9)',
                                }}
                                onClick={() =>
                                  handleRemovePhoto(section.id, photo.uid)
                                }
                              />
                            )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div
                    style={{
                      background: '#fafafa',
                      border: '1px dashed #d9d9d9',
                      borderRadius: '4px',
                      padding: '24px',
                      textAlign: 'center',
                    }}
                  >
                    <CameraOutlined
                      style={{ fontSize: '24px', color: '#bfbfbf' }}
                    />
                    <Paragraph
                      type='secondary'
                      style={{ marginTop: '8px', marginBottom: 0 }}
                    >
                      No photos
                    </Paragraph>
                  </div>
                )}
                <div style={{ marginTop: '12px' }}>
                  <Text strong style={{ fontSize: '12px' }}>
                    Notes
                  </Text>
                  <TextArea
                    placeholder='Add notes...'
                    value={section.notes}
                    onChange={e => handleNoteChange(section.id, e.target.value)}
                    rows={2}
                    style={{ marginTop: '4px' }}
                    disabled={
                      isArchivedView && inspectionData.status === 'submitted'
                    }
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    background: '#f0f0f0',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    minHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Reference Images ({section.referenceImages.length})
                  </Text>
                  {section.referenceImages.length > 0 ? (
                    <div style={{ marginTop: '8px', width: '100%' }}>
                      <Row gutter={[8, 8]}>
                        {section.referenceImages.map((refImg, idx) => (
                          <Col span={12} key={idx}>
                            <div style={{ position: 'relative' }}>
                              <img
                                src={refImg.image}
                                alt={`Ref ${idx + 1}`}
                                onClick={() =>
                                  handlePreviewImage(
                                    refImg.image,
                                    refImg.description || ''
                                  )
                                }
                                style={{
                                  width: '100%',
                                  height: '70px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  border: refImg.description
                                    ? '2px solid #52c41a'
                                    : '2px solid transparent',
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: '4px',
                                  right: '4px',
                                  background: 'rgba(0,0,0,0.5)',
                                  color: '#fff',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                }}
                              >
                                <EyeOutlined />{' '}
                                {refImg.description ? 'View' : idx + 1}
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <div style={{ padding: '16px' }}>
                      <Text type='secondary' style={{ fontSize: '11px' }}>
                        No reference images
                      </Text>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        ))}
      </div>

      <Modal
        title='Take Photo'
        open={isCameraOpen}
        onCancel={handleCloseCamera}
        footer={[
          <Button key='cancel' onClick={handleCloseCamera}>
            Cancel
          </Button>,
          <Button key='capture' type='primary' onClick={handleTakePhoto}>
            Capture
          </Button>,
        ]}
      >
        <div
          style={{
            position: 'relative',
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </Modal>

      <Modal
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width='auto'
        style={{ maxWidth: '90vw' }}
        closable
        closeIcon={
          <CloseOutlined style={{ color: '#fff', fontSize: '20px' }} />
        }
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            maxHeight: '80vh',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewVisible(false);
          }}
        >
          <img
            src={previewImage.src}
            alt='Preview'
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
          {previewImage.desc && (
            <Paragraph
              style={{
                color: '#fff',
                marginTop: '12px',
                maxWidth: '600px',
                textAlign: 'center',
              }}
            >
              {previewImage.desc}
            </Paragraph>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CleaningInspectionPage;
