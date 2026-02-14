/**
 * ChecklistCard - Single checklist item with optional required-photo trigger
 *
 * Displays a checkbox + label. If requiredPhoto is true, the item shows a
 * camera icon and cannot be checked until a photo is attached.
 */

import React from 'react';
import { Checkbox, Typography, Tag, Button, Tooltip } from 'antd';
import {
  CameraOutlined,
  CheckCircleFilled,
  PictureOutlined,
} from '@ant-design/icons';
import type { ChecklistItem } from '../types';

const { Text } = Typography;

interface ChecklistCardProps {
  item: ChecklistItem;
  /** Called when the checked state changes */
  onToggle: (checked: boolean) => void;
  /** Called when the user wants to take/upload a photo for this item */
  onPhotoRequest: () => void;
  /** If true, the card is read-only */
  disabled?: boolean;
}

/**
 * Renders a single checklist item as a card-like row
 */
const ChecklistCard: React.FC<ChecklistCardProps> = ({
  item,
  onToggle,
  onPhotoRequest,
  disabled = false,
}) => {
  const needsPhoto = item.requiredPhoto && !item.photo;
  const canCheck = !item.requiredPhoto || !!item.photo;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
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
        title={
          needsPhoto && !disabled
            ? 'Take a photo first before checking this item'
            : undefined
        }
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
        {item.label}
      </Text>

      {/* Required photo indicator / button */}
      {item.requiredPhoto && (
        <>
          {item.photo ? (
            <Tooltip title='Photo attached'>
              <CheckCircleFilled
                style={{ color: '#52c41a', fontSize: '16px' }}
              />
            </Tooltip>
          ) : (
            <Tooltip title='Photo required - tap to take photo'>
              <Button
                type='text'
                size='small'
                icon={<CameraOutlined />}
                onClick={onPhotoRequest}
                disabled={disabled}
                style={{
                  color: '#fa8c16',
                  border: '1px dashed #fa8c16',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                Required
              </Button>
            </Tooltip>
          )}
        </>
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
