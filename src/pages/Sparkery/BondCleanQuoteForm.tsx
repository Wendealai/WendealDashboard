import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  LinkOutlined,
} from '@ant-design/icons';
import {
  createFormShareLink,
  createSubmission,
  getActiveFormShareLink,
  markFormShareLinkUsed,
  type BondQuoteFormType,
} from '@/services/bondQuoteSubmissionService';
import './sparkery.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const FORM_TYPE: BondQuoteFormType = 'bond_clean_quote_request';
const PUBLIC_FORM_PATH = '/bond-clean-quote';

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
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [linkValidationLoading, setLinkValidationLoading] = useState(false);
  const [linkValidationError, setLinkValidationError] = useState('');
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const sourceLinkId = searchParams.get('linkId')?.trim() || '';
  const sourceLinkToken = searchParams.get('token')?.trim() || '';
  const isStandaloneRoute =
    window.location.pathname.toLowerCase() === PUBLIC_FORM_PATH;
  const isLinkVisit = Boolean(sourceLinkId && sourceLinkToken);
  const requiresGeneratedLink = isStandaloneRoute;
  const canSubmitFromLink =
    isLinkVisit && !linkValidationLoading && !linkValidationError;

  // Set page title
  useEffect(() => {
    document.title = 'Bond Clean Quote Request - Sparkery';
    return () => {
      document.title = 'Wendeal Dashboard';
    };
  }, []);

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

  useEffect(() => {
    if (!requiresGeneratedLink) {
      setLinkValidationError('');
      setLinkValidationLoading(false);
      return;
    }

    if (!sourceLinkId || !sourceLinkToken) {
      setLinkValidationError(
        'This form requires a generated share link. Please contact Sparkery for your link.'
      );
      setLinkValidationLoading(false);
      return;
    }

    let cancelled = false;
    setLinkValidationLoading(true);
    setLinkValidationError('');

    getActiveFormShareLink(FORM_TYPE, sourceLinkId, sourceLinkToken)
      .then(link => {
        if (cancelled) return;
        if (!link) {
          setLinkValidationError(
            'This link is invalid or already used. Please request a new link.'
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLinkValidationError(
          'Unable to validate this link right now. Please try again later.'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLinkValidationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requiresGeneratedLink, sourceLinkId, sourceLinkToken]);

  const copyToClipboard = async (
    content: string,
    successMessage: string,
    failureMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(content);
      message.success(successMessage);
    } catch {
      message.error(failureMessage);
    }
  };

  const generateShareLink = async () => {
    setShareLinkLoading(true);
    try {
      const createdLink = await createFormShareLink(FORM_TYPE, {
        createdFrom: 'sparkery-dashboard',
      });
      const shareUrl = `${window.location.origin}${PUBLIC_FORM_PATH}?linkId=${encodeURIComponent(createdLink.id)}&token=${encodeURIComponent(createdLink.token)}`;
      setGeneratedShareLink(shareUrl);
      await copyToClipboard(
        shareUrl,
        'Private share link generated and copied!',
        'Share link generated, but failed to copy automatically.'
      );
    } catch {
      message.error('Failed to generate share link. Please check Supabase.');
    } finally {
      setShareLinkLoading(false);
    }
  };

  const copyGeneratedShareLink = async () => {
    if (!generatedShareLink) return;
    await copyToClipboard(
      generatedShareLink,
      'Share link copied!',
      'Failed to copy share link'
    );
  };

  const onFinish = async (values: BondCleanFormData) => {
    if (requiresGeneratedLink && !canSubmitFromLink) {
      message.error(
        'Please open this form using a valid generated link before submitting.'
      );
      return;
    }

    setLoading(true);

    try {
      // Prepare form data for submission
      const formData = {
        ...values,
        submittedAt: new Date().toISOString(),
        formType: FORM_TYPE,
        status: 'new' as const,
        ...(sourceLinkId ? { formLinkId: sourceLinkId } : {}),
      };

      const created = await createSubmission(formData);

      if (sourceLinkId && sourceLinkToken) {
        try {
          await markFormShareLinkUsed(
            sourceLinkId,
            sourceLinkToken,
            created.id
          );
        } catch {
          message.warning(
            'Submission saved, but failed to update share-link usage state.'
          );
        }
      }

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
      <div className='sparkery-quote-form-page sparkery-quote-form-success-layout'>
        <Card className='sparkery-quote-form-success-card'>
          <CheckCircleOutlined className='sparkery-quote-form-success-icon' />
          <Title level={2} className='sparkery-quote-form-success-title'>
            Thank You!
          </Title>
          <Paragraph className='sparkery-quote-form-success-text'>
            Your bond cleaning quote request has been submitted successfully.
          </Paragraph>
          <Paragraph className='sparkery-quote-form-success-text'>
            We will review your property details and get back to you with a
            detailed quote within 24 hours.
          </Paragraph>
          <Divider />
          <Paragraph className='sparkery-quote-form-success-help'>
            If you have any urgent questions, please contact us at:
            <br />
            <strong>Phone:</strong> 0478 540 915
            <br />
            <strong>Email:</strong> info@sparkery.com.au
          </Paragraph>
          <Button
            className='sparkery-quote-form-primary-btn'
            type='primary'
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
    <div className='sparkery-quote-form-page'>
      {/* Header - Simplified for mobile */}
      <div className='sparkery-quote-form-header'>
        <div className='sparkery-quote-form-header-inner'>
          <img
            className='sparkery-quote-form-header-logo'
            src='https://sparkery.com.au/wp-content/uploads/2025/11/logo.png'
            alt='Sparkery Logo'
          />
          <div className='sparkery-quote-form-header-contact'>
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
      <div className='sparkery-quote-form-content'>
        {!isStandaloneRoute && (
          <div className='sparkery-quote-form-share-tools'>
            <Space wrap className='sparkery-quote-form-share-actions'>
              <Button
                className='sparkery-quote-form-outline-btn'
                icon={<LinkOutlined />}
                onClick={generateShareLink}
                loading={shareLinkLoading}
              >
                Generate Share Link
              </Button>
              {generatedShareLink && (
                <Button
                  icon={<CopyOutlined />}
                  onClick={copyGeneratedShareLink}
                >
                  Copy Link
                </Button>
              )}
            </Space>
            {generatedShareLink && (
              <Input
                className='sparkery-quote-form-share-link'
                value={generatedShareLink}
                readOnly
              />
            )}
          </div>
        )}
        {isStandaloneRoute && (
          <div className='sparkery-quote-form-link-status'>
            {linkValidationLoading && (
              <Alert type='info' showIcon message='Validating secure link...' />
            )}
            {!linkValidationLoading && linkValidationError && (
              <Alert type='error' showIcon message={linkValidationError} />
            )}
            {!linkValidationLoading && !linkValidationError && isLinkVisit && (
              <Alert
                type='success'
                showIcon
                message='Secure link is active. You can submit this quote request.'
              />
            )}
          </div>
        )}

        <Card className='sparkery-quote-form-card'>
          <div className='sparkery-quote-form-center-header'>
            <Title level={2} className='sparkery-quote-form-title'>
              Bond Cleaning Quote Request
            </Title>
            <Text className='sparkery-quote-form-subtitle'>
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
              <Title level={4} className='sparkery-quote-form-section-title'>
                <HomeOutlined className='sparkery-quote-form-icon-gap-8' />
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
                        className='sparkery-quote-form-inline-success'
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
                className='sparkery-quote-form-section-title sparkery-quote-form-section-title-spaced'
              >
                <EnvironmentOutlined className='sparkery-quote-form-icon-gap-8' />
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
                        <Option value='double'>Double Story (涓ゅ眰)</Option>
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
                className='sparkery-quote-form-section-title sparkery-quote-form-section-title-spaced'
              >
                Additional Services (Optional)
              </Title>
              <Text
                type='secondary'
                className='sparkery-quote-form-section-hint'
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
                    className='sparkery-quote-form-addon-help'
                  >
                    <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                    Sweep and mop of garage, balcony, or yard areas
                  </Text>
                </Col>

                {/* Glass Door/Window - with quantity */}
                <Col xs={24} md={12}>
                  <Space
                    direction='vertical'
                    className='sparkery-quote-form-full-width'
                  >
                    <Form.Item
                      name='glassDoorWindow'
                      valuePropName='checked'
                      className='sparkery-quote-form-item-tight'
                    >
                      <Checkbox>
                        <strong>Glass Door / Window Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      className='sparkery-quote-form-addon-help-inline'
                    >
                      <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                      Internal glass panels and sliding doors cleaning
                    </Text>
                    <Form.Item
                      name='glassDoorWindowCount'
                      className='sparkery-quote-form-addon-qty'
                    >
                      <Select
                        size='small'
                        className='sparkery-quote-form-select-120'
                      >
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
                    className='sparkery-quote-form-addon-help'
                  >
                    <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
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
                    className='sparkery-quote-form-addon-help'
                  >
                    <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                    Clean interior and exterior of refrigerator
                  </Text>
                </Col>

                {/* Wall Stains - with quantity */}
                <Col xs={24} md={12}>
                  <Space
                    direction='vertical'
                    className='sparkery-quote-form-full-width'
                  >
                    <Form.Item
                      name='wallStains'
                      valuePropName='checked'
                      className='sparkery-quote-form-item-tight'
                    >
                      <Checkbox>
                        <strong>Wall Stain Removal</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      className='sparkery-quote-form-addon-help-inline'
                    >
                      <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                      Spot cleaning of visible marks and stains on walls
                    </Text>
                    <Form.Item
                      name='wallStainsCount'
                      className='sparkery-quote-form-addon-qty'
                    >
                      <Select
                        size='small'
                        className='sparkery-quote-form-select-120'
                      >
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
                  <Space
                    direction='vertical'
                    className='sparkery-quote-form-full-width'
                  >
                    <Form.Item
                      name='acFilter'
                      valuePropName='checked'
                      className='sparkery-quote-form-item-tight'
                    >
                      <Checkbox>
                        <strong>AC Filter Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      className='sparkery-quote-form-addon-help-inline'
                    >
                      <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                      Cleaning of air conditioner filters and vents
                    </Text>
                    <Form.Item
                      name='acFilterCount'
                      className='sparkery-quote-form-addon-qty'
                    >
                      <Select
                        size='small'
                        className='sparkery-quote-form-select-120'
                      >
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
                  <Space
                    direction='vertical'
                    className='sparkery-quote-form-full-width'
                  >
                    <Form.Item
                      name='blinds'
                      valuePropName='checked'
                      className='sparkery-quote-form-item-tight'
                    >
                      <Checkbox>
                        <strong>Blinds Cleaning</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      className='sparkery-quote-form-addon-help-inline'
                    >
                      <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                      Dusting and wiping of window blinds
                    </Text>
                    <Form.Item
                      name='blindsCount'
                      className='sparkery-quote-form-addon-qty'
                    >
                      <Select
                        size='small'
                        className='sparkery-quote-form-select-120'
                      >
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
                  <Space
                    direction='vertical'
                    className='sparkery-quote-form-full-width'
                  >
                    <Form.Item
                      name='mold'
                      valuePropName='checked'
                      className='sparkery-quote-form-item-tight'
                    >
                      <Checkbox>
                        <strong>Mold Removal</strong>
                      </Checkbox>
                    </Form.Item>
                    <Text
                      type='secondary'
                      className='sparkery-quote-form-addon-help-inline'
                    >
                      <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                      Treatment and removal of mold in bathrooms and wet areas
                    </Text>
                    <Form.Item
                      name='moldCount'
                      className='sparkery-quote-form-addon-qty'
                    >
                      <Select
                        size='small'
                        className='sparkery-quote-form-select-120'
                      >
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
                    className='sparkery-quote-form-addon-help'
                  >
                    <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
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
                    className='sparkery-quote-form-addon-help'
                  >
                    <InfoCircleOutlined className='sparkery-quote-form-icon-gap-4' />
                    Removal of unwanted items left at the property
                  </Text>
                  {showRubbishNotes && (
                    <Form.Item
                      name='rubbishRemovalNotes'
                      label='Please describe items to be removed'
                      className='sparkery-quote-form-addon-notes'
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
                className='sparkery-quote-form-section-title sparkery-quote-form-section-title-spaced'
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
                          <InfoCircleOutlined className='sparkery-quote-form-tooltip-icon' />
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
              <Form.Item className='sparkery-quote-form-submit-wrap'>
                <Button
                  className='sparkery-quote-form-submit'
                  type='primary'
                  htmlType='submit'
                  size='large'
                  block
                  disabled={requiresGeneratedLink && !canSubmitFromLink}
                >
                  Submit Quote Request
                </Button>
              </Form.Item>
            </Form>
          </Spin>
        </Card>

        {/* Footer */}
        <div className='sparkery-quote-form-footer'>
          <Paragraph className='sparkery-quote-form-footer-line'>
            <strong>Sparkery (Wendeal Pty Ltd)</strong> | ABN: 23632257535
          </Paragraph>
          <Paragraph className='sparkery-quote-form-footer-line'>
            52 Wecker Road, Mansfield QLD 4122
          </Paragraph>
          <Paragraph
            type='secondary'
            className='sparkery-quote-form-footer-muted'
          >
            漏 {new Date().getFullYear()} Sparkery. All rights reserved.
          </Paragraph>
        </div>
      </div>
    </div>
  );
};

export default BondCleanQuoteForm;
