import React, { useState } from 'react';
import { Card, Button, Space } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

/**
 * Tab data item interface
 */
export interface TabDataItem {
  key: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  closable?: boolean;
}

/**
 * TabsDataDisplay component props
 */
export interface TabsDataDisplayProps {
  tabs: TabDataItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  onClose?: (key: string) => void;
  onAdd?: () => void;
  showAddButton?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * TabsDataDisplay component
 * Custom tab display component for workflow results
 * Supports tab switching, closing, and adding new tabs
 * Optimized for compact layout and responsive design
 *
 * @param props - Component props
 * @returns React component
 *
 * Features:
 * - Custom tab button design
 * - Support for closable tabs
 * - Add new tab functionality
 * - Compact layout mode
 * - Responsive design
 *
 * Provides tab display framework for multiple workflow results
 */
const TabsDataDisplay: React.FC<TabsDataDisplayProps> = ({
  tabs,
  activeKey,
  onChange,
  onClose,
  onAdd,
  showAddButton = false,
  className = '',
  compact = true,
}) => {
  // Internal state management for currently active tab
  const [internalActiveKey, setInternalActiveKey] = useState<string>(
    activeKey || (tabs.length > 0 ? tabs[0]?.key || '' : '')
  );

  // Get currently active tab key
  const currentActiveKey = activeKey || internalActiveKey;

  /**
   * Handle tab change
   */
  const handleTabChange = (key: string) => {
    if (onChange) {
      onChange(key);
    } else {
      setInternalActiveKey(key);
    }
  };

  /**
   * Handle tab close
   */
  const handleTabClose = (key: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClose) {
      onClose(key);
    }
  };

  /**
   * Handle add new tab
   */
  const handleAddTab = () => {
    if (onAdd) {
      onAdd();
    }
  };

  /**
   * Get current active tab content
   */
  const getCurrentTabContent = () => {
    const activeTab = tabs.find(tab => tab.key === currentActiveKey);
    return activeTab?.content || null;
  };

  return (
    <div
      className={`${className} ${compact ? 'compact-layout' : ''}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Tab switching button area */}
      <Card
        size={compact ? 'small' : 'default'}
        className={compact ? 'compact-spacing' : ''}
        style={{ marginBottom: compact ? 8 : 16 }}
      >
        <Space wrap>
          {tabs.map(tab => (
            <div
              key={tab.key}
              style={{ position: 'relative', display: 'inline-block' }}
            >
              <Button
                type={currentActiveKey === tab.key ? 'primary' : 'default'}
                icon={tab.icon}
                onClick={() => handleTabChange(tab.key)}
                size={compact ? 'small' : 'middle'}
                style={{
                  paddingRight: tab.closable ? 32 : undefined,
                }}
              >
                {tab.label}
              </Button>
              {tab.closable && (
                <Button
                  type='text'
                  size='small'
                  icon={<CloseOutlined />}
                  onClick={e => handleTabClose(tab.key, e)}
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    minWidth: 16,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                  }}
                />
              )}
            </div>
          ))}
          {showAddButton && (
            <Button
              type='dashed'
              icon={<PlusOutlined />}
              onClick={handleAddTab}
              size={compact ? 'small' : 'middle'}
            >
              Add
            </Button>
          )}
        </Space>
      </Card>

      {/* Content area - remove overflow, controlled by parent container */}
      <div style={{ flex: 1, minHeight: 0 }}>{getCurrentTabContent()}</div>
    </div>
  );
};

export { TabsDataDisplay as default };
export { TabsDataDisplay };
