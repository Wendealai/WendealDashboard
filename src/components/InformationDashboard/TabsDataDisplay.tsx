import React, { useState, ReactNode } from 'react';
import { Card, Space, Button } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

/**
 * 标签页数据项接口
 */
export interface TabDataItem {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  closable?: boolean;
}

/**
 * TabsDataDisplay组件属性接口
 */
export interface TabsDataDisplayProps {
  /** 标签页数据列表 */
  tabs: TabDataItem[];
  /** 当前激活的标签页key */
  activeKey?: string;
  /** 标签页切换回调 */
  onChange?: (key: string) => void;
  /** 标签页关闭回调 */
  onClose?: (key: string) => void;
  /** 添加新标签页回调 */
  onAdd?: () => void;
  /** 是否显示添加按钮 */
  showAddButton?: boolean;
  /** 组件样式类名 */
  className?: string;
  /** 是否紧凑模式 */
  compact?: boolean;
}

/**
 * 标签页数据展示组件
 * 为多个工作流结果提供标签页展示框架
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
  // 内部状态管理当前激活的标签页
  const [internalActiveKey, setInternalActiveKey] = useState<string>(
    activeKey || (tabs.length > 0 ? tabs[0].key : '')
  );

  // 获取当前激活的标签页key
  const currentActiveKey = activeKey || internalActiveKey;

  /**
   * 处理标签页切换
   */
  const handleTabChange = (key: string) => {
    if (onChange) {
      onChange(key);
    } else {
      setInternalActiveKey(key);
    }
  };

  /**
   * 处理标签页关闭
   */
  const handleTabClose = (key: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClose) {
      onClose(key);
    }
  };

  /**
   * 处理添加新标签页
   */
  const handleAddTab = () => {
    if (onAdd) {
      onAdd();
    }
  };

  /**
   * 获取当前激活标签页的内容
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
      {/* 标签页切换按钮区域 */}
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
              添加
            </Button>
          )}
        </Space>
      </Card>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'auto' }}>{getCurrentTabContent()}</div>
    </div>
  );
};

export { TabsDataDisplay as default };
export { TabsDataDisplay };
