import React, { SVGProps } from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  strokeWidth?: number;
  size?: string;
}

function IconEnvelopeOpenOutlineDuo18({
  strokeWidth = 1.5,
  size = '18px',
  ...props
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      {...props}
    >
      <g data-transform-wrapper="on" transform="translate(18 0) scale(-1 1)">
        <path
          d="M16.25 6.754V13.25C16.25 14.355 15.355 15.25 14.25 15.25H3.75C2.645 15.25 1.75 14.355 1.75 13.25V6.75L8.565 10.04C8.84 10.173 9.16 10.173 9.434 10.04L16.249 6.75L16.25 6.754Z"
          fill="currentColor"
          fillOpacity="0.3"
          data-color="color-2"
          data-stroke="none"
        ></path>{' '}
        <path
          d="M1.75 6.75001C1.75 6.02201 2.146 5.38901 2.784 5.03701L8.517 1.87401C8.818 1.70801 9.182 1.70801 9.483 1.87401L15.216 5.03701C15.854 5.38901 16.25 6.02101 16.25 6.75001"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        ></path>{' '}
        <path
          d="M16.25 6.754V13.25C16.25 14.355 15.355 15.25 14.25 15.25H3.75C2.645 15.25 1.75 14.355 1.75 13.25V6.75L8.565 10.04C8.84 10.173 9.16 10.173 9.434 10.04L16.249 6.75L16.25 6.754Z"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        ></path>
      </g>
    </svg>
  );
}

export default IconEnvelopeOpenOutlineDuo18;
