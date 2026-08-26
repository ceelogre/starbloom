import type { SVGProps } from 'react'

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 48" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="5" y="3" width="18" height="44" rx="9" transform="rotate(-30 14 25)" />
      <rect x="41" y="3" width="18" height="44" rx="9" transform="rotate(30 50 25)" />
    </svg>
  )
}
