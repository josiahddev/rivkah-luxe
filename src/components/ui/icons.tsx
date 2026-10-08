// Lightweight inline icon set (stroke icons, 24px grid). No icon library needed.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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

export const SearchIcon = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>;
export const BagIcon = (p: P) => <Svg {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>;
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></Svg>
);
export const UserIcon = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></Svg>;
export const MenuIcon = (p: P) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h10" /></Svg>;
export const CloseIcon = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const PlusIcon = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"} strokeWidth={1.2}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
  </Svg>
);
export const ChevronDown = (p: P) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const ChevronRight = (p: P) => <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>;
export const ChevronLeft = (p: P) => <Svg {...p}><path d="m15 6-6 6 6 6" /></Svg>;
export const ArrowRight = (p: P) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const CheckIcon = (p: P) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const TruckIcon = (p: P) => <Svg {...p}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></Svg>;
export const ReturnIcon = (p: P) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></Svg>;
export const ShareIcon = (p: P) => <Svg {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" /></Svg>;
export const EyeIcon = (p: P) => <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Svg>;
export const TrashIcon = (p: P) => <Svg {...p}><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" /></Svg>;
export const EditIcon = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const CopyIcon = (p: P) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></Svg>;
export const UploadIcon = (p: P) => <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></Svg>;
export const ImageIcon = (p: P) => <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="10" r="1.8" /><path d="m20.5 16-5-5-9 8.5" /></Svg>;
export const BellIcon = (p: P) => <Svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Svg>;
export const HomeIcon = (p: P) => <Svg {...p}><path d="m3.5 11 8.5-7 8.5 7" /><path d="M6 9.5V20h12V9.5" /></Svg>;
export const BoxIcon = (p: P) => <Svg {...p}><path d="m3.5 7.5 8.5-4 8.5 4v9l-8.5 4-8.5-4v-9Z" /><path d="m3.5 7.5 8.5 4 8.5-4M12 11.5v9" /></Svg>;
export const TagIcon = (p: P) => <Svg {...p}><path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5-8.5-8.5Z" /><circle cx="8" cy="8.5" r="1.3" /></Svg>;
export const UsersIcon = (p: P) => <Svg {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3 19c.9-3 3.2-4.5 6-4.5s5.1 1.5 6 4.5" /><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.7.6 2.9 2 3.5 4.2" /></Svg>;
export const ChartIcon = (p: P) => <Svg {...p}><path d="M4 20V4M4 20h16" /><path d="m7.5 15 4-4.5 3 3L20 7" /></Svg>;
export const SettingsIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>;
export const MegaphoneIcon = (p: P) => <Svg {...p}><path d="M4 10v4h3l7 4V6L7 10H4Z" /><path d="M17.5 9a4 4 0 0 1 0 6" /></Svg>;
export const MessageIcon = (p: P) => <Svg {...p}><path d="M4 5.5h16v11H9l-5 3.5V5.5Z" /></Svg>;
export const LayersIcon = (p: P) => <Svg {...p}><path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" /></Svg>;
export const MapPinIcon = (p: P) => <Svg {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></Svg>;
export const MailIcon = (p: P) => <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></Svg>;
export const PhoneIcon = (p: P) => <Svg {...p}><path d="M6.5 3.5h3l1.5 4-2 1.2a11 11 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" /></Svg>;
export const LogOutIcon = (p: P) => <Svg {...p}><path d="M14 4.5H6v15h8" /><path d="m17 8.5 3.5 3.5-3.5 3.5M10 12h10.5" /></Svg>;
export const HelpIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.6" /><circle cx="12" cy="16.8" r=".6" fill="currentColor" /></Svg>;
export const InfoIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".6" fill="currentColor" /></Svg>;
export const AlertIcon = (p: P) => <Svg {...p}><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></Svg>;
export const ClockIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const GridIcon = ({ cols = 3, ...p }: P & { cols?: 2 | 3 | 4 }) => (
  <Svg {...p}>
    {cols === 2 && (<><rect x="4" y="4" width="7" height="16" /><rect x="13" y="4" width="7" height="16" /></>)}
    {cols === 3 && (<><rect x="3.5" y="4" width="4.5" height="16" /><rect x="9.75" y="4" width="4.5" height="16" /><rect x="16" y="4" width="4.5" height="16" /></>)}
    {cols === 4 && (<><rect x="3" y="4" width="3.4" height="16" /><rect x="7.9" y="4" width="3.4" height="16" /><rect x="12.8" y="4" width="3.4" height="16" /><rect x="17.6" y="4" width="3.4" height="16" /></>)}
  </Svg>
);
export const FilterIcon = (p: P) => <Svg {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>;
export const ExternalIcon = (p: P) => <Svg {...p}><path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v5.5H4.5V6H10" /></Svg>;
export const PrinterIcon = (p: P) => <Svg {...p}><path d="M7 8V4h10v4M7 17H4.5V9.5h15V17H17" /><rect x="7" y="14" width="10" height="6" /></Svg>;
export const DownloadIcon = (p: P) => <Svg {...p}><path d="M12 4v12M7 11l5 5 5-5M4.5 20h15" /></Svg>;
export const LockIcon = (p: P) => <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>;
export const SparkleIcon = (p: P) => <Svg {...p}><path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" /></Svg>;
export const GiftIcon = (p: P) => <Svg {...p}><rect x="3.5" y="9" width="17" height="4" /><path d="M5 13v7.5h14V13M12 9v11.5" /><path d="M12 9S10.5 4 8 4.5 7.5 9 12 9Zm0 0s1.5-5 4-4.5S16.5 9 12 9Z" /></Svg>;
export const LeafIcon = (p: P) => <Svg {...p}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Z" /><path d="M5 19 13 11" /></Svg>;
export const PlayIcon = (p: P) => <Svg {...p}><path d="M8 5.5v13l10-6.5-10-6.5Z" /></Svg>;

export const WhatsAppIcon = ({ size = 20, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3ZM12 21.5c-1.7 0-3.3-.4-4.7-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A9.5 9.5 0 1 1 12 21.5Zm0-21A11.5 11.5 0 0 0 2.1 17.7L.5 23.5l6-1.6A11.5 11.5 0 1 0 12 .5Z" />
  </svg>
);
export const InstagramIcon = (p: P) => <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".7" fill="currentColor" /></Svg>;
export const FacebookIcon = (p: P) => <Svg {...p}><path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.5L17 11h-3V9a.5.5 0 0 1 .5-.5Z" /></Svg>;
export const TikTokIcon = (p: P) => <Svg {...p}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.4 2.6 2.2 4.4 5 4.6" /></Svg>;
export const XSocialIcon = (p: P) => <Svg {...p}><path d="m4.5 4.5 15 15M19.5 4.5l-6.3 6.6M10.8 13l-6.3 6.5" /></Svg>;
export const YouTubeIcon = (p: P) => <Svg {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5v-5Z" fill="currentColor" /></Svg>;
