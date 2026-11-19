import { useState } from 'react'
import HomePage from './pages/HomePage'
import WelcomePage from './pages/WelcomePage'

const ONBOARDING_KEY = 'daily-bite-onboarding-complete'

function isWelcomePreview() {
  return new URLSearchParams(window.location.search).get('welcome') === 'true'
}

function App() {
  const [hasStarted, setHasStarted] = useState(
    () => !isWelcomePreview() && window.localStorage.getItem(ONBOARDING_KEY) === 'true',
  )

  function completeOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, 'true')
    if (isWelcomePreview()) {
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
    setHasStarted(true)
  }

  return hasStarted ? <HomePage /> : <WelcomePage onGetStarted={completeOnboarding} />
}

export default App
