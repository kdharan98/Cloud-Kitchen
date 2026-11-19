interface BrandLogoProps {
  className?: string
}

function BrandLogo({ className }: BrandLogoProps) {
  return <img className={className ?? 'brand-logo'} src="/daily-bite-logo.svg" alt="Daily Bite" />
}

export default BrandLogo
