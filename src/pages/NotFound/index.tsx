import React from 'react';
import { Result, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Paragraph } = Typography;

interface NotFoundPageProps {}

const NotFoundPage: React.FC<NotFoundPageProps> = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div
      className='not-found-page'
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '48px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          maxWidth: '600px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        <Result
          status='404'
          title={
            <span
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              404
            </span>
          }
          subTitle={
            <div style={{ marginTop: '24px' }}>
              <Typography.Title
                level={3}
                style={{ color: '#434343', marginBottom: '16px' }}
              >
                {t('notFound.title')}
              </Typography.Title>
              <Paragraph
                style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}
              >
                {t('notFound.description')}
              </Paragraph>
              <Paragraph style={{ fontSize: '14px', color: '#999' }}>
                {t('notFound.suggestion')}
              </Paragraph>
            </div>
          }
          extra={
            <div style={{ marginTop: '32px' }}>
              <Button
                type='primary'
                size='large'
                icon={<HomeOutlined />}
                onClick={handleGoHome}
                style={{
                  marginRight: '16px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                }}
              >
                {t('notFound.buttons.goHome')}
              </Button>
              <Button
                size='large'
                icon={<ArrowLeftOutlined />}
                onClick={handleGoBack}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  borderColor: '#667eea',
                  color: '#667eea',
                }}
              >
                {t('notFound.buttons.goBack')}
              </Button>
            </div>
          }
        />

        {/* 装饰性元素 */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            borderRadius: '50%',
            opacity: '0.1',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #764ba2, #667eea)',
            borderRadius: '50%',
            opacity: '0.1',
          }}
        />
      </div>

      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '20%',
          width: '60px',
          height: '60px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 7s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .not-found-page .ant-result-icon {
          margin-bottom: 0;
        }
        
        .not-found-page .ant-result-title {
          margin-bottom: 0;
        }
        
        .not-found-page .ant-result-subtitle {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;
