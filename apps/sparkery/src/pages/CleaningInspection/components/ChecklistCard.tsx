/**
 * ChecklistCard - Single checklist item with icon-only camera/file buttons
 *
 * Displays a checkbox + label. If requiredPhoto is true, shows two compact
 * icon buttons (camera + file picker). Otherwise shows them as optional actions.
 */

import React from 'react';
import { Checkbox, Typography, Button, Tooltip, Space } from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { ChecklistItem } from '../types';
import { useLang } from '../i18n';

const { Text } = Typography;

interface ChecklistCardProps {
  item: ChecklistItem;
  /** Called when the checked state changes */
  onToggle: (checked: boolean) => void;
  /** Called when the user wants to take a photo via camera */
  onCameraRequest: () => void;
  /** Called when the user wants to pick a file from gallery */
  onFileRequest: () => void;
  /** If true, the card is read-only */
  disabled?: boolean;
}

/**
 * Renders a single checklist item as a card-like row with icon-only photo actions
 */
const ChecklistCard: React.FC<ChecklistCardProps> = ({
  item,
  onToggle,
  onCameraRequest,
  onFileRequest,
  disabled = false,
}) => {
  const { t, lang } = useLang();
  const needsPhoto = item.requiredPhoto && !item.photo;
  const canCheck = !item.requiredPhoto || !!item.photo;
  /** 根据语言显示对应 label：英文模式下优先 labelEn，否则显示 label */
  const displayLabel =
    lang === 'en' && item.labelEn ? item.labelEn : item.label;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: item.checked ? '#f6ffed' : '#fafafa',
        border: `1px solid ${item.checked ? '#b7eb8f' : '#e8e8e8'}`,
        borderRadius: '6px',
        marginBottom: '6px',
        transition: 'all 0.2s',
      }}
    >
      {/* Checkbox */}
      <Tooltip
        title={needsPhoto && !disabled ? t('checklist.photoFirst') : undefined}
      >
        <Checkbox
          checked={item.checked}
          disabled={disabled || !canCheck}
          onChange={e => onToggle(e.target.checked)}
        />
      </Tooltip>

      {/* Label */}
      <Text
        style={{
          flex: 1,
          textDecoration: item.checked ? 'line-through' : 'none',
          color: item.checked ? '#8c8c8c' : '#262626',
          fontSize: '13px',
        }}
      >
        {displayLabel}
      </Text>

      {/* Photo status indicator */}
      {item.photo && (
        <Tooltip title={t('checklist.photoAttached')}>
          <CheckCircleFilled style={{ color: '#52c41a', fontSize: '16px' }} />
        </Tooltip>
      )}

      {/* Icon-only camera + file buttons */}
      {!disabled && (
        <Space size={4}>
          <Tooltip title={t('checklist.cameraTooltip')}>
            <Button
              type='text'
              size='small'
              icon={<CameraOutlined />}
              onClick={onCameraRequest}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: needsPhoto ? '#fa8c16' : '#595959',
                border: needsPhoto ? '1px dashed #fa8c16' : '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            />
          </Tooltip>
          <Tooltip title={t('checklist.fileTooltip')}>
            <Button
              type='text'
              size='small'
              icon={<FolderOpenOutlined />}
              onClick={onFileRequest}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#595959',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
              }}
            />
          </Tooltip>
        </Space>
      )}

      {/* Photo thumbnail if exists */}
      {item.photo && (
        <img
          src={item.photo}
          alt='Evidence'
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'cover',
            borderRadius: '4px',
            border: '1px solid #d9d9d9',
            cursor: 'pointer',
          }}
        />
      )}
    </div>
  );
};

export default ChecklistCard;
