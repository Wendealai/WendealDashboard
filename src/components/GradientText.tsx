import React from 'react';
import { Typography } from 'antd';
import { createStyles } from 'antd-style';

const { Text } = Typography;

const useStyle = createStyles(({ prefixCls, css, token }) => ({
  gradientText: css`
    background: linear-gradient(135deg, #666666 0%, #333333 50%, #666666 100%);
    background-size: 200% 200%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradientShift 4s ease-in-out infinite;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    display: block;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    /* Dark theme styles */
    [data-theme='dark'] & {
      background: none;
      background-clip: unset;
      -webkit-background-clip: unset;
      -webkit-text-fill-color: #ffffff;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      animation: none;
      filter: none;
    }

    @keyframes gradientShift {
      0%,
      100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }

    @keyframes gradientShiftDark {
      0%,
      100% {
        background-position: 0% 50%;
      }
      25% {
        background-position: 50% 25%;
      }
      50% {
        background-position: 100% 50%;
      }
      75% {
        background-position: 50% 75%;
      }
    }

    @keyframes glowPulse {
      0% {
        filter: brightness(1.2) contrast(1.1);
        text-shadow:
          0 0 8px rgba(255, 255, 255, 0.9),
          0 0 15px rgba(255, 255, 255, 0.7),
          0 0 20px rgba(255, 255, 255, 0.5);
      }
      100% {
        filter: brightness(1.3) contrast(1.2);
        text-shadow:
          0 0 12px rgba(255, 255, 255, 1),
          0 0 20px rgba(255, 255, 255, 0.8),
          0 0 28px rgba(255, 255, 255, 0.6);
      }
    }

    &:hover {
      animation-duration: 2s;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      transform: scale(1.01);
    }

    [data-theme='dark'] &:hover {
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
      transform: scale(1.01);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      font-size: 16px;
      letter-spacing: 0.3px;
    }

    @media (max-width: 480px) {
      font-size: 14px;
      letter-spacing: 0.2px;
    }
  `,
}));

interface GradientTextProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5;
  strong?: boolean;
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  style = {},
  className = '',
  level,
  strong = false,
}) => {
  const { styles } = useStyle();

  const combinedStyle = {
    ...style,
  };

  if (level) {
    const TitleComponent = Typography.Title;
    return (
      <TitleComponent
        level={level}
        className={`${styles.gradientText} ${className}`}
        style={combinedStyle}
      >
        {children}
      </TitleComponent>
    );
  }

  return (
    <Text
      strong={strong}
      className={`${styles.gradientText} ${className}`}
      style={combinedStyle}
    >
      {children}
    </Text>
  );
};

export default GradientText;
