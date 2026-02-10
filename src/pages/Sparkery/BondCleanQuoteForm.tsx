import React, { useState } from 'react';
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

const BondCleanQuoteForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasCarpet, setHasCarpet] = useState(false);
  const [showCustomRoomType, setShowCustomRoomType] = useState(false);
  const [showRubbishNotes, setShowRubbishNotes] = useState(false);
  const [propertyType, setPropertyType] = useState<string>('apartment');

  const roomTypes = [
    { id: 'studio', name: 'Studio', maxCarpet: 1 },
    { id: '1_bed', name: '1 Bed 1 Bath', maxCarpet: 1 },
    { id: '2_bed_1b', name: '2 Bed 1 Bath', maxCarpet: 2 },
    { id: '2_bed_2b', name: '2 Bed 2 Bath', maxCarpet: 2 },
    { id: '3_bed_1b', name: '3 Bed 1 Bath', maxCarpet: 3 },
    { id: '3_bed_2b', name: '3 Bed 2 Bath', maxCarpet: 3 },
    { id: '4_bed_2b', name: '4 Bed 2 Bath', maxCarpet: 4 },
    { id: 'other', name: 'Other (please specify below)', maxCarpet: 5 },
  ];

  const copyPageUrl = () => {
    // Always use the standalone route URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/bond-clean-quote`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        message.success('Page URL copied to clipboard!');
      })
      .catch(() => {
        message.error('Failed to copy URL');
      });
  };

  const onFinish = async (values: BondCleanFormData) => {
    setLoading(true);

    try {
      // Prepare form data for submission
      const formData = {
        ...values,
        submittedAt: new Date().toISOString(),
        formType: 'bond_clean_quote_request',
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
        id: `BCQ-${Date.now()}`,
      });
      localStorage.setItem(
        'bondCleanQuoteRequests',
        JSON.stringify(existingSubmissions)
      );

      message.success('Your quote request has been submitted successfully!');
      setSubmitted(true);
    } catch (error) {
      message.error('Failed to submit form. Please try again.');
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
            Thank You!
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            Your bond cleaning quote request has been submitted successfully.
          </Paragraph>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            We will review your property details and get back to you with a
            detailed quote within 24 hours.
          </Paragraph>
          <Divider />
          <Paragraph style={{ fontSize: 14, color: '#888' }}>
            If you have any urgent questions, please contact us at:
            <br />
            <strong>Phone:</strong> 0478 540 915
            <br />
            <strong>Email:</strong> info@sparkery.com.au
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
            Submit Another Request
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
      {/* Header */}
      <div
        style={{
          background: '#005901',
          padding: '20px 0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src='https://sparkery.com.au/wp-content/uploads/2025/11/logo.png'
              alt='Sparkery Logo'
              style={{ height: 50 }}
            />
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                Sparkery
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                Making Brisbane Sparkle!
              </Text>
            </div>
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Copy URL Button */}
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            icon={<CopyOutlined />}
            onClick={copyPageUrl}
            style={{ borderColor: '#005901', color: '#005901' }}
          >
            Copy Page URL
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
              Bond Cleaning Quote Request
            </Title>
            <Text style={{ fontSize: 16, color: '#666' }}>
              Tell us about your property and we'll provide you with a detailed
              quote
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
                Your Contact Information
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='customerName'
                    label='Full Name'
                    rules={[
                      { required: true, message: 'Please enter your name' },
                    ]}
                  >
                    <Input size='large' placeholder='John Smith' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='phone'
                    label='Phone Number'
                    rules={[
                      {
                        required: true,
                        message: 'Please enter your phone number',
                      },
                    ]}
                  >
                    <Input size='large' placeholder='04XX XXX XXX' />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='email'
                    label='Email Address'
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' },
                    ]}
                  >
                    <Input size='large' placeholder='your@email.com' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='propertyAddress'
                    label='Property Address'
                    rules={[
                      {
                        required: true,
                        message: 'Please enter the property address',
                      },
                    ]}
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
                      <strong>I am a new Sparkery customer</strong>
                      <Text
                        type='success'
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        (New customers can enjoy a discount!)
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
                Property Details
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='propertyType'
                    label='Property Type'
                    rules={[
                      {
                        required: true,
                        message: 'Please select property type',
                      },
                    ]}
                  >
                    <Select
                      size='large'
                      onChange={value => {
                        setPropertyType(value);
                      }}
                    >
                      <Option value='apartment'>Apartment / Unit</Option>
                      <Option value='townhouse'>Townhouse</Option>
                      <Option value='house'>House</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='roomType'
                    label='Room Configuration'
                    rules={[
                      { required: true, message: 'Please select room type' },
                    ]}
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
                      label='House Level'
                      rules={[
                        {
                          required: propertyType === 'house',
                          message: 'Please select house level',
                        },
                      ]}
                    >
                      <Select size='large'>
                        <Option value='single'>Single Story (一层)</Option>
                        <Option value='double'>Double Story (两层)</Option>
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
                      label='Please specify your room configuration'
                      rules={[
                        {
                          required: showCustomRoomType,
                          message: 'Please enter room configuration',
                        },
                      ]}
                    >
                      <Input size='large' placeholder='e.g., 5 Bed 3 Bath' />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item name='hasCarpet' valuePropName='checked'>
                    <Checkbox onChange={e => setHasCarpet(e.target.checked)}>
                      <strong>Property has carpet</strong> (We offer
                      professional carpet steam cleaning)
                    </Checkbox>
                  </Form.Item>
                </Col>
                {hasCarpet && (
                  <Col xs={24} md={8}>
                    <Form.Item
                      name='carpetRooms'
                      label='Number of Carpeted Rooms'
                    >
                      <Select size='large'>
                        <Option value={0}>0</Option>
                        <Option value={1}>1 Room</Option>
                        <Option value={2}>2 Rooms</Option>
                        <Option value={3}>3 Rooms</Option>
                        <Option value={4}>4 Rooms</Option>
                        <Option value={5}>5+ Rooms</Option>
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
                Additional Services (Optional)
              </Title>
              <Text
                type='secondary'
                style={{ display: 'block', marginBottom: 16 }}
              >
                Select any additional services you may need
              </Text>

              <Row gutter={[16, 8]}>
                {/* Garage/Balcony */}
                <Col xs={24} md={12}>
                  <Form.Item name='garage' valuePropName='checked'>
                    <Checkbox>
                      <strong>Garage / Balcony / Yard Cleaning</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    Sweep and mop of garage, balcony, or yard areas
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
                        <strong>Glass Door / Window Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Internal glass panels and sliding doors cleaning
                    </Text>
                    <Form.Item
                      name='glassDoorWindowCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <Option key={n} value={n}>
                            {n} panel{n !== 1 ? 's' : ''}
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
                      <strong>Oven Cleaning</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    Deep clean of oven interior, racks, and door
                  </Text>
                </Col>

                {/* Fridge */}
                <Col xs={24} md={12}>
                  <Form.Item name='fridge' valuePropName='checked'>
                    <Checkbox>
                      <strong>Fridge Cleaning</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    Clean interior and exterior of refrigerator
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
                        <strong>Wall Stain Removal</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Spot cleaning of visible marks and stains on walls
                    </Text>
                    <Form.Item
                      name='wallStainsCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <Option key={n} value={n}>
                            {n} spot{n !== 1 ? 's' : ''}
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
                        <strong>AC Filter Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Cleaning of air conditioner filters and vents
                    </Text>
                    <Form.Item
                      name='acFilterCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(n => (
                          <Option key={n} value={n}>
                            {n} unit{n !== 1 ? 's' : ''}
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
                        <strong>Blinds Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Dusting and wiping of window blinds
                    </Text>
                    <Form.Item
                      name='blindsCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <Option key={n} value={n}>
                            {n} set{n !== 1 ? 's' : ''}
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
                        <strong>Mold Removal</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, marginLeft: 24 }}
                    >
                      <InfoCircleOutlined style={{ marginRight: 4 }} />
                      Treatment and removal of mold in bathrooms and wet areas
                    </Text>
                    <Form.Item
                      name='moldCount'
                      style={{ marginLeft: 24, marginBottom: 8 }}
                    >
                      <Select size='small' style={{ width: 120 }}>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <Option key={n} value={n}>
                            {n} area{n !== 1 ? 's' : ''}
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
                      <strong>Heavy Soiling Surcharge</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    Select if property requires extra deep cleaning due to heavy
                    dirt or neglect
                  </Text>
                </Col>

                {/* Rubbish Removal */}
                <Col xs={24}>
                  <Form.Item name='rubbishRemoval' valuePropName='checked'>
                    <Checkbox
                      onChange={e => setShowRubbishNotes(e.target.checked)}
                    >
                      <strong>Rubbish Removal</strong>
                    </Checkbox>
                  </Form.Item>
                  <Text
                    type='secondary'
                    style={{ fontSize: 12, marginLeft: 24, display: 'block' }}
                  >
                    <InfoCircleOutlined style={{ marginRight: 4 }} />
                    Removal of unwanted items left at the property
                  </Text>
                  {showRubbishNotes && (
                    <Form.Item
                      name='rubbishRemovalNotes'
                      label='Please describe items to be removed'
                      style={{ marginLeft: 24, marginTop: 8 }}
                    >
                      <TextArea
                        rows={2}
                        placeholder='e.g., Old furniture, boxes, appliances, general household items...'
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
                Additional Information
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='preferredDate'
                    label={
                      <span>
                        Preferred Service Date
                        <Tooltip title='If you have multiple available dates, please list them in the notes below'>
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
                label='Additional Notes'
                extra='Please describe any particularly dirty or problematic areas in detail. This helps us provide an accurate quote and avoids additional charges after on-site inspection. The more detailed your description, the more precise our quote will be.'
              >
                <TextArea
                  rows={4}
                  placeholder='E.g., Key pickup instructions, pets on premises, specific areas of concern, other acceptable dates, particularly dirty areas...'
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
                  Submit Quote Request
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
            © {new Date().getFullYear()} Sparkery. All rights reserved.
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default BondCleanQuoteForm;
