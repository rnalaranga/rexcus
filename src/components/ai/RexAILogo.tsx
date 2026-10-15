import React from 'react';

interface RexAILogoProps {
  variant?: 'icon' | 'full' | 'badge';
  size?: number | string;
  className?: string;
}

export const RexAILogo: React.FC<RexAILogoProps> = ({
  variant = 'icon',
  size = 32,
  className = ''
}) => {
  // 14-tooth industrial gear cogwheel matching Rex logo
  const gearPath = 'M 115.89 56.48 L 115.89 63.52 L 104.41 67.24 L 103.16 72.75 L 111.88 81.08 L 108.83 87.42 L 96.87 85.79 L 93.35 90.21 L 97.60 101.50 L 92.10 105.89 L 82.03 99.24 L 76.94 101.69 L 75.86 113.71 L 69.01 115.27 L 62.83 104.91 L 57.17 104.91 L 50.99 115.27 L 44.14 113.71 L 43.06 101.69 L 37.97 99.24 L 27.90 105.89 L 22.40 101.50 L 26.65 90.21 L 23.13 85.79 L 11.17 87.42 L 8.12 81.08 L 16.84 72.75 L 15.59 67.24 L 4.11 63.52 L 4.11 56.48 L 15.59 52.76 L 16.84 47.25 L 8.12 38.92 L 11.17 32.58 L 23.13 34.21 L 26.65 29.79 L 22.40 18.50 L 27.90 14.11 L 37.97 20.76 L 43.06 18.31 L 44.14 6.29 L 50.99 4.73 L 57.17 15.09 L 62.83 15.09 L 69.01 4.73 L 75.86 6.29 L 76.94 18.31 L 82.03 20.76 L 92.10 14.11 L 97.60 18.50 L 93.35 29.79 L 96.87 34.21 L 108.83 32.58 L 111.88 38.92 L 103.16 47.25 L 104.41 52.76 Z';

  if (variant === 'icon') {
    return (
      <svg
        viewBox='0 0 120 120'
        width={size}
        height={size}
        className={className}
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <linearGradient id='rexAIGearGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='#E11D48' />
            <stop offset='100%' stopColor='#BE123C' />
          </linearGradient>
          <filter id='rexAIGlow' x='-20%' y='-20%' width='140%' height='140%'>
            <feGaussianBlur stdDeviation='2' result='blur' />
            <feMerge>
              <feMergeNode in='blur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Gear Body in Rex Red */}
        <path d={gearPath} fill='url(#rexAIGearGrad)' />

        {/* Outer White Circular Ring */}
        <circle cx='60' cy='60' r='34' fill='#FFFFFF' />

        {/* Inner Red Core */}
        <circle cx='60' cy='60' r='28' fill='url(#rexAIGearGrad)' />

        {/* High-tech AI Circuit Lines */}
        <path
          d='M 60 32 L 60 20 M 60 88 L 60 100 M 32 60 L 20 60 M 88 60 L 100 60'
          stroke='#FFFFFF'
          strokeWidth='2'
          strokeLinecap='round'
          opacity='0.65'
        />
        <circle cx='60' cy='20' r='2.5' fill='#38BDF8' filter='url(#rexAIGlow)' />
        <circle cx='60' cy='100' r='2.5' fill='#38BDF8' filter='url(#rexAIGlow)' />
        <circle cx='20' cy='60' r='2.5' fill='#38BDF8' filter='url(#rexAIGlow)' />
        <circle cx='100' cy='60' r='2.5' fill='#38BDF8' filter='url(#rexAIGlow)' />

        {/* Stylized Rex R */}
        <path
          d='M 47 43 H 63 Q 73 43 73 53 Q 73 62 64 63 L 73 77 H 64.5 L 56.5 64 H 53.5 V 77 H 47 Z M 53.5 49 V 58.5 H 62 Q 66.5 58.5 66.5 53.5 Q 66.5 49 62 49 Z'
          fill='#FFFFFF'
        />

        {/* AI Cyber Core / Neural Spark */}
        <circle cx='58' cy='53.8' r='2.8' fill='#38BDF8' filter='url(#rexAIGlow)' />
      </svg>
    );
  }

  // Full Wordmark + Emblem version
  return (
    <svg
      viewBox='0 0 420 120'
      width={typeof size === 'number' ? size * 3.5 : size}
      height={size}
      className={className}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <linearGradient id='rexAIFullRed' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#E11D48' />
          <stop offset='100%' stopColor='#BE123C' />
        </linearGradient>
        <linearGradient id='rexAIFullCyan' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#38BDF8' />
          <stop offset='100%' stopColor='#0284C7' />
        </linearGradient>
        <filter id='rexAIFullGlow' x='-20%' y='-20%' width='140%' height='140%'>
          <feGaussianBlur stdDeviation='2.5' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      {/* === EMBLEM === */}
      <g transform='translate(0, 0)'>
        <path d={gearPath} fill='url(#rexAIFullRed)' />
        <circle cx='60' cy='60' r='34' fill='#FFFFFF' />
        <circle cx='60' cy='60' r='28' fill='url(#rexAIFullRed)' />
        <path
          d='M 60 32 L 60 20 M 60 88 L 60 100 M 32 60 L 20 60 M 88 60 L 100 60'
          stroke='#FFFFFF'
          strokeWidth='2'
          strokeLinecap='round'
          opacity='0.65'
        />
        <circle cx='60' cy='20' r='2.5' fill='#38BDF8' filter='url(#rexAIFullGlow)' />
        <circle cx='60' cy='100' r='2.5' fill='#38BDF8' filter='url(#rexAIFullGlow)' />
        <circle cx='20' cy='60' r='2.5' fill='#38BDF8' filter='url(#rexAIFullGlow)' />
        <circle cx='100' cy='60' r='2.5' fill='#38BDF8' filter='url(#rexAIFullGlow)' />
        <path
          d='M 47 43 H 63 Q 73 43 73 53 Q 73 62 64 63 L 73 77 H 64.5 L 56.5 64 H 53.5 V 77 H 47 Z M 53.5 49 V 58.5 H 62 Q 66.5 58.5 66.5 53.5 Q 66.5 49 62 49 Z'
          fill='#FFFFFF'
        />
        <circle cx='58' cy='53.8' r='2.8' fill='#38BDF8' filter='url(#rexAIFullGlow)' />
      </g>

      {/* === BRAND TEXT REX === */}
      <g transform='translate(130, 22)'>
        <path
          d='M 0 5 H 32 Q 49 5 49 24 Q 49 41 34 43 L 49 71 H 34 L 21 46 H 13 V 71 H 0 Z M 13 17 V 34 H 31 Q 36 34 36 24.5 Q 36 17 31 17 Z'
          fill='url(#rexAIFullRed)'
        />
        <path
          d='M 58 5 H 98 V 17 H 71 V 31 H 93 V 43 H 71 V 59 H 98 V 71 H 58 Z'
          fill='url(#rexAIFullRed)'
        />
        <path
          d='M 107 5 H 122 L 138 34 L 154 5 H 169 L 146 38 L 170 71 H 155 L 138 43 L 121 71 H 106 L 130 38 Z'
          fill='url(#rexAIFullRed)'
        />
      </g>

      {/* === AI AGENT BADGE === */}
      <g transform='translate(315, 23)'>
        <rect x='0' y='4' width='92' height='64' rx='16' fill='#0F172A' stroke='url(#rexAIFullCyan)' strokeWidth='2.5' />
        <rect x='2' y='6' width='88' height='30' rx='14' fill='#FFFFFF' opacity='0.08' />
        <text
          x='46'
          y='42'
          fontFamily="'Inter', system-ui, -apple-system, sans-serif"
          fontSize='30'
          fontWeight='900'
          fill='#38BDF8'
          textAnchor='middle'
          letterSpacing='1.5'
          filter='url(#rexAIFullGlow)'
        >
          AI
        </text>
        <rect x='16' y='48' width='60' height='13' rx='4' fill='url(#rexAIFullRed)' />
        <text
          x='46'
          y='58'
          fontFamily="'Inter', system-ui, -apple-system, sans-serif"
          fontSize='8.5'
          fontWeight='900'
          fill='#FFFFFF'
          textAnchor='middle'
          letterSpacing='2'
        >
          AGENT
        </text>
      </g>
    </svg>
  );
};
