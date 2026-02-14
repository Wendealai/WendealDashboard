/**
 * PhotoCapture - Reusable camera / upload component with GPS+time watermark
 *
 * Features:
 * - Camera capture (rear-facing) with live preview
 * - File upload fallback
 * - Automatic GPS watermark + timestamp + address
 * - Image compression to ~500KB
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button, Modal, Upload, Space, message } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import { CameraOutlined, UploadOutlined } from '@ant-design/icons';
import {
  captureGPS,
  capturePhotoFromVideo,
  addWatermarkToImage,
  type GpsCoords,
  type WatermarkOptions,
} from '../utils';

interface PhotoCaptureProps {
  /** Called when a photo is captured or uploaded (base64 data URL) */
  onCapture: (dataUrl: string) => void;
  /** Property address for watermark */
  address?: string;
  /** If true, disable both camera and upload */
  disabled?: boolean;
  /** Button size */
  size?: 'small' | 'middle' | 'large';
  /** Custom camera button text */
  cameraText?: string;
  /** Custom upload button text */
  uploadText?: string;
  /** Show upload button (default true) */
  showUpload?: boolean;
}

/**
 * Reusable photo capture component with GPS+time watermark
 */
const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onCapture,
  address = '',
  disabled = false,
  size = 'small',
  cameraText = 'Camera',
  uploadText = 'Upload',
  showUpload = true,
}) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  /** Current GPS coords captured when camera opens */
  const gpsRef = useRef<GpsCoords | null>(null);

  /** Open the camera and capture GPS simultaneously */
  const handleOpenCamera = useCallback(async () => {
    setCameraLoading(true);
    try {
      // Capture GPS in parallel with camera init
      const [stream, gps] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        }),
        captureGPS(),
      ]);

      streamRef.current = stream;
      gpsRef.current = gps;
      setCameraOpen(true);

      // Attach stream to video element after modal renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      messageApi.error('Could not access camera. Please use Upload instead.');
    } finally {
      setCameraLoading(false);
    }
  }, [messageApi]);

  /** Stop camera stream */
  const handleCloseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  /** Take a photo from the video feed */
  const handleTakePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const watermarkOpts: WatermarkOptions = {
        gps: gpsRef.current,
        address,
      };
      const dataUrl = await capturePhotoFromVideo(
        videoRef.current,
        watermarkOpts
      );
      onCapture(dataUrl);
      handleCloseCamera();
      messageApi.success('Photo captured!');
    } catch {
      messageApi.error('Failed to capture photo');
    }
  }, [address, onCapture, handleCloseCamera, messageApi]);

  /** Handle file upload */
  const handleFileUpload = useCallback(
    async (file: RcFile) => {
      const reader = new FileReader();
      reader.onload = async e => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        try {
          // Get GPS and add watermark + compress
          const gps = await captureGPS();
          const processed = await addWatermarkToImage(dataUrl, {
            gps,
            address,
          });
          onCapture(processed);
          messageApi.success('Photo uploaded!');
        } catch {
          // Fallback: use compressed original without watermark
          onCapture(dataUrl);
        }
      };
      reader.readAsDataURL(file);
      return false; // Prevent antd default upload
    },
    [address, onCapture, messageApi]
  );

  return (
    <>
      {contextHolder}
      <Space>
        <Button
          type='primary'
          icon={<CameraOutlined />}
          size={size}
          onClick={handleOpenCamera}
          loading={cameraLoading}
          disabled={disabled}
        >
          {cameraText}
        </Button>
        {showUpload && (
          <Upload
            showUploadList={false}
            accept='image/*'
            beforeUpload={handleFileUpload}
            disabled={disabled}
          >
            <Button icon={<UploadOutlined />} size={size} disabled={disabled}>
              {uploadText}
            </Button>
          </Upload>
        )}
      </Space>

      {/* Camera Modal */}
      <Modal
        title='Take Photo'
        open={cameraOpen}
        onCancel={handleCloseCamera}
        width={640}
        footer={[
          <Button key='cancel' onClick={handleCloseCamera}>
            Cancel
          </Button>,
          <Button
            key='capture'
            type='primary'
            onClick={handleTakePhoto}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
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
            muted
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </Modal>
    </>
  );
};

export default PhotoCapture;
