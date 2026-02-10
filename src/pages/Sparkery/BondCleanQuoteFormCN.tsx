import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  message,
  Spin,
  Tooltip,
} from 'antd';
import {
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface BondCleanFormData {
  // Customer Info
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  isSparkeryNewCustomer: boolean;

  // Property Details
  propertyType: 'apartment' | 'townhouse' | 'house';
  houseLevel?: 'single' | 'double';
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;

  // Add-ons with quantities
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;

  // Additional Info
  preferredDate: string;
  additionalNotes: string;
}

const BondCleanQuoteFormCN: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasCarpet, setHasCarpet] = useState(false);
  const [showCustomRoomType, setShowCustomRoomType] = useState(false);
  const [showRubbishNotes, setShowRubbishNotes] = useState(false);
  const [propertyType, setPropertyType] = useState<string>('apartment');

  // Set page title
  useEffect(() => {
    document.title = '退租清洁报价申请 - Sparkery';
    return () => {
      document.title = 'Wendeal Dashboard';
    };
  }, []);

  const roomTypes = [
    { id: 'studio', name: '单间 (Studio)', maxCarpet: 1 },
    { id: '1_bed', name: '1房1卫', maxCarpet: 1 },
    { id: '2_bed_1b', name: '2房1卫', maxCarpet: 2 },
    { id: '2_bed_2b', name: '2房2卫', maxCarpet: 2 },
    { id: '3_bed_1b', name: '3房1卫', maxCarpet: 3 },
    { id: '3_bed_2b', name: '3房2卫', maxCarpet: 3 },
    { id: '4_bed_2b', name: '4房2卫', maxCarpet: 4 },
    { id: 'other', name: '其他（请在下方说明）', maxCarpet: 5 },
  ];

  const copyPageUrl = () => {
    // Always use the standalone route URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/bond-clean-quote-cn`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        message.success('页面链接已复制到剪贴板！');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  const onFinish = async (values: BondCleanFormData) => {
    setLoading(true);

    try {
      // Prepare form data for submission
      const formData = {
        ...values,
        submittedAt: new Date().toISOString(),
        formType: 'bond_clean_quote_request_cn',
      };

      // TODO: Replace with actual API endpoint
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Store in localStorage as fallback
      const existingSubmissions = JSON.parse(
        localStorage.getItem('bondCleanQuoteRequests') || '[]'
      );
      existingSubmissions.push({
        ...formData,
        id: `BCQ-CN-${Date.now()}`,
      });
      localStorage.setItem(
        'bondCleanQuoteRequests',
        JSON.stringify(existingSubmissions)
      );

      message.success('您的报价请求已成功提交！');
      setSubmitted(true);
    } catch (error) {
      message.error('提交失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7f0 0%, #e8f5e9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <Card style={{ maxWidth: 500, textAlign: 'center', padding: '40px' }}>
          <CheckCircleOutlined
            style={{ fontSize: 64, color: '#005901', marginBottom: 24 }}
          />
          <Title level={2} style={{ color: '#005901' }}>
            感谢您！
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            您的退租清洁报价请求已成功提交。
          </Paragraph>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            我们将审核您的房产信息，并在24小时内为您提供详细报价。
          </Paragraph>
          <Divider />
          <Paragraph style={{ fontSize: 14, color: '#888' }}>
            如有任何紧急问题，请联系我们：
            <br />
            <strong>电话：</strong>0478 540 915
            <br />
            <strong>邮箱：</strong>info@sparkery.com.au
          </Paragraph>
          <Button
            type='primary'
            style={{
              backgroundColor: '#005901',
              borderColor: '#005901',
              marginTop: 16,
            }}
            onClick={() => {
              setSubmitted(false);
              form.resetFields();
            }}
          >
            提交新的请求
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7f0 0%, #e8f5e9 100%)',
      }}
    >
      {/* Header - Simplified for mobile */}
      <div
        style={{
          background: '#005901',
          padding: '12px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <img
            src='https://sparkery.com.au/wp-content/uploads/2025/11/logo.png'
            alt='Sparkery Logo'
            style={{ height: 40 }}
          />
          <div style={{ textAlign: 'right', color: '#fff', fontSize: 12 }}>
            <div>
              <PhoneOutlined /> 0478 540 915
            </div>
            <div>
              <MailOutlined /> info@sparkery.com.au
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* Copy URL Button */}
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            icon={<CopyOutlined />}
            onClick={copyPageUrl}
            style={{ borderColor: '#005901', color: '#005901' }}
          >
            复制页面链接
          </Button>
        </div>

        <Card
          style={{
            marginBottom: 24,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={2} style={{ color: '#005901', marginBottom: 8 }}>
              退租清洁报价申请表
            </Title>
            <Text style={{ fontSize: 16, color: '#666' }}>
              请填写您的房产信息，我们将为您提供详细报价
            </Text>
          </div>

          <Spin spinning={loading}>
            <Form
              form={form}
              layout='vertical'
              onFinish={onFinish}
              initialValues={{
                propertyType: 'apartment',
                roomType: '2_bed_1b',
                hasCarpet: false,
                carpetRooms: 0,
                garage: false,
                glassDoorWindowCount: 0,
                oven: false,
                fridge: false,
                wallStainsCount: 0,
                acFilterCount: 0,
                blindsCount: 0,
                moldCount: 0,
                heavySoiling: false,
                rubbishRemoval: false,
                isSparkeryNewCustomer: false,
              }}
            >
              {/* Customer Information */}
              <Title
                level={4}
                style={{
                  color: '#005901',
                  borderBottom: '2px solid #005901',
                  paddingBottom: 8,
                }}
              >
                <HomeOutlined style={{ marginRight: 8 }} />
                联系信息
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='customerName'
                    label='姓名'
                    rules={[{ required: true, message: '请输入您的姓名' }]}
                  >
                    <Input size='large' placeholder='请输入您的姓名' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='phone'
                    label='电话'
                    rules={[{ required: true, message: '请输入您的电话号码' }]}
                  >
                    <Input size='large' placeholder='04XX XXX XXX' />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='email'
                    label='邮箱'
                    rules={[
                      { required: true, message: '请输入您的邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input size='large' placeholder='your@email.com' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='propertyAddress'
                    label='房产地址'
                    rules={[{ required: true, message: '请输入房产地址' }]}
                  >
                    <Input
                      size='large'
                      placeholder='123 Main St, Brisbane QLD 4000'
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    name='isSparkeryNewCustomer'
                    valuePropName='checked'
                  >
                    <Checkbox>
                      <strong>我是 Sparkery 新客户</strong>
                      <Text
                        type='success'
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        (新用户可享折扣！)
                      </Text>
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              {/* Property Details */}
              <Title
                level={4}
                style={{
                  color: '#005901',
                  borderBottom: '2px solid #005901',
                  paddingBottom: 8,
                  marginTop: 16,
                }}
              >
                <EnvironmentOutlined style={{ marginRight: 8 }} />
                房产详情
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='propertyType'
                    label='房产类型'
                    rules={[{ required: true, message: '请选择房产类型' }]}
                  >
                    <Select
                      size='large'
                      onChange={value => {
                        setPropertyType(value);
                      }}
                    >
                      <Option value='apartment'>公寓 / 单元房</Option>
                      <Option value='townhouse'>联排别墅</Option>
                      <Option value='house'>独立别墅</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='roomType'
                    label='房型'
                    rules={[{ required: true, message: '请选择房型' }]}
                  >
                    <Select
                      size='large'
                      onChange={value => {
                        setShowCustomRoomType(value === 'other');
                      }}
                    >
                      {roomTypes.map(room => (
                        <Option key={room.id} value={room.id}>
                          {room.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* House Level Selection - only show when House is selected */}
              {propertyType === 'house' && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name='houseLevel'
                      label='房屋层数'
                      rules={[
                        {
                          required: propertyType === 'house',
                          message: '请选择房屋层数',
                        },
                      ]}
                    >
                      <Select size='large'>
                        <Option value='single'>单层 (Single Story)</Option>
                        <Option value='double'>双层 (Double Story)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {/* Custom Room Type Input */}
              {showCustomRoomType && (
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name='customRoomType'
                      label='请说明您的房型'
                      rules={[
                        { required: showCustomRoomType, message: '请输入房型' },
                      ]}
                    >
                      <Input size='large' placeholder='例如：5房3卫' />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item name='hasCarpet' valuePropName='checked'>
                    <Checkbox onChange={e => setHasCarpet(e.target.checked)}>
                      <strong>房产有地毯</strong>
                      （我们提供专业地毯蒸汽清洁服务）
                    </Checkbox>
                  </Form.Item>
                </Col>
                {hasCarpet && (
                  <Col xs={24} md={8}>
                    <Form.Item name='carpetRooms' label='地毯房间数量'>
                      <Select size='large'>
                        <Option value={0}>0</Option>
                        <Option value={1}>1间</Option>
                        <Option value={2}>2间</Option>
                        <Option value={3}>3间</Option>
                        <Option value={4}>4间</Option>
                        <Option value={5}>5间以上</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Divider />

              {/* Additional Services */}
              <Title
                level={4}
                style={{
                  color: '#005901',
                  borderBottom: '2px solid #005901',
                  paddingBottom: 8,
                  marginTop: 16,
                }}
              >
                附加服务（可选）
              </Title>
              <Text
                type='secondary'
                style={{ display: 'block', marginBottom: 16 }}
              >
                请选择您需要的附加服务
              </Text>

              <Row gutter={[16, 8]}>
                {/* Garage/Balcony */}
                <Col xs={24} md={12}>
                  <Form.Item name='garage' valuePropName='checked'>
                    <Checkbox>
                      <strong>车库 / 阳台 / 院子清洁</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    车库、阳台或院子区域的清扫和拖地
                  </Text>
                </Col>

                {/* Glass Door/Window - with quantity */}
                <Col xs={24} md={12}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Form.Item
                      name='glassDoorWindow'
                      valuePropName='checked'
                      style={{ marginBottom: 4 }}
                    >
                      <Checkbox>
                        <strong>落地窗 / 玻璃门清洁</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      室内玻璃面板和推拉门清洁
                    </Text>
                    <Form.Item
                      name='glassDoorWindowCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <Option key={n} value={n}>
                            {n} 扇
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                </Col>

                {/* Oven */}
                <Col xs={24} md={12}>
                  <Form.Item name='oven' valuePropName='checked'>
                    <Checkbox>
                      <strong>烤箱清洁</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    烤箱内部、烤架和门的深度清洁
                  </Text>
                </Col>

                {/* Fridge */}
                <Col xs={24} md={12}>
                  <Form.Item name='fridge' valuePropName='checked'>
                    <Checkbox>
                      <strong>冰箱清洁</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    冰箱内外清洁
                  </Text>
                </Col>

                {/* Wall Stains - with quantity */}
                <Col xs={24} md={12}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Form.Item
                      name='wallStains'
                      valuePropName='checked'
                      style={{ marginBottom: 4 }}
                    >
                      <Checkbox>
                        <strong>墙面污渍清洁</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      墙面可见污渍和痕迹的局部清洁
                    </Text>
                    <Form.Item
                      name='wallStainsCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <Option key={n} value={n}>
                            {n} 处
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                </Col>

                {/* AC Filter - with quantity */}
                <Col xs={24} md={12}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Form.Item
                      name='acFilter'
                      valuePropName='checked'
                      style={{ marginBottom: 4 }}
                    >
                      <Checkbox>
                        <strong>空调滤网清洁</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      空调滤网和出风口的清洁
                    </Text>
                    <Form.Item
                      name='acFilterCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(n => (
                          <Option key={n} value={n}>
                            {n} 台
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                </Col>

                {/* Blinds - with quantity */}
                <Col xs={24} md={12}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Form.Item
                      name='blinds'
                      valuePropName='checked'
                      style={{ marginBottom: 4 }}
                    >
                      <Checkbox>
                        <strong>百叶窗清洁</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      百叶窗的除尘和擦拭
                    </Text>
                    <Form.Item
                      name='blindsCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <Option key={n} value={n}>
                            {n} 组
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                </Col>

                {/* Mold Removal - with quantity */}
                <Col xs={24} md={12}>
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Form.Item
                      name='mold'
                      valuePropName='checked'
                      style={{ marginBottom: 4 }}
                    >
                      <Checkbox>
                        <strong>除霉</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      浴室和潮湿区域的霉斑处理和清除
                    </Text>
                    <Form.Item
                      name='moldCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <Option key={n} value={n}>
                            {n} 处
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                </Col>

                {/* Heavy Soiling */}
                <Col xs={24} md={12}>
                  <Form.Item name='heavySoiling' valuePropName='checked'>
                    <Checkbox>
                      <strong>特脏加费</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    如房产因长期未清洁需要额外深度清洁，请选择此项
                  </Text>
                </Col>

                {/* Rubbish Removal */}
                <Col xs={24}>
                  <Form.Item name='rubbishRemoval' valuePropName='checked'>
                    <Checkbox
                      onChange={e => setShowRubbishNotes(e.target.checked)}
                    >
                      <strong>垃圾清理</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    清理房产内遗留的废弃物品
                  </Text>
                  {showRubbishNotes && (
                    <Form.Item
                      name='rubbishRemovalNotes'
                      label='请描述需要清理的物品'
                      style={{ marginLeft: 24, marginTop: 8 }}
                    >
                      <TextArea
                        rows={2}
                        placeholder='例如：旧家具、纸箱、电器、一般家居物品...'
                      />
                    </Form.Item>
                  )}
                </Col>
              </Row>

              <Divider />

              {/* Additional Information */}
              <Title
                level={4}
                style={{
                  color: '#005901',
                  borderBottom: '2px solid #005901',
                  paddingBottom: 8,
                  marginTop: 16,
                }}
              >
                其他信息
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='preferredDate'
                    label={
                      <span>
                        预约服务日期
                        <Tooltip title='如果您有多个可接受的日期，请在下方备注中列出'>
                          <InfoCircleOutlined
                            style={{ marginLeft: 8, color: '#888' }}
                          />
                        </Tooltip>
                      </span>
                    }
                  >
                    <Input type='date' size='large' />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name='additionalNotes'
                label='备注'
                extra='请详细描述任何特别脏或有问题的区域。这有助于我们提供准确报价，并避免现场检查后产生额外费用。您提供的信息越详细，报价就越精准。'
              >
                <TextArea
                  rows={4}
                  placeholder='例如：钥匙领取方式、有宠物、特别需要注意的区域、其他可接受的日期、特别脏的区域...'
                />
              </Form.Item>

              {/* Submit Button */}
              <Form.Item style={{ marginTop: 32 }}>
                <Button
                  type='primary'
                  htmlType='submit'
                  size='large'
                  block
                  style={{
                    backgroundColor: '#005901',
                    borderColor: '#005901',
                    height: 50,
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  提交报价请求
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#666' }}>
          <Paragraph style={{ marginBottom: 8 }}>
            <strong>Sparkery (Wendeal Pty Ltd)</strong> | ABN: 23632257535
          </Paragraph>
          <Paragraph style={{ marginBottom: 8 }}>
            52 Wecker Road, Mansfield QLD 4122
          </Paragraph>
          <Paragraph type='secondary' style={{ fontSize: 12 }}>
            © {new Date().getFullYear()} Sparkery. 保留所有权利。
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default BondCleanQuoteFormCN;
