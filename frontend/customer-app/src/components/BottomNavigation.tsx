import { CalendarDays, ClipboardList, House, Search, UserRound } from 'lucide-react'

export type NavigationItem = 'Home' | 'Search' | 'Orders' | 'Meal Plans' | 'Account'

interface BottomNavigationProps {
  activeItem: NavigationItem
  onNavigate: (item: NavigationItem) => void
}

const items = [
  { label: 'Home' as const, Icon: House },
  { label: 'Search' as const, Icon: Search },
  { label: 'Orders' as const, Icon: ClipboardList },
  { label: 'Meal Plans' as const, Icon: CalendarDays },
  { label: 'Account' as const, Icon: UserRound },
]

function BottomNavigation({ activeItem, onNavigate }: BottomNavigationProps) {
  const activeIndex = items.findIndex(({ label }) => label === activeItem)

  return (
    <nav aria-label="Main navigation" className="bottom-navigation">
      <div className="navigation-tabs">
        <span
          aria-hidden="true"
          className="navigation-active-indicator"
          style={{ left: `${((activeIndex + 0.5) / items.length) * 100}%` }}
        />
        {items.map(({ label, Icon }) => (
          <button
            aria-current={activeItem === label ? 'page' : undefined}
            aria-label={label}
            className={`navigation-item${activeItem === label ? ' is-active' : ''}`}
            key={label}
            onClick={() => onNavigate(label)}
            type="button"
          >
            <span className="navigation-icon">
              <Icon aria-hidden="true" size={21} strokeWidth={activeItem === label ? 2.4 : 1.8} />
            </span>
            <span className="navigation-label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomNavigation
