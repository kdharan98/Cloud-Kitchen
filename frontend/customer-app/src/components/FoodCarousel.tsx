import { useEffect, useRef, useState } from 'react'

const slides = [
  { label: 'South Indian', image: '/images/onboarding/south-indian.png' },
  { label: 'North Indian', image: '/images/onboarding/north-indian.png' },
  { label: 'Chaat', image: '/images/onboarding/chaat.png' },
]

function FoodCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isInteracting, setIsInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pointerStart = useRef<number | null>(null)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    updatePreference()
    preference.addEventListener('change', updatePreference)
    return () => preference.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (reducedMotion || isInteracting) return

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [isInteracting, reducedMotion])

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    },
    [],
  )

  function pauseForInteraction() {
    setIsInteracting(true)
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = null
  }

  function resumeAutoplaySoon() {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setIsInteracting(false), 1800)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientX
    pauseForInteraction()
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return
    const distance = event.clientX - pointerStart.current
    if (Math.abs(distance) > 40) {
      setActiveIndex((index) => (index + (distance < 0 ? 1 : slides.length - 1)) % slides.length)
    }
    pointerStart.current = null
    resumeAutoplaySoon()
  }

  return (
    <section
      className="carousel-section"
      aria-label="Explore our cuisines"
      aria-roledescription="carousel"
    >
      <div
        className="food-carousel"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null
          resumeAutoplaySoon()
        }}
      >
        {slides.map((slide, index) => {
          const offset = (index - activeIndex + slides.length) % slides.length
          const position = offset === slides.length - 1 ? -1 : offset

          return (
            <div
              className={`carousel-card${position === 0 ? ' is-active' : ''}`}
              key={slide.label}
              style={{
                transform: `translateX(calc(-50% + ${position * 100}% + ${position * 14}px))`,
              }}
              aria-hidden={position !== 0}
            >
              <img src={slide.image} alt="" draggable="false" />
              <span className="carousel-label">{slide.label}</span>
            </div>
          )
        })}
      </div>
      <div className="carousel-dots" aria-label="Choose a cuisine">
        {slides.map((slide, index) => (
          <button
            aria-label={`Show ${slide.label}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={`carousel-dot${index === activeIndex ? ' is-active' : ''}`}
            key={slide.label}
            onClick={() => {
              pauseForInteraction()
              setActiveIndex(index)
              resumeAutoplaySoon()
            }}
            type="button"
          />
        ))}
      </div>
    </section>
  )
}

export default FoodCarousel
