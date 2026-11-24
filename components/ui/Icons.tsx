import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement> & {
  name?:
    | "arrow"
    | "leaf"
    | "recycle"
    | "water"
    | "sun"
    | "rotate"
    | "close"
    | "upload"
    | "pause"
    | "play"
    | "plus";
};
export function Icon({ name = "arrow", ...props }: IconProps) {
  const paths = {
    arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
    leaf: (
      <>
        <path d="M19 4C8 2 2 8 6 15s15 4 13-11Z" />
        <path d="m4 21 10-12M8 14l1-6m2 3 5 1" />
      </>
    ),
    recycle: (
      <path d="m9 5 3-3 5 8m-2-1 2 1 1-3M19 13l3 5-10 1m2-2-2 2 2 2M8 19H3l5-9m-3 1 3-1 1 3" />
    ),
    water: (
      <>
        <path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z" />
        <path d="M9 15a3 3 0 0 0 3 3" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    rotate: <path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
    pause: <path d="M9 5v14M15 5v14" />,
    play: <path d="m8 4 12 8-12 8Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
export function BrandMark() {
  return (
    <svg
      viewBox="0 0 35 38"
      width="33"
      height="36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17.5 35V14M17.5 24C5 25 2 17 3 7c11 0 15 7 14.5 17ZM17.5 18C17 7 24 2 32 2c1 10-4 17-14.5 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m8 13 9.5 11M26 8l-8.5 10"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
