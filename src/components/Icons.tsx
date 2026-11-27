import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHeartPulse = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </Base>
);
export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
  </Base>
);
export const IconStop = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
  </Base>
);
export const IconRecord = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />
  </Base>
);
export const IconFilm = (p: IconProps) => (
  <Base {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" />
  </Base>
);
export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);
export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Base>
);
export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Base>
);
export const IconVolume = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
    <path d="M16 9a5 5 0 0 1 0 6M19.4 18.4a9 9 0 0 0 0-12.8" />
  </Base>
);
export const IconVolumeOff = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5Z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </Base>
);
export const IconMinimize = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);
export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4M12 17h.01" />
  </Base>
);
export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Base>
);
export const IconPhone = (p: IconProps) => (
  <Base {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
  </Base>
);
export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);
export const IconHistory = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5M12 7v5l4 2" />
  </Base>
);
export const IconFlask = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 2v7.53a2 2 0 0 1-.21.9L4.72 20.55A1 1 0 0 0 5.62 22h12.76a1 1 0 0 0 .9-1.45l-5.07-10.12a2 2 0 0 1-.21-.9V2M8.5 2h7M7 16h10" />
  </Base>
);
export const IconActivity = (p: IconProps) => (
  <Base {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Base>
);
export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);
export const IconAward = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" />
  </Base>
);
export const IconRotate = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Base>
);
export const IconCamera = (p: IconProps) => (
  <Base {...p}>
    <path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.76-.42L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Base>
);
