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
          messageApi.error('Failed to load employees');
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
  }, [messageApi, queryEmployeeId]);

  const reportCurrentLocation = () => {
    if (!selectedEmployeeId) {
      messageApi.warning('Please select employee first');
      return;
    }
    if (!navigator.geolocation) {
      messageApi.error('Current device does not support geolocation');
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
          messageApi.success('Location reported successfully');
        } catch {
          messageApi.error('Failed to report location');
        } finally {
          setReporting(false);
        }
      },
      error => {
        setReporting(false);
        messageApi.error(`Location unavailable: ${error.message}`);
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
      return 'Home';
    }
    if (values.placeType === 'departure') {
      return 'Today Departure';
    }
    return values.customLabel?.trim() || 'Manual Location';
  };

  const reportManualLocation = async (values: ManualLocationFormValues) => {
    if (!selectedEmployeeId) {
      messageApi.warning('Please select employee first');
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
          messageApi.warning('Please input address or latitude/longitude');
          return;
        }
        if (!isGoogleMapsConfigured()) {
          messageApi.error(
            'Google Maps not configured. Please enter latitude and longitude.'
          );
          return;
        }
        const geocoded = await geocodeAddress(address);
        if (!geocoded) {
          messageApi.error('Address geocoding failed. Please refine address.');
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
      messageApi.success('Manual location reported successfully');
    } catch {
      messageApi.error('Failed to report manual location');
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
            Dispatch Location Report
          </Title>
          <Text type='secondary'>
            Employee check-in / departure location reporting page
          </Text>
          <Space size={[6, 6]} wrap className='dispatch-location-report-tags'>
            <Tag className='dispatch-location-report-tag'>
              Employees: {employees.length}
            </Tag>
            <Tag className='dispatch-location-report-tag dispatch-location-report-tag-selected'>
              Selected: {selectedEmployeeId || 'None'}
            </Tag>
          </Space>
          <Alert
            type='info'
            showIcon
            className='dispatch-location-report-alert dispatch-location-report-alert-info'
            message='Open this page on mobile or WeChat, choose your name, then tap "Report Current Location".'
          />
          <Select
            className='dispatch-location-report-select'
            loading={loadingEmployees}
            placeholder='Select employee'
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
            Report Current Location
          </Button>
          <Divider className='dispatch-location-report-divider-compact' />
          <Text strong className='dispatch-location-report-manual-title'>
            Manual Location (Address / Departure Point)
          </Text>
          <Form
            form={manualForm}
            layout='vertical'
            className='dispatch-location-report-form'
            initialValues={{ placeType: 'departure' }}
            onFinish={reportManualLocation}
          >
            <Form.Item
              label='Location Type'
              name='placeType'
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value='home'>Home Address</Select.Option>
                <Select.Option value='departure'>Today Departure</Select.Option>
                <Select.Option value='custom'>Custom Label</Select.Option>
              </Select>
            </Form.Item>
            {manualPlaceType === 'custom' && (
              <Form.Item
                label='Custom Label'
                name='customLabel'
                rules={[
                  { required: true, message: 'Please enter custom label' },
                ]}
              >
                <Input placeholder='e.g. Temporary Start Point' />
              </Form.Item>
            )}
            <Form.Item label='Address' name='address'>
              <Input placeholder='Home address or today departure address' />
            </Form.Item>
            <Text type='secondary' className='dispatch-location-report-tip'>
              If address fails geocoding, fill coordinates directly.
            </Text>
            <div className='dispatch-location-grid'>
              <Form.Item label='Latitude' name='lat'>
                <InputNumber
                  className='dispatch-form-number-full-width'
                  placeholder='-27.4705'
                  step={0.000001}
                />
              </Form.Item>
              <Form.Item label='Longitude' name='lng'>
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
              Report Manual Location
            </Button>
          </Form>
          {lastReport && (
            <Alert
              type='success'
              showIcon
              className='dispatch-location-report-alert dispatch-location-report-alert-success'
              message={`Last report: ${lastReport.lat.toFixed(6)}, ${lastReport.lng.toFixed(6)}`}
              description={`Updated at ${new Date(lastReport.updatedAt).toLocaleString()}`}
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default DispatchLocationReport;
