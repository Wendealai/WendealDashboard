/**
 * Step 1: Check-in
 * "Start Work" button captures GPS + timestamp.
 */

import React, { useState, useCallback } from 'react';
import {
  Button,
  Card,
  Typography,
  Alert,
  Input,
  Tag,
  Result,
  Spin,
} from 'antd';
import {
  PlayCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { CheckInOut } from './types';
import { captureGPS, formatGPS } from './utils';

const { Title, Text, Paragraph } = Typography;

interface StepCheckInProps {
  checkIn: CheckInOut | null;
  propertyAddress: string;
  onCheckIn: (data: CheckInOut) => void;
}

/**
 * Check-in step - large button to start work, captures GPS + timestamp
 */
const StepCheckIn: React.FC<StepCheckInProps> = ({
  checkIn,
  propertyAddress,
  onCheckIn,
}) => {
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const handleCheckIn = useCallback(async () => {
    setLoading(true);
    try {
      const gps = await captureGPS();
      const data: CheckInOut = {
        timestamp: dayjs().toISOString(),
        gpsLat: gps?.lat ?? null,
        gpsLng: gps?.lng ?? null,
        gpsAddress: propertyAddress || manualAddress,
      };
      onCheckIn(data);
    } finally {
      setLoading(false);
    }
  }, [propertyAddress, manualAddress, onCheckIn]);

  // Already checked in - show confirmation
  if (checkIn) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <Result
          status='success'
          title='Checked In!'
          subTitle={`You started work at ${dayjs(checkIn.timestamp).format('HH:mm:ss')}`}
          style={{ padding: '24px 0' }}
        />
        <Card size='small' style={{ borderRadius: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <ClockCircleOutlined
                style={{ marginRight: '8px', color: '#52c41a' }}
              />
              <Text strong>Time:</Text>{' '}
              <Text>
                {dayjs(checkIn.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            </div>
            <div>
              <EnvironmentOutlined
                style={{ marginRight: '8px', color: '#1890ff' }}
              />
              <Text strong>GPS:</Text>{' '}
              <Text>{formatGPS(checkIn.gpsLat, checkIn.gpsLng)}</Text>
              {checkIn.gpsLat === null && (
                <Tag color='orange' style={{ marginLeft: '8px' }}>
                  <WarningOutlined /> GPS unavailable
                </Tag>
              )}
            </div>
            {checkIn.gpsAddress && (
              <div>
                <EnvironmentOutlined
                  style={{ marginRight: '8px', color: '#722ed1' }}
                />
                <Text strong>Address:</Text> <Text>{checkIn.gpsAddress}</Text>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Not yet checked in - show start button
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <div
        style={{
          padding: '40px 20px',
          background: '#f6ffed',
          borderRadius: '16px',
          border: '2px dashed #b7eb8f',
          marginBottom: '20px',
        }}
      >
        <PlayCircleOutlined
          style={{ fontSize: '64px', color: '#52c41a', marginBottom: '16px' }}
        />
        <Title level={3} style={{ margin: '0 0 8px' }}>
          Ready to Start?
        </Title>
        <Paragraph type='secondary'>
          Tap the button below to check in. Your GPS location and time will be
          recorded automatically.
        </Paragraph>

        <Button
          type='primary'
          size='large'
          icon={<PlayCircleOutlined />}
          onClick={handleCheckIn}
          loading={loading}
          style={{
            height: '56px',
            fontSize: '18px',
            padding: '0 40px',
            borderRadius: '28px',
            background: '#52c41a',
            borderColor: '#52c41a',
            marginTop: '8px',
          }}
        >
          Start Work / Check In
        </Button>
      </div>

      {!propertyAddress && (
        <Alert
          type='warning'
          showIcon
          message='No address set'
          description={
            <div style={{ marginTop: '8px' }}>
              <Input
                placeholder='Enter property address manually'
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                size='small'
              />
            </div>
          }
          style={{ borderRadius: '8px', textAlign: 'left' }}
        />
      )}
    </div>
  );
};

export default StepCheckIn;
