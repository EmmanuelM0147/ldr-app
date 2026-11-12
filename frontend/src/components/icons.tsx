type IconProps = { className?: string; title?: string }

export function IconHome({ className, title = "Home" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M12 3.2 3.5 10.2V21h5.5v-6.2h6V21H20.5V10.2L12 3.2Zm0 2.3 6.5 5.3V19h-2.5v-6.2h-8V19H5.5v-8.2L12 5.5Z"
      />
    </svg>
  )
}

export function IconCalendar({ className, title = "Calendar" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M7 2.5h1.8v1.7h6.4V2.5H17v1.7h2.5A1.8 1.8 0 0 1 21.3 6v13.2a1.8 1.8 0 0 1-1.8 1.8H4.5A1.8 1.8 0 0 1 2.7 19.2V6A1.8 1.8 0 0 1 4.5 4.2H7V2.5Zm12.5 7.2H4.5v9.5h15V9.7Zm0-3.7H4.5V6h15V6Z"
      />
    </svg>
  )
}

export function IconPlane({ className, title = "Visits" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="m21 11.2-7.4-1.5L8.3 3.4 6.7 4l2.8 5.3-4.4.9-1.7-1.5-1.2.5 2.3 3.3-2.3 3.3 1.2.5 1.7-1.5 4.4.9-2.8 5.3 1.6.6 5.3-6.3L21 12.8v-1.6Z"
      />
    </svg>
  )
}

export function IconHeart({ className, title = "Check-in" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M12 20.4 10.6 19.1C5.4 14.4 2 11.3 2 7.5A4.4 4.4 0 0 1 6.5 3 4.8 4.8 0 0 1 12 5.5 4.8 4.8 0 0 1 17.5 3 4.4 4.4 0 0 1 22 7.5c0 3.8-3.4 6.9-8.6 11.6L12 20.4Z"
      />
    </svg>
  )
}

export function IconBook({ className, title = "Memories" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M6.2 3.5h11.1A1.7 1.7 0 0 1 19 5.2v14.1l-7-3-7 3V5.2A1.7 1.7 0 0 1 6.2 3.5Zm0 1.8v11.5l5.3-2.3 5.3 2.3V5.3H6.2Z"
      />
    </svg>
  )
}

export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5.5c5 0 9.3 3.1 11 7.5-1.7 4.4-6 7.5-11 7.5S2.7 17.4 1 13C2.7 8.6 7 5.5 12 5.5Zm0 2.2A7.8 7.8 0 0 0 4.3 13 7.8 7.8 0 0 0 12 18.3 7.8 7.8 0 0 0 19.7 13 7.8 7.8 0 0 0 12 7.7Zm0 2.1a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Z"
      />
    </svg>
  )
}

export function IconEyeOff({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="m3.3 2.2 18.5 18.5-1.4 1.4-3.2-3.2A12.4 12.4 0 0 1 12 20.5c-5 0-9.3-3.1-11-7.5a13 13 0 0 1 4.7-5.6L1.9 3.6 3.3 2.2Zm5.5 5.5 1.7 1.7a3.2 3.2 0 0 0 4.1 4.1l1.7 1.7a5.4 5.4 0 0 1-7.5-7.5ZM12 5.5c5 0 9.3 3.1 11 7.5a13 13 0 0 1-3.4 4.6l-1.6-1.6A7.8 7.8 0 0 0 19.7 13 7.8 7.8 0 0 0 12 7.7c-.5 0-1 .1-1.5.2L8.9 6.3A12 12 0 0 1 12 5.5Zm-1.2 5.3 2.4 2.4a1.5 1.5 0 0 1-2.4-2.4Z"
      />
    </svg>
  )
}
