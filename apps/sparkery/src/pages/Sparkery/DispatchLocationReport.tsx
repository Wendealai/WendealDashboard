import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';
import {
  geocodeAddress,
  isGoogleMapsConfigured,
} from '@/services/googleMapsService';
import type {
  DispatchEmployee,
  DispatchEmployeeLocation,
} from './dispatch/types';
import { useTranslation } from 'react-i18next';
import './sparkery.css';

const { Title, Text } = Typography;

interface ManualLocationFormValues {
  placeType: 'home' | 'departure' | 'custom';
  customLabel?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

const DispatchLocationReport: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [employees, setEmployees] = useState<DispatchEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [manualReporting, setManualReporting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [lastReport, setLastReport] = useState<DispatchEmployeeLocation>();
  const [manualForm] = Form.useForm<ManualLocationFormValues>();
  const manualPlaceType = Form.useWatch('placeType', manualForm);

  const queryEmployeeId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('employeeId')?.trim() || '';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingEmployees(true);
    sparkeryDispatchService
      .getEmployees()
      .then(items => {
        if (cancelled) {
          return;
        }
        setEmployees(items);
        if (
          queryEmployeeId &&
          items.some(item => item.id === queryEmployeeId)
        ) {
          setSelectedEmployeeId(queryEmployeeId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          messageApi.error(
            t('sparkery.dispatch.locationReport.messages.loadEmployeesFailed')
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEmployees(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [messageApi, queryEmployeeId, t]);

  const reportCurrentLocation = () => {
    if (!selectedEmployeeId) {
      messageApi.warning(
        t('sparkery.dispatch.locationReport.messages.selectEmployeeFirst')
      );
      return;
    }
    if (!navigator.geolocation) {
      messageApi.error(
        t('sparkery.dispatch.locationReport.messages.geolocationUnsupported')
      );
      return;
    }

    setReporting(true);
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const location = await sparkeryDispatchService.reportEmployeeLocation(
            selectedEmployeeId,
            {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyM: position.coords.accuracy,
              source: 'mobile',
            }
          );
          setLastReport(location);
          messageApi.success(
            t('sparkery.dispatch.locationReport.messages.locationReported')
          );
        } catch {
          messageApi.error(
            t('sparkery.dispatch.locationReport.messages.locationReportFailed')
          );
        } finally {
          setReporting(false);
        }
      },
      error => {
        setReporting(false);
        messageApi.error(
          t('sparkery.dispatch.locationReport.messages.locationUnavailable', {
            reason: error.message,
          })
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  };

  const resolveManualLabel = (values: ManualLocationFormValues): string => {
    if (values.placeType === 'home') {
      return t('sparkery.dispatch.locationReport.manual.placeType.home');
    }
    if (values.placeType === 'departure') {
      return t('sparkery.dispatch.locationReport.manual.placeType.departure');
    }
    return (
      values.customLabel?.trim() ||
      t('sparkery.dispatch.locationReport.manual.placeType.manualFallback')
    );
  };

  const reportManualLocation = async (values: ManualLocationFormValues) => {
    if (!selectedEmployeeId) {
      messageApi.warning(
        t('sparkery.dispatch.locationReport.messages.selectEmployeeFirst')
      );
      return;
    }

    setManualReporting(true);
    try {
      let lat = values.lat;
      let lng = values.lng;

      if (
        typeof lat !== 'number' ||
        !Number.isFinite(lat) ||
        typeof lng !== 'number' ||
        !Number.isFinite(lng)
      ) {
        const address = values.address?.trim();
        if (!address) {
          messageApi.warning(
            t(
              'sparkery.dispatch.locationReport.messages.inputAddressOrCoordinates'
            )
          );
          return;
        }
        if (!isGoogleMapsConfigured()) {
          messageApi.error(
            t(
              'sparkery.dispatch.locationReport.messages.googleMapsNotConfigured'
            )
          );
          return;
        }
        const geocoded = await geocodeAddress(address);
        if (!geocoded) {
          messageApi.error(
            t('sparkery.dispatch.locationReport.messages.addressGeocodeFailed')
          );
          return;
        }
        lat = geocoded.lat;
        lng = geocoded.lng;
      }

      const baseLabel = resolveManualLabel(values);
      const address = values.address?.trim();
      const label = address ? `${baseLabel}: ${address}` : baseLabel;

      const location = await sparkeryDispatchService.reportEmployeeLocation(
        selectedEmployeeId,
        {
          lat,
          lng,
          source: 'manual',
          label,
        }
      );
      setLastReport(location);
      messageApi.success(
        t('sparkery.dispatch.locationReport.messages.manualLocationReported')
      );
    } catch {
      messageApi.error(
        t(
          'sparkery.dispatch.locationReport.messages.manualLocationReportFailed'
        )
      );
    } finally {
      setManualReporting(false);
    }
  };

  return (
    <div className='dispatch-location-report-page dispatch-location-report-shell'>
      {contextHolder}
      <Card className='dispatch-location-report-card'>
        <Space
          direction='vertical'
          size={12}
          className='dispatch-location-report-content'
        >
          <Title level={4} className='dispatch-location-report-title'>
            <EnvironmentOutlined className='dispatch-location-report-title-icon' />
            {t('sparkery.dispatch.locationReport.title')}
          </Title>
          <Text type='secondary'>
            {t('sparkery.dispatch.locationReport.subtitle')}
          </Text>
          <Space size={[6, 6]} wrap className='dispatch-location-report-tags'>
            <Tag className='dispatch-location-report-tag'>
              {t('sparkery.dispatch.locationReport.tags.employees', {
                count: employees.length,
              })}
            </Tag>
            <Tag className='dispatch-location-report-tag dispatch-location-report-tag-selected'>
              {t('sparkery.dispatch.locationReport.tags.selected', {
                value:
                  selectedEmployeeId ||
                  t('sparkery.dispatch.locationReport.tags.none'),
              })}
            </Tag>
          </Space>
          <Alert
            type='info'
            showIcon
            className='dispatch-location-report-alert dispatch-location-report-alert-info'
            message={t('sparkery.dispatch.locationReport.mobileHint')}
          />
          <Select
            className='dispatch-location-report-select'
            loading={loadingEmployees}
            placeholder={t('sparkery.dispatch.locationReport.selectEmployee')}
            value={selectedEmployeeId}
            onChange={setSelectedEmployeeId}
            options={employees.map(employee => ({
              value: employee.id,
              label: `${employee.name} (${employee.id})`,
            }))}
          />
          <Button
            type='primary'
            size='large'
            className='dispatch-location-report-btn dispatch-location-report-btn-primary'
            loading={reporting}
            onClick={reportCurrentLocation}
          >
            {t('sparkery.dispatch.locationReport.actions.reportCurrent')}
          </Button>
          <Divider className='dispatch-location-report-divider-compact' />
          <Text strong className='dispatch-location-report-manual-title'>
            {t('sparkery.dispatch.locationReport.manual.title')}
          </Text>
          <Form
            form={manualForm}
            layout='vertical'
            className='dispatch-location-report-form'
            initialValues={{ placeType: 'departure' }}
            onFinish={reportManualLocation}
          >
            <Form.Item
              label={t('sparkery.dispatch.locationReport.manual.locationType')}
              name='placeType'
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value='home'>
                  {t('sparkery.dispatch.locationReport.manual.homeAddress')}
                </Select.Option>
                <Select.Option value='departure'>
                  {t('sparkery.dispatch.locationReport.manual.todayDeparture')}
                </Select.Option>
                <Select.Option value='custom'>
                  {t(
                    'sparkery.dispatch.locationReport.manual.customLabelOption'
                  )}
                </Select.Option>
              </Select>
            </Form.Item>
            {manualPlaceType === 'custom' && (
              <Form.Item
                label={t('sparkery.dispatch.locationReport.manual.customLabel')}
                name='customLabel'
                rules={[
                  {
                    required: true,
                    message: t(
                      'sparkery.dispatch.locationReport.messages.enterCustomLabel'
                    ),
                  },
                ]}
              >
                <Input
                  placeholder={t(
                    'sparkery.dispatch.locationReport.manual.customLabelPlaceholder'
                  )}
                />
              </Form.Item>
            )}
            <Form.Item
              label={t('sparkery.dispatch.locationReport.manual.address')}
              name='address'
            >
              <Input
                placeholder={t(
                  'sparkery.dispatch.locationReport.manual.addressPlaceholder'
                )}
              />
            </Form.Item>
            <Text type='secondary' className='dispatch-location-report-tip'>
              {t('sparkery.dispatch.locationReport.manual.geocodeTip')}
            </Text>
            <div className='dispatch-location-grid'>
              <Form.Item
                label={t('sparkery.dispatch.locationReport.manual.latitude')}
                name='lat'
              >
                <InputNumber
                  className='dispatch-form-number-full-width'
                  placeholder='-27.4705'
                  step={0.000001}
                />
              </Form.Item>
              <Form.Item
                label={t('sparkery.dispatch.locationReport.manual.longitude')}
                name='lng'
              >
                <InputNumber
                  className='dispatch-form-number-full-width'
                  placeholder='153.0260'
                  step={0.000001}
                />
              </Form.Item>
            </div>
            <Button
              type='default'
              block
              htmlType='submit'
              className='dispatch-location-report-btn'
              loading={manualReporting}
            >
              {t('sparkery.dispatch.locationReport.actions.reportManual')}
            </Button>
          </Form>
          {lastReport && (
            <Alert
              type='success'
              showIcon
              className='dispatch-location-report-alert dispatch-location-report-alert-success'
              message={t('sparkery.dispatch.locationReport.lastReport', {
                lat: lastReport.lat.toFixed(6),
                lng: lastReport.lng.toFixed(6),
              })}
              description={t('sparkery.dispatch.locationReport.lastUpdatedAt', {
                datetime: new Date(lastReport.updatedAt).toLocaleString(),
              })}
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default DispatchLocationReport;
