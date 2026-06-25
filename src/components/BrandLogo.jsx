import mastLogo from '../assets/mast-logo.webp'

export default function BrandLogo({ size = 'header', light = false }) {
  return (
    <span className={`mast-logo mast-logo-${size}${light ? ' mast-logo-light' : ''}`} aria-label="MAST">
      <img src={mastLogo} alt="MAST" />
    </span>
  )
}
