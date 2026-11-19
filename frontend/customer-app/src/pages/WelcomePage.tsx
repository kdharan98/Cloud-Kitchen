import { ArrowRight } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'
import FoodCarousel from '../components/FoodCarousel'

interface WelcomePageProps {
  onGetStarted: () => void
}

function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <main className="welcome-screen">
      <BrandLogo className="welcome-logo" />
      <div className="welcome-copy">
        <span className="eyebrow">A little goodness, every day</span>
        <h1>Your Healthy Food</h1>
        <p>Fresh, delicious vegetarian meals made for your everyday routine.</p>
      </div>
      <FoodCarousel />
      <button className="primary-button welcome-cta" onClick={onGetStarted} type="button">
        Get Started <ArrowRight aria-hidden="true" size={19} />
      </button>
    </main>
  )
}

export default WelcomePage
