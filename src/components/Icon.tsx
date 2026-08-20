interface IconProps {
  name: 'bulb' | 'help' | 'refresh' | 'arrow' | 'close'
  size?: number
}

export function Icon({ name, size = 20 }: IconProps) {
  const paths = {
    bulb: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M8.5 14.5A7 7 0 1 1 15.5 14.5C14.4 15.3 14 16.1 14 18h-4c0-1.9-.4-2.7-1.5-3.5Z" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.1 2.3c-.9.4-.9 1-.9 1.7M12 17h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M18.2 16a8 8 0 1 1 .8-8.5L20 12" />
      </>
    ),
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}
