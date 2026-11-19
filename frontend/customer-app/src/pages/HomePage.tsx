import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Leaf,
  MapPin,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import BottomNavigation, { type NavigationItem } from '../components/BottomNavigation'
import BottomSheet from '../components/BottomSheet'
import BrandLogo from '../components/BrandLogo'
import CartBar from '../components/CartBar'
import FoodCard from '../components/FoodCard'
import { cuisineCategories, mockMenu } from '../data/mockMenu'
import AccountPage from '../features/account/AccountPage'
import {
  formatSavedAddress,
  initialAddresses,
  initialNotificationPreferences,
  initialProfile,
  type NotificationPreferences,
  type SavedAddress,
} from '../features/account/types'
import CheckoutFlow from '../features/checkout/CheckoutFlow'
import { getCartMealTypes } from '../features/checkout/checkoutUtils'
import MealPlansPage from '../features/meal-plans/MealPlansPage'
import HistoryPage from './HistoryPage'
import './history-page.css'
import type { CartItem, CuisineCategory, MenuItem, MenuMealType } from '../types/menu'

function HomePage() {
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [selectedDeliverySlots, setSelectedDeliverySlots] =
    useState<Partial<Record<MenuMealType, string>>>({})
  const [selectedCategory, setSelectedCategory] = useState<CuisineCategory | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [savedAddresses, setSavedAddresses] = useState(initialAddresses)
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddresses[0].id)
  const [location, setLocation] = useState(formatSavedAddress(initialAddresses[0]))
  const [accountProfile, setAccountProfile] = useState(initialProfile)
  const [notificationPreferences, setNotificationPreferences] = useState(
    initialNotificationPreferences,
  )
  const [activeNavigation, setActiveNavigation] = useState<NavigationItem>('Home')
  const [selectedOrderMode, setSelectedOrderMode] = useState<'order' | 'meal-plans'>('order')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sheet, setSheet] = useState<'location' | 'cart' | null>(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredMenu = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return mockMenu.filter((item) => {
      const matchesCategory = !selectedCategory || item.category === selectedCategory
      const matchesSearch =
        !normalizedQuery ||
        `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(normalizedQuery)
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, selectedCategory])

  const cartItems = Object.values(cart)
  const cartCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0)
  const cartTotal = cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)

  function updateCart(item: MenuItem, change: number) {
    const quantity = (cart[item.id]?.quantity ?? 0) + change
    const next = { ...cart }
    if (quantity <= 0) delete next[item.id]
    else next[item.id] = { item, quantity }
    setCart(next)

    const mealTypes = getCartMealTypes(next)
    setSelectedDeliverySlots((current) => ({
      breakfast: mealTypes.includes('breakfast') ? current.breakfast : undefined,
      lunch: mealTypes.includes('lunch') ? current.lunch : undefined,
    }))
  }

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2400)
  }

  function handleNavigation(item: NavigationItem) {
    setActiveNavigation(item)
    setCheckoutOpen(false)
    setNotice('')
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    if (item === 'Home') {
      setSelectedOrderMode('order')
      setSelectedCategory(null)
      setSearchQuery('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (item === 'Search') {
      setSelectedOrderMode('order')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (item === 'Orders' || item === 'Meal Plans') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (item === 'Account') {
      setSelectedOrderMode('order')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSelectedOrderMode('order')
      showNotice(`${item} will be available soon.`)
    }
  }

  function exploreMealPlans() {
    setActiveNavigation('Home')
    setSelectedOrderMode('meal-plans')
    setSelectedCategory(null)
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateSavedAddresses(nextAddresses: SavedAddress[]) {
    setSavedAddresses(nextAddresses)
    const selectedAddress = nextAddresses.find((address) => address.id === selectedAddressId)
    if (!selectedAddress || selectedAddress.coverageStatus !== 'current-selection') {
      const currentAddress = nextAddresses.find(
        (address) => address.coverageStatus === 'current-selection',
      )
      setSelectedAddressId(currentAddress?.id ?? '')
      setLocation(currentAddress ? formatSavedAddress(currentAddress) : '')
    }
  }

  function selectDeliveryAddress(address: SavedAddress | null) {
    if (address && address.coverageStatus !== 'current-selection') return
    setSelectedAddressId(address?.id ?? '')
    setLocation(address ? formatSavedAddress(address) : '')
  }

  function renderMenuSection(title: string, items: MenuItem[]) {
    if (items.length === 0) return null
    return (
      <section className="menu-section" key={title}>
        <div className="section-heading">
          <h2>{title}</h2>
          <button
            onClick={() => {
              setSelectedCategory(null)
              setSearchQuery('')
            }}
            type="button"
          >
            View all
          </button>
        </div>
        <div className="food-grid">
          {items.map((item) => (
            <FoodCard
              item={item}
              key={item.id}
              onAdd={() => updateCart(item, 1)}
              onRemove={() => updateCart(item, -1)}
              quantity={cart[item.id]?.quantity ?? 0}
            />
          ))}
        </div>
      </section>
    )
  }

  const isSearchActive = activeNavigation === 'Search'
  const isHistoryPage = activeNavigation === 'Orders' || activeNavigation === 'Meal Plans'
  const isDedicatedPage = isHistoryPage || activeNavigation === 'Account'

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-top-row">
          <BrandLogo className="header-logo" />
          <div className="header-actions">
            <button
              aria-label="Notifications"
              className="icon-button"
              onClick={() => showNotice("You're all caught up.")}
              type="button"
            >
              <Bell size={20} />
            </button>
            <button
              aria-label={`Cart, ${cartCount} items`}
              className="icon-button cart-icon-button"
              onClick={() => setSheet('cart')}
              type="button"
            >
              <ShoppingBag size={20} />
              <span>{cartCount}</span>
            </button>
          </div>
        </div>
        <button className="delivery-location" onClick={() => setSheet('location')} type="button">
          <span className="location-pin"><MapPin aria-hidden="true" size={17} /></span>
          <span className="delivery-copy">
            <span>Delivering to</span>
            <strong>{location || 'No verified address selected'}</strong>
          </span>
          <span className="change-location">Change <ChevronDown aria-hidden="true" size={15} /></span>
        </button>
      </header>

      {!checkoutOpen && !isDedicatedPage && (
        <div className="order-mode-sticky">
          <div aria-label="Choose order type" className="order-mode" role="group">
            <button
              aria-pressed={selectedOrderMode === 'order'}
              className={selectedOrderMode === 'order' ? 'is-selected' : ''}
              onClick={() => setSelectedOrderMode('order')}
              type="button"
            >
              <ShoppingBag aria-hidden="true" size={16} />
              <span>Order Now</span>
            </button>
            <button
              aria-pressed={selectedOrderMode === 'meal-plans'}
              className={selectedOrderMode === 'meal-plans' ? 'is-selected' : ''}
              onClick={() => setSelectedOrderMode('meal-plans')}
              type="button"
            >
              <CalendarDays aria-hidden="true" size={16} />
              <span>Meal Plans</span>
            </button>
          </div>
        </div>
      )}

      <main className="home-content">
        {checkoutOpen ? (
          <CheckoutFlow
            cart={cart}
            deliveryAddress={location}
            deliveryAddressType={
              savedAddresses.find((address) => address.id === selectedAddressId)?.label ?? 'Delivery'
            }
            onChangeAddress={() => setSheet('location')}
            onEditCart={() => setSheet('cart')}
            onReturnHome={() => {
              setCheckoutOpen(false)
              setSelectedOrderMode('order')
              setActiveNavigation('Home')
            }}
            onSelectSlot={(mealType, slot) =>
              setSelectedDeliverySlots((current) => ({ ...current, [mealType]: slot }))
            }
            onViewOrders={() => handleNavigation('Orders')}
            selectedSlots={selectedDeliverySlots}
          />
        ) : activeNavigation === 'Orders' ? (
          <HistoryPage kind="orders" onExplore={() => handleNavigation('Home')} />
        ) : activeNavigation === 'Meal Plans' ? (
          <HistoryPage kind="meal-plans" onExplore={exploreMealPlans} />
        ) : activeNavigation === 'Account' ? (
          <AccountPage
            addresses={savedAddresses}
            notifications={notificationPreferences}
            onAddressesChange={updateSavedAddresses}
            onNavigateHistory={(item) => handleNavigation(item)}
            onNotificationsChange={(preferences: NotificationPreferences) =>
              setNotificationPreferences(preferences)
            }
            onProfileChange={setAccountProfile}
            onSelectAddress={selectDeliveryAddress}
            profile={accountProfile}
            selectedAddressId={selectedAddressId}
          />
        ) : selectedOrderMode === 'meal-plans' ? (
          <MealPlansPage onNotice={showNotice} />
        ) : (
          <>
        <div
          aria-hidden={!isSearchActive}
          className={`search-transition${isSearchActive ? ' is-open' : ''}`}
          inert={!isSearchActive}
        >
          <div className="search-transition-inner">
            <label className="search-field" htmlFor="menu-search">
              <Search aria-hidden="true" size={19} />
              <input
                aria-label="Search dishes, biryani, snacks..."
                id="menu-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search dishes, biryani, snacks..."
                type="search"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  type="button"
                >
                  Clear
                </button>
              )}
            </label>
          </div>
        </div>

        <section className="cuisine-section" aria-label="Browse by cuisine">
          <div className="section-heading">
            <h2>Explore cuisines</h2>
          </div>
          <div className="cuisine-chips">
            {cuisineCategories.map((category) => (
              <button
                aria-pressed={selectedCategory === category}
                className={selectedCategory === category ? 'is-selected' : ''}
                key={category}
                onClick={() =>
                  setSelectedCategory((current) => (current === category ? null : category))
                }
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {filteredMenu.length > 0 ? (
          <>
            {searchQuery || selectedCategory
              ? renderMenuSection(
                  searchQuery ? 'Search results' : `${selectedCategory} favourites`,
                  filteredMenu,
                )
              : [
                  'Breakfast Favourites',
                  'South Indian Specials',
                  'Chaat & Snacks',
                  'Lunch Favourites',
                ].map(
                  (title) =>
                    renderMenuSection(
                      title,
                      filteredMenu.filter((item) => item.section === title),
                    ),
                )}
          </>
        ) : (
          <div className="empty-results">
            <Search aria-hidden="true" size={24} />
            <p>No dishes found. Try another search.</p>
          </div>
        )}

        <div className="home-footer-note">Made fresh with a little extra love <Leaf size={14} /></div>
          </>
        )}
      </main>

      {notice && <div className="toast-message" role="status">{notice}</div>}

      {!checkoutOpen && !isDedicatedPage && selectedOrderMode === 'order' && (
        <CartBar itemCount={cartCount} onViewCart={() => setSheet('cart')} total={cartTotal} />
      )}
      <BottomNavigation activeItem={activeNavigation} onNavigate={handleNavigation} />

      {sheet === 'location' && (
        <BottomSheet onClose={() => setSheet(null)} title="Choose delivery location">
          <div className="address-list">
            {savedAddresses.map((address) => (
              <button
                className="address-option"
                disabled={address.coverageStatus !== 'current-selection'}
                key={address.id}
                onClick={() => {
                  selectDeliveryAddress(address)
                  setSheet(null)
                }}
                type="button"
              >
                <span className="address-pin"><MapPin size={18} /></span>
                <span>
                  <strong>{address.label}</strong>
                  <small>{formatSavedAddress(address) || 'Address details not provided'}</small>
                  {address.coverageStatus !== 'current-selection' && (
                    <small>Coverage unverified; unavailable for checkout</small>
                  )}
                </span>
                {selectedAddressId === address.id && <span className="address-selected">Selected</span>}
              </button>
            ))}
            {savedAddresses.length === 0 && (
              <p className="location-coverage-placeholder">
                No verified delivery address is available. Add and verify an address from Account.
              </p>
            )}
          </div>
        </BottomSheet>
      )}

      {sheet === 'cart' && (
        <BottomSheet onClose={() => setSheet(null)} title={`Your cart (${cartCount})`}>
          {cartItems.length > 0 ? (
            <>
              <div className="cart-sheet-items">
                {cartItems.map(({ item, quantity }) => (
                  <div className="cart-sheet-item" key={item.id}>
                    <img alt="" src={item.image} />
                    <div className="cart-sheet-item-copy">
                      <strong>{item.name}</strong>
                      <span>₹{item.price} each</span>
                    </div>
                    <div className="quantity-control">
                      <button
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => updateCart(item, -1)}
                        type="button"
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label={`Add one ${item.name}`}
                        onClick={() => updateCart(item, 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-sheet-total"><span>Subtotal</span><strong>₹{cartTotal}</strong></div>
              <button
                className="cart-checkout-button"
                onClick={() => {
                  setSheet(null)
                  setSelectedOrderMode('order')
                  setCheckoutOpen(true)
                }}
                type="button"
              >
                Checkout <ArrowRight aria-hidden="true" size={16} />
              </button>
            </>
          ) : (
            <div className="empty-cart">
              <ShoppingBag aria-hidden="true" size={30} />
              <p>Your cart is ready for something delicious.</p>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}

export default HomePage
