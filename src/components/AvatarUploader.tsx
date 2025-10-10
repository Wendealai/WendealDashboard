import React, { useRef } from 'react';
import { Avatar, message } from 'antd';
import {
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface AvatarUploaderProps {
  value?: string | undefined;
  onChange?: (avatar: string | undefined) => void;
  maxSize?: number; // in MB
  disabled?: boolean;
}

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  value,
  onChange,
  maxSize = 5,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('profile.validation.avatarUploadFailed'));
      return;
    }

    // Check file size
    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(
        `${t('profile.validation.avatarUploadFailed')} ${maxSize}MB`
      );
      return;
    }

    try {
      // Convert to base64
      const base64 = await fileToBase64(file);
      onChange?.(base64);
      message.success(t('profile.messages.avatarUploadSuccess'));
    } catch (error) {
      message.error(t('profile.messages.avatarUploadFailed'));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = () => {
    onChange?.('');
    message.success(t('profile.messages.updateSuccess'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('profile.validation.avatarUploadFailed'));
      return;
    }

    // Check file size
    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(
        `${t('profile.validation.avatarUploadFailed')} ${maxSize}MB`
      );
      return;
    }

    try {
      // Convert to base64
      const base64 = await fileToBase64(file);
      onChange?.(base64);
      message.success(t('profile.messages.avatarUploadSuccess'));
    } catch (error) {
      message.error(t('profile.messages.avatarUploadFailed'));
    }
  };

  return (
    <div className='avatar-uploader-container'>
      <div
        className='avatar-upload-area'
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {value ? (
          <div className='avatar-with-remove'>
            <Avatar
              size={80}
              src={value}
              icon={<UserOutlined />}
              className='avatar-preview'
            />
            {!disabled && (
              <div
                className='remove-icon'
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove();
                }}
                title={t('profile.buttons.removeAvatar')}
              >
                <DeleteOutlined />
              </div>
            )}
          </div>
        ) : (
          <div className='avatar-placeholder'>
            <UserOutlined style={{ fontSize: '24px', color: '#999' }} />
            <div style={{ marginTop: 8 }}>
              <UploadOutlined style={{ fontSize: '16px', color: '#999' }} />
              <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                {t('profile.buttons.uploadAvatar')}
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
        multiple={false}
      />

      <style>{`
        .avatar-uploader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .avatar-upload-area {
          position: relative;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .avatar-upload-area:hover {
          transform: scale(1.02);
        }

        .avatar-with-remove {
          position: relative;
          display: inline-block;
        }

        .avatar-preview {
          border: 2px solid #d9d9d9;
          transition: border-color 0.3s;
        }

        .avatar-preview:hover {
          border-color: #1890ff;
        }

        .remove-icon {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ff4d4f;
          font-size: 12px;
          border: 1px solid #d9d9d9;
          transition: all 0.2s;
          z-index: 10;
        }

        .remove-icon:hover {
          background: #ff4d4f;
          color: white;
          transform: scale(1.1);
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border: 2px dashed #d9d9d9;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: border-color 0.3s;
          background: #fafafa;
        }

        .avatar-placeholder:hover {
          border-color: #1890ff;
          background: #f0f8ff;
        }
      `}</style>
    </div>
  );
};

export default AvatarUploader;
