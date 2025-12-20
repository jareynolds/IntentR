import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  style,
  onClick
}) => {
  return (
    <div
      className={`card ${className}`.trim()}
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
