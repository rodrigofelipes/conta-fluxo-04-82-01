import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src="/lovable-uploads/a6b9dbaa-88ec-4b37-8728-9012244fc571.png"
        alt="CONCEPÇÃO CONTABILIDADE"
        className="w-full h-full object-contain"
      />
    </div>
  );
}