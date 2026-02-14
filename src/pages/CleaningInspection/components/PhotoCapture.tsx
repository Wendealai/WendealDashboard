/**
 * PhotoCapture - Reusable camera / upload component with GPS+time watermark
 *
 * Features:
 * - Camera capture (rear-facing, wide-angle default) with live preview
 * - File upload fallback
 * - Automatic GPS watermark + timestamp + address
 * - Image compression to ~500KB
 * - Proper stream cleanup to prevent black screen on re-open
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { useLang } from '../i18n';

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
  cameraText,
  uploadText,
  showUpload = true,
}) => {
  const { t } = useLang();
  const resolvedCameraText = cameraText ?? t('photo.camera');
  const resolvedUploadText = uploadText ?? t('photo.upload');

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  /** Current GPS coords captured when camera opens */
  const gpsRef = useRef<GpsCoords | null>(null);

  /**
   * Cleanup: stop all tracks and clear video srcObject.
   * Safe to call multiple times.
   */
  const stopStream = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  /** Cleanup stream on component unmount to prevent dangling camera access */
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  /**
   * When camera opens and stream is ready, assign srcObject to video element.
   * Uses useEffect instead of setTimeout to avoid race conditions.
   */
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  /** Open the camera and capture GPS simultaneously */
  const handleOpenCamera = useCallback(async () => {
    setCameraLoading(true);
    try {
      // Defensive cleanup: stop any lingering stream before requesting new one
      stopStream();

      // Capture GPS in parallel with camera init
      // Request wide-angle (zoom: 1) to avoid default telephoto lens
      const [stream, gps] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-expect-error - zoom is valid in MediaTrackConstraints on mobile browsers
            zoom: 1,
          },
        }),
        captureGPS(),
      ]);

      // Try to apply minimum zoom constraint for broader device support
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          // @ts-expect-error - advanced constraints with zoom are valid on mobile
          await videoTrack.applyConstraints({ advanced: [{ zoom: 1 }] });
        }
      } catch {
        // Zoom constraint not supported on this device - silently ignore
      }

      streamRef.current = stream;
      gpsRef.current = gps;
      setCameraOpen(true);
    } catch {
      messageApi.error(t('photo.cameraError'));
    } finally {
      setCameraLoading(false);
    }
  }, [messageApi, stopStream, t]);

  /** Stop camera stream and close modal */
  const handleCloseCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
  }, [stopStream]);

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
      messageApi.success(t('photo.captured'));
    } catch {
      messageApi.error(t('photo.captureFailed'));
    }
  }, [address, onCapture, handleCloseCamera, messageApi, t]);

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
          messageApi.success(t('photo.uploaded'));
        } catch {
          // Fallback: use compressed original without watermark
          onCapture(dataUrl);
        }
      };
      reader.readAsDataURL(file);
      return false; // Prevent antd default upload
    },
    [address, onCapture, messageApi, t]
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
          {resolvedCameraText}
        </Button>
        {showUpload && (
          <Upload
            showUploadList={false}
            accept='image/*'
            beforeUpload={handleFileUpload}
            disabled={disabled}
          >
            <Button icon={<UploadOutlined />} size={size} disabled={disabled}>
              {resolvedUploadText}
            </Button>
          </Upload>
        )}
      </Space>

      {/* Camera Modal */}
      <Modal
        title={t('photo.modalTitle')}
        open={cameraOpen}
        onCancel={handleCloseCamera}
        width={640}
        footer={[
          <Button key='cancel' onClick={handleCloseCamera}>
            {t('photo.cancel')}
          </Button>,
          <Button
            key='capture'
            type='primary'
            onClick={handleTakePhoto}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            {t('photo.capture')}
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
