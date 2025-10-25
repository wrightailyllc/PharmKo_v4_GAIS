import React from 'react';

export const PharmKoLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Capsule Outline/Background */}
    <path
      d="M40,0 C66.568,0 80,26.863 80,60 C80,93.137 66.568,120 40,120 C13.432,120 0,93.137 0,60 C0,26.863 13.432,0 40,0 Z"
      fill="#003D66"
    />
    {/* Person Shape */}
    <g fill="#F26A69">
      {/* Head */}
      <circle cx="40" cy="38" r="13" />
      {/* Body */}
      <rect x="20" y="58" width="40" height="34" rx="20" />
    </g>
  </svg>
);