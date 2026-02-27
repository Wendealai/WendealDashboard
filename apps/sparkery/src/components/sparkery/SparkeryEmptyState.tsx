import React from 'react';
import { Button, Typography } from 'antd';

const { Paragraph, Title } = Typography;

interface SparkeryEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SparkeryEmptyState: React.FC<SparkeryEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className='sparkery-saas-empty-state'>
    <Title level={5} className='sparkery-saas-empty-state-title'>
      {title}
    </Title>
    <Paragraph className='sparkery-saas-empty-state-description'>
      {description}
    </Paragraph>
    {actionLabel && onAction ? (
      <Button size='small' onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export default SparkeryEmptyState;
