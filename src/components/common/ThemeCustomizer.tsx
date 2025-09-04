import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Button,
  Space,
  Divider,
  Typography,
  Row,
  Col,
  Card,
  Input,
  InputNumber,
  Switch,
  Slider,
  ColorPicker,
  Select,
  Popconfirm,
  Upload,
  Modal,
  Form,
  Tooltip,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  SettingOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  BorderOutlined,
  SaveOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  ReloadOutlined,
  PlusOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { Color } from 'antd/es/color-picker';
import {
  useTheme,
  type CustomTheme,
  PRESET_THEMES,
} from '@/contexts/ThemeContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface ThemeCustomizerProps {
  visible: boolean;
  onClose: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  visible,
  onClose,
}) => {
  const {
    state,
    setTheme,
    addCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    getAllThemes,
    exportTheme,
    importTheme,
  } = useTheme();
  const message = useMessage();

  const [editingTheme, setEditingTheme] = useState<CustomTheme>(
    state.currentTheme
  );
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState('');
  const [form] = Form.useForm();

  // 同步当前主题到编辑状态
  useEffect(() => {
    if (!isPreviewMode) {
      setEditingTheme(state.currentTheme);
    }
  }, [state.currentTheme, isPreviewMode]);

  // 颜色变化处理
  const handleColorChange = (field: keyof CustomTheme, color: Color) => {
    const newTheme = {
      ...editingTheme,
      [field]: color.toHexString(),
    };
    setEditingTheme(newTheme);
    if (isPreviewMode) {
      setTheme(newTheme);
    }
  };

  // 数值变化处理
  const handleValueChange = (field: keyof CustomTheme, value: any) => {
    const newTheme = {
      ...editingTheme,
      [field]: value,
    };
    setEditingTheme(newTheme);
    if (isPreviewMode) {
      setTheme(newTheme);
    }
  };

  // 字体大小变化处理
  const handleFontSizeChange = (
    size: 'small' | 'medium' | 'large',
    value: number
  ) => {
    const newTheme = {
      ...editingTheme,
      fontSize: {
        ...editingTheme.fontSize,
        [size]: value,
      },
    };
    setEditingTheme(newTheme);
    if (isPreviewMode) {
      setTheme(newTheme);
    }
  };

  // 间距变化处理
  const handleSpacingChange = (
    size: 'small' | 'medium' | 'large',
    value: number
  ) => {
    const newTheme = {
      ...editingTheme,
      spacing: {
        ...editingTheme.spacing,
        [size]: value,
      },
    };
    setEditingTheme(newTheme);
    if (isPreviewMode) {
      setTheme(newTheme);
    }
  };

  // 应用主题
  const handleApplyTheme = () => {
    setTheme(editingTheme);
    message.success('主题已应用');
  };

  // 重置主题
  const handleResetTheme = () => {
    const originalTheme = state.currentTheme;
    setEditingTheme(originalTheme);
    if (isPreviewMode) {
      setTheme(originalTheme);
    }
    message.info('已重置为当前主题');
  };

  // 切换预览模式
  const handleTogglePreview = (checked: boolean) => {
    setIsPreviewMode(checked);
    if (checked) {
      setTheme(editingTheme);
    } else {
      setTheme(state.currentTheme);
    }
  };

  // 保存自定义主题
  const handleSaveTheme = () => {
    setSaveModalVisible(true);
    form.setFieldsValue({
      name: editingTheme.name,
      id: editingTheme.id,
    });
  };

  // 确认保存主题
  const handleConfirmSave = async () => {
    try {
      const values = await form.validateFields();
      const newTheme: CustomTheme = {
        ...editingTheme,
        id: values.id,
        name: values.name,
      };

      // 检查是否是更新现有主题
      const existingTheme = getAllThemes().find(t => t.id === values.id);
      if (existingTheme && !PRESET_THEMES.find(t => t.id === values.id)) {
        updateCustomTheme(newTheme);
        message.success('Theme updated successfully');
      } else if (!existingTheme) {
        addCustomTheme(newTheme);
        message.success('Theme saved successfully');
      } else {
        message.error(
          'Cannot override preset theme, please use a different ID'
        );
        return;
      }

      setTheme(newTheme);
      setSaveModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Save theme error:', error);
    }
  };

  // 删除自定义主题
  const handleDeleteTheme = (themeId: string) => {
    deleteCustomTheme(themeId);
    message.success('Theme deleted successfully');
  };

  // 导出主题
  const handleExportTheme = () => {
    const themeData = exportTheme(editingTheme);
    const blob = new Blob([themeData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingTheme.name || 'custom-theme'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Theme exported successfully');
  };

  // 导入主题
  const handleImportTheme = () => {
    if (!importData.trim()) {
      message.error('Please enter theme data');
      return;
    }

    const theme = importTheme(importData);
    if (theme) {
      // 生成唯一ID
      const uniqueId = `imported-${Date.now()}`;
      const importedTheme = {
        ...theme,
        id: uniqueId,
        name: `${theme.name} (导入)`,
      };

      setEditingTheme(importedTheme);
      if (isPreviewMode) {
        setTheme(importedTheme);
      }
      setImportModalVisible(false);
      setImportData('');
      message.success('Theme imported successfully');
    } else {
      message.error('Invalid theme data format');
    }
  };

  // 复制主题
  const handleCopyTheme = (theme: CustomTheme) => {
    const copiedTheme = {
      ...theme,
      id: `copy-${Date.now()}`,
      name: `${theme.name} (副本)`,
    };
    setEditingTheme(copiedTheme);
    if (isPreviewMode) {
      setTheme(copiedTheme);
    }
    message.success('主题已复制');
  };

  const allThemes = getAllThemes();

  return (
    <>
      <Drawer
        title={
          <Space>
            <BgColorsOutlined />
            主题定制器
          </Space>
        }
        placement='right'
        width={400}
        open={visible}
        onClose={onClose}
        extra={
          <Space>
            <Tooltip title='实时预览'>
              <Switch
                checked={isPreviewMode}
                onChange={handleTogglePreview}
                checkedChildren={<EyeOutlined />}
                unCheckedChildren={<EyeOutlined />}
              />
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={handleResetTheme}>
              重置
            </Button>
          </Space>
        }
      >
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          {/* 主题选择 */}
          <Card size='small' title='选择主题'>
            <Select
              style={{ width: '100%' }}
              value={editingTheme.id}
              onChange={value => {
                const selectedTheme = allThemes.find(t => t.id === value);
                if (selectedTheme) {
                  setEditingTheme(selectedTheme);
                  if (isPreviewMode) {
                    setTheme(selectedTheme);
                  }
                }
              }}
            >
              {allThemes.map(theme => (
                <Option key={theme.id} value={theme.id}>
                  <Space>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: theme.primaryColor,
                        borderRadius: 2,
                      }}
                    />
                    {theme.name}
                    {!PRESET_THEMES.find(t => t.id === theme.id) && (
                      <Space size={4}>
                        <Button
                          type='text'
                          size='small'
                          icon={<CopyOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                            handleCopyTheme(theme);
                          }}
                        />
                        <Popconfirm
                          title='确定删除这个主题吗？'
                          onConfirm={e => {
                            e?.stopPropagation();
                            handleDeleteTheme(theme.id);
                          }}
                          onCancel={e => e?.stopPropagation()}
                        >
                          <Button
                            type='text'
                            size='small'
                            danger
                            icon={<DeleteOutlined />}
                            onClick={e => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    )}
                  </Space>
                </Option>
              ))}
            </Select>
          </Card>

          {/* 基础设置 */}
          <Card size='small' title='基础设置'>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text>深色模式</Text>
                </Col>
                <Col span={12}>
                  <Switch
                    checked={editingTheme.isDark}
                    onChange={checked => handleValueChange('isDark', checked)}
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Text>圆角大小</Text>
                </Col>
                <Col span={12}>
                  <InputNumber
                    min={0}
                    max={20}
                    value={editingTheme.borderRadius}
                    onChange={value =>
                      handleValueChange('borderRadius', value || 0)
                    }
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Space>
          </Card>

          {/* 颜色设置 */}
          <Card size='small' title='颜色设置'>
            <Space direction='vertical' style={{ width: '100%' }}>
              {[
                { key: 'primaryColor', label: '主色调' },
                { key: 'backgroundColor', label: '背景色' },
                { key: 'textColor', label: '文字色' },
                { key: 'borderColor', label: '边框色' },
                { key: 'headerColor', label: '头部色' },
                { key: 'sidebarColor', label: '侧边栏色' },
                { key: 'cardColor', label: '卡片色' },
              ].map(({ key, label }) => (
                <Row key={key} gutter={16} align='middle'>
                  <Col span={12}>
                    <Text>{label}</Text>
                  </Col>
                  <Col span={12}>
                    <ColorPicker
                      value={editingTheme[key as keyof CustomTheme] as string}
                      onChange={color =>
                        handleColorChange(key as keyof CustomTheme, color)
                      }
                      showText
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          </Card>

          {/* 字体设置 */}
          <Card size='small' title='字体设置'>
            <Space direction='vertical' style={{ width: '100%' }}>
              {[
                { key: 'small', label: '小字体', min: 10, max: 16 },
                { key: 'medium', label: '中字体', min: 12, max: 18 },
                { key: 'large', label: '大字体', min: 14, max: 24 },
              ].map(({ key, label, min, max }) => (
                <Row key={key} gutter={16} align='middle'>
                  <Col span={8}>
                    <Text>{label}</Text>
                  </Col>
                  <Col span={10}>
                    <Slider
                      min={min}
                      max={max}
                      value={
                        editingTheme.fontSize[
                          key as keyof typeof editingTheme.fontSize
                        ]
                      }
                      onChange={value =>
                        handleFontSizeChange(
                          key as 'small' | 'medium' | 'large',
                          value
                        )
                      }
                    />
                  </Col>
                  <Col span={6}>
                    <InputNumber
                      min={min}
                      max={max}
                      value={
                        editingTheme.fontSize[
                          key as keyof typeof editingTheme.fontSize
                        ]
                      }
                      onChange={value =>
                        handleFontSizeChange(
                          key as 'small' | 'medium' | 'large',
                          value || min
                        )
                      }
                      size='small'
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          </Card>

          {/* 间距设置 */}
          <Card size='small' title='间距设置'>
            <Space direction='vertical' style={{ width: '100%' }}>
              {[
                { key: 'small', label: '小间距', min: 4, max: 16 },
                { key: 'medium', label: '中间距', min: 8, max: 32 },
                { key: 'large', label: '大间距', min: 16, max: 48 },
              ].map(({ key, label, min, max }) => (
                <Row key={key} gutter={16} align='middle'>
                  <Col span={8}>
                    <Text>{label}</Text>
                  </Col>
                  <Col span={10}>
                    <Slider
                      min={min}
                      max={max}
                      value={
                        editingTheme.spacing[
                          key as keyof typeof editingTheme.spacing
                        ]
                      }
                      onChange={value =>
                        handleSpacingChange(
                          key as 'small' | 'medium' | 'large',
                          value
                        )
                      }
                    />
                  </Col>
                  <Col span={6}>
                    <InputNumber
                      min={min}
                      max={max}
                      value={
                        editingTheme.spacing[
                          key as keyof typeof editingTheme.spacing
                        ]
                      }
                      onChange={value =>
                        handleSpacingChange(
                          key as 'small' | 'medium' | 'large',
                          value || min
                        )
                      }
                      size='small'
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          </Card>

          {/* 操作按钮 */}
          <Card size='small'>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Row gutter={8}>
                <Col span={12}>
                  <Button
                    type='primary'
                    icon={<SettingOutlined />}
                    onClick={handleApplyTheme}
                    style={{ width: '100%' }}
                  >
                    应用主题
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveTheme}
                    style={{ width: '100%' }}
                  >
                    保存主题
                  </Button>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExportTheme}
                    style={{ width: '100%' }}
                  >
                    导出主题
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => setImportModalVisible(true)}
                    style={{ width: '100%' }}
                  >
                    导入主题
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>
        </Space>
      </Drawer>

      {/* 保存主题模态框 */}
      <Modal
        title='保存主题'
        open={saveModalVisible}
        onOk={handleConfirmSave}
        onCancel={() => setSaveModalVisible(false)}
        okText='保存'
        cancelText='取消'
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='name'
            label='主题名称'
            rules={[{ required: true, message: '请输入主题名称' }]}
          >
            <Input placeholder='请输入主题名称' />
          </Form.Item>
          <Form.Item
            name='id'
            label='主题ID'
            rules={[
              { required: true, message: '请输入主题ID' },
              {
                pattern: /^[a-zA-Z0-9-_]+$/,
                message: 'ID只能包含字母、数字、横线和下划线',
              },
            ]}
          >
            <Input placeholder='请输入主题ID' />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入主题模态框 */}
      <Modal
        title='导入主题'
        open={importModalVisible}
        onOk={handleImportTheme}
        onCancel={() => {
          setImportModalVisible(false);
          setImportData('');
        }}
        okText='导入'
        cancelText='取消'
        width={600}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text>请粘贴主题JSON数据：</Text>
          <TextArea
            rows={10}
            value={importData}
            onChange={e => setImportData(e.target.value)}
            placeholder='请粘贴主题JSON数据...'
          />
        </Space>
      </Modal>
    </>
  );
};

export { ThemeCustomizer as default };
export { ThemeCustomizer };
