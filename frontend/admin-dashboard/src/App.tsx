import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeIndianRupee, Bell, CalendarDays,
  Check, CheckCircle2, ChefHat, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, Clock3, Coffee, CreditCard, Ellipsis, Eye, Filter, LayoutDashboard,
  Leaf, ListChecks, MapPin, Menu as MenuIcon, MoreHorizontal, PackageCheck, Pencil,
  Plus, Search, Settings, ShoppingBag, SlidersHorizontal, Soup, Sparkles, Tags, Trash2,
  Truck, Users, Utensils, X, type LucideIcon,
} from 'lucide-react'

type PageId = 'overview' | 'orders' | 'subscriptions' | 'kitchen' | 'menu' | 'deliveries' | 'customers' | 'reports' | 'settings'
type Meal = 'Breakfast' | 'Lunch'
type Availability = 'Available' | 'Sold Out' | 'Temporarily Unavailable'
type MenuItem = {
  id: string
  name: string
  description: string
  category: string
  price: number
  meal: Meal[]
  vegetarian: boolean
  prepTime: number
  stock: number
  availability: Availability
  manualOverride?: boolean
  imageId?: string
  imageUrl?: string
}
type Category = { id: string; name: string }
type Order = { id: string; customer: string; phone: string; address: string; slot: string; status: string; items: string; total: number; payment: string; cancelReason?: string }
type SettingsValues = Record<string, string>

const STORAGE_KEY = 'daily-bite-admin-menu-v1'
const CATEGORY_KEY = 'daily-bite-admin-categories-v1'
const now = new Date()
const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const settingsDefaults: SettingsValues = {
  breakfastOpen: '07:00', breakfastClose: '10:30', lunchOpen: '12:00', lunchClose: '14:30', kitchenOpen: 'on',
  deliveryCharge: '30', serviceArea: 'Bengaluru · configured zones pending', deliveryRadius: '8',
  breakfastCutoff: '06:30', lunchCutoff: '11:00', closureMessage: 'The kitchen is temporarily closed.', temporaryClosure: 'off',
  businessName: 'Daily Bite Vegetarian Kitchen', contactEmail: 'hello@dailybite.example', businessPhone: '+91 80 0000 0000',
}
const categoriesSeed: Category[] = [
  { id: 'south-indian', name: 'South Indian' }, { id: 'north-indian', name: 'North Indian' },
  { id: 'chinese', name: 'Chinese' }, { id: 'chaat', name: 'Chaat' },
  { id: 'snacks', name: 'Snacks' }, { id: 'drinks', name: 'Drinks' },
]
const menuSeed: MenuItem[] = [
  { id: 'm1', name: 'Idli & Sambar', description: 'Soft steamed idlis with house sambar and coconut chutney.', category: 'South Indian', price: 90, meal: ['Breakfast'], vegetarian: true, prepTime: 15, stock: 40, availability: 'Available' },
  { id: 'm2', name: 'Masala Dosa', description: 'Crisp dosa filled with spiced potato, served with chutneys.', category: 'South Indian', price: 140, meal: ['Breakfast'], vegetarian: true, prepTime: 20, stock: 22, availability: 'Available' },
  { id: 'm3', name: 'Pongal', description: 'Comforting rice and lentil pongal with pepper and cashew.', category: 'South Indian', price: 110, meal: ['Breakfast'], vegetarian: true, prepTime: 15, stock: 12, availability: 'Available' },
  { id: 'm4', name: 'Veg Meals', description: 'A balanced daily thali with seasonal sides and rice.', category: 'North Indian', price: 220, meal: ['Lunch'], vegetarian: true, prepTime: 25, stock: 25, availability: 'Available' },
  { id: 'm5', name: 'Paneer Fried Rice', description: 'Wok-tossed rice with paneer and fresh vegetables.', category: 'Chinese', price: 190, meal: ['Lunch'], vegetarian: true, prepTime: 20, stock: 10, availability: 'Available' },
  { id: 'm6', name: 'Aloo Tikki Chaat', description: 'Golden potato patties with yogurt, chutneys and sev.', category: 'Chaat', price: 120, meal: ['Lunch'], vegetarian: true, prepTime: 15, stock: 0, availability: 'Sold Out' },
  { id: 'm7', name: 'Filter Coffee', description: 'Freshly brewed South Indian filter coffee.', category: 'Drinks', price: 55, meal: ['Breakfast', 'Lunch'], vegetarian: true, prepTime: 5, stock: 32, availability: 'Available' },
  { id: 'm8', name: 'Veg Cutlet', description: 'Crispy vegetable cutlets served with mint chutney.', category: 'Snacks', price: 80, meal: ['Breakfast'], vegetarian: true, prepTime: 12, stock: 8, availability: 'Available' },
]

const navItems: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: "Today's Overview", icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'subscriptions', label: 'Meal Subscriptions', icon: CalendarDays },
  { id: 'kitchen', label: 'Kitchen Schedule', icon: ChefHat },
  { id: 'menu', label: 'Menu Management', icon: Utensils },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'Payments & Reports', icon: BadgeIndianRupee },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const orderStatuses = ['New', 'Accepted', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled']
const orders: Order[] = [
  { id: 'DB-2408', customer: 'Ananya Rao', phone: '+91 98765 43210', address: '12, Lake View Road, Indiranagar', slot: 'Breakfast', status: 'New', items: 'Idli & Sambar × 2, Filter Coffee × 1', total: 235, payment: 'Paid' },
  { id: 'DB-2407', customer: 'Rohan Mehta', phone: '+91 98123 45678', address: 'Flat 302, Green Park Apartments', slot: 'Lunch', status: 'Preparing', items: 'Veg Meals × 1, Paneer Fried Rice × 1', total: 410, payment: 'Paid' },
  { id: 'DB-2406', customer: 'Meera Iyer', phone: '+91 99001 12233', address: '44, 2nd Main, Koramangala', slot: 'Lunch', status: 'Ready', items: 'Veg Meals × 2', total: 440, payment: 'Paid' },
  { id: 'DB-2405', customer: 'Arjun Nair', phone: '+91 98450 67890', address: '8B, Sunrise Residency, HSR Layout', slot: 'Breakfast', status: 'Out for Delivery', items: 'Masala Dosa × 1, Pongal × 1', total: 250, payment: 'Paid' },
  { id: 'DB-2404', customer: 'Priya Shah', phone: '+91 99887 66554', address: '21, Palm Street, Whitefield', slot: 'Lunch', status: 'Delivered', items: 'Paneer Fried Rice × 2', total: 380, payment: 'Paid' },
  { id: 'DB-2403', customer: 'Kavya Menon', phone: '+91 91234 56780', address: '5, Cedar Lane, Jayanagar', slot: 'Breakfast', status: 'Accepted', items: 'Idli & Sambar × 1, Veg Cutlet × 1', total: 170, payment: 'Pending' },
]
const deliveriesSeed = [
  { id: 'DB-2405', name: 'Arjun Nair', phone: '+91 98450 67890', address: '8B, Sunrise Residency, HSR Layout', slot: 'Breakfast', items: 'Masala Dosa × 1, Pongal × 1', status: 'Out for Delivery' },
  { id: 'DB-2406', name: 'Meera Iyer', phone: '+91 99001 12233', address: '44, 2nd Main, Koramangala', slot: 'Lunch', items: 'Veg Meals × 2', status: 'Ready' },
  { id: 'DB-2407', name: 'Rohan Mehta', phone: '+91 98123 45678', address: 'Flat 302, Green Park Apartments', slot: 'Lunch', items: 'Veg Meals × 1, Paneer Fried Rice × 1', status: 'Preparing' },
  { id: 'DB-2408', name: 'Ananya Rao', phone: '+91 98765 43210', address: '12, Lake View Road, Indiranagar', slot: 'Breakfast', items: 'Idli & Sambar × 2, Filter Coffee × 1', status: 'Pending' },
]

function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('daily-bite-admin-images', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('images')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local image storage.'))
  })
}

async function saveImage(id: string, blob: Blob): Promise<void> {
  const db = await openImageDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('images', 'readwrite').objectStore('images').put(blob, id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not save this image locally.'))
  })
  db.close()
}

async function loadImage(id: string): Promise<Blob | undefined> {
  const db = await openImageDatabase()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction('images', 'readonly').objectStore('images').get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error ?? new Error('Could not read the saved image.'))
  })
  db.close()
  return blob
}

async function deleteImage(id: string): Promise<void> {
  const db = await openImageDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction('images', 'readwrite').objectStore('images').delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not remove the local image.'))
  })
  db.close()
}

function money(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function StatusPill({ children }: { children: string }) {
  const key = children.toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill status-${key}`}>{children}</span>
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-title"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(menuSeed)
  const [categories, setCategories] = useState<Category[]>(categoriesSeed)
  const [menuReady, setMenuReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [menuQuery, setMenuQuery] = useState('')
  const [menuCategory, setMenuCategory] = useState('All categories')
  const [menuMeal, setMenuMeal] = useState('All meals')
  const [menuAvailability, setMenuAvailability] = useState('All availability')
  const [itemDialog, setItemDialog] = useState<MenuItem | 'new' | null>(null)
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null)
  const [draftImage, setDraftImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [ordersQuery, setOrdersQuery] = useState('')
  const [ordersFilter, setOrdersFilter] = useState('All statuses')
  const [ordersMealFilter, setOrdersMealFilter] = useState('All meals')
  const [ordersDate, setOrdersDate] = useState(todayDate)
  const [orderItems, setOrderItems] = useState<Order[]>(orders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [pendingCancellation, setPendingCancellation] = useState<Order | null>(null)
  const [deliveryItems, setDeliveryItems] = useState(deliveriesSeed)
  const [deliveryFilter, setDeliveryFilter] = useState('All statuses')
  const [customerQuery, setCustomerQuery] = useState('')
  const [scheduleDate, setScheduleDate] = useState(todayDate)
  const [checkedPrep, setCheckedPrep] = useState<string[]>([])
  const [categoryDialog, setCategoryDialog] = useState<{ mode: 'add' | 'edit'; category?: Category } | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsValues, setSettingsValues] = useState<SettingsValues>(settingsDefaults)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function hydrate() {
      try {
        const storedMenu = localStorage.getItem(STORAGE_KEY)
        const storedCategories = localStorage.getItem(CATEGORY_KEY)
        const parsedMenu: MenuItem[] = storedMenu ? JSON.parse(storedMenu) as MenuItem[] : menuSeed
        const parsedCategories: Category[] = storedCategories ? JSON.parse(storedCategories) as Category[] : categoriesSeed
        const hydrated = await Promise.all(parsedMenu.map(async (item) => {
          if (!item.imageId) return item
          const blob = await loadImage(item.imageId)
          return blob ? { ...item, imageUrl: URL.createObjectURL(blob) } : item
        }))
        if (active) {
          setMenuItems(hydrated)
          setCategories(parsedCategories)
          setMenuReady(true)
        }
      } catch (error) {
        if (active) {
          setNotice(`Could not load saved menu data: ${error instanceof Error ? error.message : 'unknown storage error'}`)
          setMenuReady(true)
        }
      }
    }
    void hydrate()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!menuReady) return
    try {
      const cleanItems = menuItems.map(({ imageUrl: _imageUrl, ...item }) => item)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanItems))
      localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories))
    } catch (error) {
      const message = `Could not save menu data in this browser: ${error instanceof Error ? error.message : 'storage error'}`
      queueMicrotask(() => setNotice(message))
    }
  }, [menuItems, categories, menuReady])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const filteredMenu = useMemo(() => menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuQuery.toLowerCase())
    && (menuCategory === 'All categories' || item.category === menuCategory)
    && (menuMeal === 'All meals' || item.meal.includes(menuMeal as Meal))
    && (menuAvailability === 'All availability' || item.availability === menuAvailability),
  ), [menuItems, menuQuery, menuCategory, menuMeal, menuAvailability])

  function navigate(id: PageId) {
    setActivePage(id)
    setMobileNavOpen(false)
  }

  async function saveMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const current = itemDialog !== 'new' && itemDialog ? itemDialog : null
    const meals = form.getAll('meal').map(String).filter((value): value is Meal => value === 'Breakfast' || value === 'Lunch')
    if (!meals.length) {
      setNotice('Choose at least one meal service.')
      return
    }
    const stock = Number(form.get('stock'))
    const requestedAvailability = String(form.get('availability')) as Availability
    const manualOverride = requestedAvailability === 'Temporarily Unavailable'
      || (requestedAvailability === 'Sold Out' && (current?.availability !== 'Sold Out' || current.manualOverride === true))
    const availability = requestedAvailability === 'Available' && stock === 0
      ? 'Sold Out'
      : requestedAvailability === 'Sold Out' && stock > 0 && !manualOverride
        ? 'Available'
        : requestedAvailability
    const imageId = draftImage ? `menu-image-${crypto.randomUUID()}` : removeImage ? undefined : current?.imageId
    try {
      if (draftImage && imageId) await saveImage(imageId, draftImage.blob)
      if (removeImage && current?.imageId) await deleteImage(current.imageId)
      const item: MenuItem = {
        id: current?.id ?? crypto.randomUUID(),
        name: String(form.get('name') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        category: String(form.get('category') ?? ''),
        price: Number(form.get('price')),
        meal: meals,
        vegetarian: true,
        prepTime: Number(form.get('prepTime')),
        stock,
        availability,
        manualOverride,
        imageId,
        imageUrl: draftImage?.url ?? (removeImage ? undefined : current?.imageUrl),
      }
      setMenuItems((previous) => current ? previous.map((entry) => entry.id === current.id ? item : entry) : [item, ...previous])
      setItemDialog(null)
      setDraftImage(null)
      setRemoveImage(false)
      setNotice(current ? 'Menu item updated locally.' : 'Menu item added locally.')
      if (draftImage && current?.imageId) {
        void deleteImage(current.imageId).catch((error: unknown) => setNotice(`Item saved, but the previous local image could not be removed: ${error instanceof Error ? error.message : 'storage error'}`))
      }
    } catch (error) {
      setNotice(`Could not save the image: ${error instanceof Error ? error.message : 'local storage error'}`)
    }
  }

  function openItemDialog(item: MenuItem | 'new') {
    setDraftImage(null)
    setRemoveImage(false)
    setItemDialog(item)
  }

  function selectImage(file?: File) {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setNotice('Choose a JPG, PNG or WebP image.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice('Images must be 5 MB or smaller.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setDraftImage({ blob: file, url })
    setRemoveImage(false)
  }

  function deleteMenuItem(item: MenuItem) {
    if (!window.confirm(`Delete “${item.name}” from this device's prototype menu?`)) return
    setMenuItems((previous) => previous.filter((entry) => entry.id !== item.id))
    if (item.imageId) void deleteImage(item.imageId).catch((error: unknown) => setNotice(`Menu item deleted, but its local image could not be removed: ${error instanceof Error ? error.message : 'storage error'}`))
    setNotice('Menu item deleted from this device.')
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = categoryName.trim()
    if (!cleanName) return
    if (categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase() && category.id !== categoryDialog?.category?.id)) {
      setNotice('A category with that name already exists.')
      return
    }
    if (categoryDialog?.mode === 'edit' && categoryDialog.category) {
      const oldName = categoryDialog.category.name
      setCategories((previous) => previous.map((category) => category.id === categoryDialog.category?.id ? { ...category, name: cleanName } : category))
      setMenuItems((previous) => previous.map((item) => item.category === oldName ? { ...item, category: cleanName } : item))
      if (menuCategory === oldName) setMenuCategory(cleanName)
      setNotice('Category renamed. Existing items were kept in that category.')
    } else {
      setCategories((previous) => [...previous, { id: crypto.randomUUID(), name: cleanName }])
      setNotice('Category added.')
    }
    setCategoryDialog(null)
    setCategoryName('')
  }

  function deleteCategory(category: Category) {
    const count = menuItems.filter((item) => item.category === category.name).length
    if (count) {
      setNotice(`Reassign the ${count} item${count === 1 ? '' : 's'} in ${category.name} before deleting this category.`)
      return
    }
    if (!window.confirm(`Delete the empty category “${category.name}”?`)) return
    setCategories((previous) => previous.filter((entry) => entry.id !== category.id))
    if (menuCategory === category.name) setMenuCategory('All categories')
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    setCategories((previous) => {
      const next = [...previous]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateOrderStatus(orderId: string, status: string) {
    if (status === 'Cancelled') {
      const order = orderItems.find((entry) => entry.id === orderId)
      if (!order) {
        setNotice(`Could not find sample order ${orderId}.`)
        return
      }
      setPendingCancellation(order)
      return
    }
    commitOrderStatus(orderId, status)
  }

  function commitOrderStatus(orderId: string, status: string, cancelReason?: string) {
    const updated = orderItems.map((order) => order.id === orderId ? { ...order, status, cancelReason } : order)
    setOrderItems(updated)
    const selected = updated.find((order) => order.id === orderId)
    if (selected) setSelectedOrder(selected)
    setNotice(`${orderId} status updated in this prototype only.`)
  }

  function confirmCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingCancellation) return
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason) {
      setNotice('Cancellation was not saved. A reason is required.')
      return
    }
    commitOrderStatus(pendingCancellation.id, 'Cancelled', reason)
    setPendingCancellation(null)
  }

  const pageTitle = navItems.find((item) => item.id === activePage)?.label ?? "Today's Overview"

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Leaf size={22} strokeWidth={2.5} /></div><div><strong>daily bite</strong><span>KITCHEN ADMIN</span></div><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${activePage === id ? 'nav-active' : ''}`} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{id === 'orders' && <span className="nav-count">8</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-hint"><div className="hint-icon"><CircleHelp size={17} /></div><strong>Prototype mode</strong><p>Changes stay in this browser. No live orders or payments are connected.</p></div>
          <div className="user-card"><div className="avatar avatar-green">AK</div><div className="user-copy"><strong>Arun Kumar</strong><span>Kitchen admin</span></div><button className="icon-button" aria-label="Account options" onClick={() => setProfileOpen(!profileOpen)}><MoreHorizontal size={19} /></button></div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><MenuIcon size={21} /></button>
          <div className="breadcrumb"><span>Daily Bite</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          <div className="topbar-actions"><div className="live-tag"><span /> Sample data</div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up. Notifications are sample data in this prototype.')}><Bell size={19} /><i /></button><button className="topbar-avatar" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>AK</button>{profileOpen && <div className="profile-popover"><div className="avatar avatar-green">AK</div><div><strong>Arun Kumar</strong><span>Kitchen admin · prototype</span></div><button onClick={() => { navigate('settings'); setProfileOpen(false) }}>Kitchen settings <ArrowRight size={14} /></button></div>}</div>
        </header>
        <div className="content-area">
          {activePage === 'overview' && <Overview onNavigate={navigate} />}
          {activePage === 'orders' && <OrdersPage orders={orderItems} query={ordersQuery} setQuery={setOrdersQuery} status={ordersFilter} setStatus={setOrdersFilter} meal={ordersMealFilter} setMeal={setOrdersMealFilter} date={ordersDate} setDate={setOrdersDate} onSelect={setSelectedOrder} onUpdateStatus={updateOrderStatus} />}
          {activePage === 'subscriptions' && <SubscriptionsPage />}
          {activePage === 'kitchen' && <KitchenPage date={scheduleDate} setDate={setScheduleDate} checked={checkedPrep} setChecked={setCheckedPrep} />}
          {activePage === 'menu' && (menuReady ? <MenuPage items={filteredMenu} allItems={menuItems} categories={categories} query={menuQuery} setQuery={setMenuQuery} category={menuCategory} setCategory={setMenuCategory} meal={menuMeal} setMeal={setMenuMeal} availability={menuAvailability} setAvailability={setMenuAvailability} onAdd={() => openItemDialog('new')} onEdit={openItemDialog} onDelete={deleteMenuItem} onPreview={setPreviewItem} onAvailability={(id, availability) => setMenuItems((previous) => previous.map((item) => item.id === id ? { ...item, availability: availability === 'Available' && item.stock === 0 ? 'Sold Out' : availability, manualOverride: availability !== 'Available' } : item))} onStock={(id, stock) => setMenuItems((previous) => previous.map((item) => item.id === id ? { ...item, stock, availability: stock === 0 && item.availability === 'Available' ? 'Sold Out' : stock > 0 && item.availability === 'Sold Out' && !item.manualOverride ? 'Available' : item.availability } : item))} categoryAction={setCategoryDialog} setCategoryName={setCategoryName} deleteCategory={deleteCategory} moveCategory={moveCategory} /> : <div className="panel loading-state" role="status"><span className="loading-spinner" /> Loading locally saved menu…</div>)}
          {activePage === 'deliveries' && <DeliveriesPage items={deliveryItems} filter={deliveryFilter} setFilter={setDeliveryFilter} onStatus={(id, status) => setDeliveryItems((previous) => previous.map((item) => item.id === id ? { ...item, status } : item))} />}
          {activePage === 'customers' && <CustomersPage query={customerQuery} setQuery={setCustomerQuery} />}
          {activePage === 'reports' && <ReportsPage />}
          {activePage === 'settings' && <SettingsPage values={settingsValues} onSave={(values) => {
            setSettingsValues(values)
            setSettingsSaved(true)
            window.setTimeout(() => setSettingsSaved(false), 3500)
          }} saved={settingsSaved} />}
        </div>
      </main>

      {notice && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16} /></button></div>}
      {itemDialog && <ItemDialog item={itemDialog === 'new' ? null : itemDialog} categories={categories} draftImage={draftImage} removeImage={removeImage} fileInputRef={fileInputRef} onImage={selectImage} onRemoveImage={() => { setDraftImage(null); setRemoveImage(true); if (fileInputRef.current) fileInputRef.current.value = '' }} onCancel={() => { setItemDialog(null); setDraftImage(null); setRemoveImage(false) }} onSubmit={saveMenuItem} />}
      {categoryDialog && <Modal title={categoryDialog.mode === 'add' ? 'Add category' : 'Rename category'} onClose={() => setCategoryDialog(null)}><form className="form-stack" onSubmit={saveCategory}><label className="field-label">Category name<input required autoFocus value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Seasonal specials" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setCategoryDialog(null)}>Cancel</button><button className="button button-primary">{categoryDialog.mode === 'add' ? 'Add category' : 'Save changes'}</button></div></form></Modal>}
      {previewItem && <Modal title="Food item preview" onClose={() => setPreviewItem(null)}><div className="preview-card">{previewItem.imageUrl ? <img src={previewItem.imageUrl} alt={previewItem.name} /> : <div className="food-placeholder preview-placeholder"><span>{foodEmoji(previewItem.category)}</span></div>}<div><div className="preview-heading"><h2>{previewItem.name}</h2><StatusPill>{previewItem.availability}</StatusPill></div><p>{previewItem.description || 'No description provided.'}</p><div className="preview-meta"><span>{previewItem.category}</span><span>{previewItem.meal.join(' · ')}</span><span>{previewItem.prepTime} min prep</span></div><strong className="preview-price">{money(previewItem.price)}</strong><small>Local prototype information — not connected to the live menu.</small></div></div></Modal>}
      {selectedOrder && <Modal title={`Order ${selectedOrder.id}`} onClose={() => setSelectedOrder(null)}><div className="order-detail"><div className="order-detail-head"><div className="avatar avatar-yellow">{initials(selectedOrder.customer)}</div><div><strong>{selectedOrder.customer}</strong><span>{selectedOrder.phone}</span></div><StatusPill>{selectedOrder.status}</StatusPill></div><div className="detail-block"><span>DELIVERY ADDRESS</span><p>{selectedOrder.address}</p></div><div className="detail-block"><span>ITEMS · {selectedOrder.slot.toUpperCase()}</span><p>{selectedOrder.items}</p></div>{selectedOrder.cancelReason && <div className="detail-block"><span>CANCELLATION REASON</span><p>{selectedOrder.cancelReason}</p></div>}<div className="detail-total"><span>Total · {selectedOrder.payment} payment</span><strong>{money(selectedOrder.total)}</strong></div><label className="field-label">Update sample status<select value={selectedOrder.status} onChange={(event) => updateOrderStatus(selectedOrder.id, event.target.value)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><p className="muted-note">Status changes are local UI state only; no order is updated in a backend.</p></div></Modal>}
      {pendingCancellation && <Modal title={`Cancel order ${pendingCancellation.id}?`} onClose={() => setPendingCancellation(null)}><form className="form-stack" onSubmit={confirmCancellation}><p className="cancellation-warning">Add a reason to record this sample cancellation. This does not cancel a real order.</p><label className="field-label">Cancellation reason<textarea name="reason" required autoFocus rows={3} maxLength={240} placeholder="Enter the cancellation reason" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setPendingCancellation(null)}>Keep order</button><button className="button button-danger">Confirm cancellation</button></div></form></Modal>}
    </div>
  )
}

function Overview({ onNavigate }: { onNavigate: (id: PageId) => void }) {
  const prepBreakfast = [{ item: 'Idli & Sambar', qty: 40, unit: 'portions', source: '24 orders · 16 subscriptions' }, { item: 'Masala Dosa', qty: 22, unit: 'portions', source: '14 orders · 8 subscriptions' }, { item: 'Pongal', qty: 12, unit: 'portions', source: '7 orders · 5 subscriptions' }]
  const prepLunch = [{ item: 'Veg Meals', qty: 25, unit: 'portions', source: '15 orders · 10 subscriptions' }, { item: 'Paneer Fried Rice', qty: 10, unit: 'portions', source: '6 orders · 4 subscriptions' }]
  return <>
    <SectionTitle eyebrow={todayLabel} title="Today's Overview" description="A quick look at what's happening in your kitchen today." action={<button className="button button-secondary" onClick={() => onNavigate('kitchen')}><CalendarDays size={16} /> View kitchen schedule</button>} />
    <div className="prototype-note"><Sparkles size={16} /><span><strong>Sample dashboard</strong> · All figures below are illustrative and are not live order, subscription or payment data.</span><button aria-label="Help about sample data"><CircleHelp size={16} /></button></div>
    <div className="metric-grid">
      <MetricCard title="Total orders today" value="48" change="+12.8%" icon={ShoppingBag} note="vs. yesterday" tone="yellow" />
      <MetricCard title="Breakfast orders" value="29" change="+8.2%" icon={Coffee} note="Today's service" tone="peach" />
      <MetricCard title="Lunch orders" value="19" change="+4.6%" icon={Soup} note="Today's service" tone="green" />
      <MetricCard title="Today's revenue" value="₹18,420" change="+10.4%" icon={BadgeIndianRupee} note="sample paid orders" tone="lavender" />
      <MetricCard title="Active subscriptions" value="36" change="4 upcoming" icon={CalendarDays} note="sample subscriptions" tone="blue" />
    </div>
    <div className="overview-grid">
      <section className="panel status-panel"><div className="panel-heading"><div><h2>Order status</h2><p>Today's sample order flow</p></div><button className="text-button" onClick={() => onNavigate('orders')}>All orders <ArrowRight size={15} /></button></div><div className="status-grid">{[['New', 8], ['Accepted', 11], ['Preparing', 9], ['Ready', 6], ['Out for Delivery', 5], ['Delivered', 7], ['Cancelled', 2]].map(([label, count]) => <div className="status-stat" key={label}><span className="status-dot" data-status={String(label).toLowerCase().replaceAll(' ', '-')} /><strong>{count}</strong><span>{label}</span></div>)}</div><div className="status-foot"><span>48 sample orders</span><span className="status-legend"><i /> Live system not connected</span></div></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates across the kitchen</p></div><button className="icon-button" aria-label="More activity"><Ellipsis size={19} /></button></div><div className="activity-list"><Activity icon={ShoppingBag} tone="activity-yellow" title="New order received" detail="DB-2408 · Ananya Rao" time="8 min ago" /><Activity icon={CalendarDays} tone="activity-green" title="Subscription renewed" detail="Weekly plan · Meera Iyer" time="24 min ago" /><Activity icon={Utensils} tone="activity-lilac" title="Menu item updated" detail="Masala Dosa · ₹140" time="1 hr ago" /><Activity icon={CheckCircle2} tone="activity-blue" title="Order delivered" detail="DB-2401 · Priya Shah" time="1 hr ago" /></div></section>
      <section className="panel prep-panel"><div className="panel-heading"><div><h2>Kitchen preparation</h2><p>Aggregated sample portions · orders + subscriptions</p></div><button className="text-button" onClick={() => onNavigate('kitchen')}>Full schedule <ArrowRight size={15} /></button></div><div className="meal-prep-grid"><PrepList title="Breakfast" icon={Coffee} items={prepBreakfast} /><PrepList title="Lunch" icon={Soup} items={prepLunch} /></div><p className="panel-footnote"><Leaf size={14} /> Quantities are sample estimates and combine one-time orders with subscription deliveries.</p></section>
      <section className="panel delivery-panel"><div className="panel-heading"><div><h2>Upcoming deliveries</h2><p>Next stops in today's sample route</p></div><button className="text-button" onClick={() => onNavigate('deliveries')}>View all <ArrowRight size={15} /></button></div><div className="delivery-list">{deliveriesSeed.slice(0, 3).map((delivery, index) => <div className="delivery-row" key={delivery.id}><div className={`delivery-index index-${index}`}>{index + 1}</div><div className="delivery-info"><strong>{delivery.name}</strong><span>{delivery.id} · {delivery.slot}</span><small><MapPin size={12} /> {delivery.address}</small><small><ShoppingBag size={12} /> {delivery.items}</small></div><StatusPill>{delivery.status}</StatusPill></div>)}</div></section>
    </div>
  </>
}

function MetricCard({ title, value, change, note, icon: Icon, tone }: { title: string; value: string; change: string; note: string; icon: LucideIcon; tone: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{title}</span><div className={`metric-icon ${tone}`}><Icon size={18} /></div></div><div className="metric-value">{value}</div><div className="metric-note"><span className="metric-change"><ArrowUpRight size={13} />{change}</span><span>{note}</span></div></article>
}
function Activity({ icon: Icon, tone, title, detail, time }: { icon: LucideIcon; tone: string; title: string; detail: string; time: string }) {
  return <div className="activity-row"><div className={`activity-icon ${tone}`}><Icon size={15} /></div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>
}
function PrepList({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: { item: string; qty: number; unit: string; source: string }[] }) {
  return <div className="prep-list"><h3><span><Icon size={16} /></span>{title}<b>{items.reduce((sum, item) => sum + item.qty, 0)} portions</b></h3>{items.map((item) => <div className="prep-row" key={item.item}><div><strong>{item.item}</strong><small>{item.source}</small></div><span>{item.qty} <small>{item.unit}</small></span></div>)}</div>
}
function OrdersPage({ orders, query, setQuery, status, setStatus, meal, setMeal, date, setDate, onSelect, onUpdateStatus }: { orders: Order[]; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void; meal: string; setMeal: (value: string) => void; date: string; setDate: (value: string) => void; onSelect: (order: Order) => void; onUpdateStatus: (id: string, status: string) => void }) {
  const visible = (date === todayDate ? orders : []).filter((order) => `${order.id} ${order.customer}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All statuses' || order.status === status) && (meal === 'All meals' || order.slot === meal))
  return <><SectionTitle eyebrow="ORDER MANAGEMENT" title="Orders" description="Review sample one-time orders and make local status updates." action={<button className="button button-primary" onClick={() => window.alert('New order creation is not connected in this prototype.')}><Plus size={16} /> New order</button>} /><div className="prototype-note"><Sparkles size={16} /><span>Sample orders only. Nothing here is fetched from or sent to the backend.</span></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID or customer" /></div><div className="toolbar-filters"><input className="date-filter" type="date" aria-label="Filter orders by date" value={date} onChange={(event) => setDate(event.target.value)} /><select value={meal} onChange={(event) => setMeal(event.target.value)}><option>All meals</option><option>Breakfast</option><option>Lunch</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{orderStatuses.map((value) => <option key={value}>{value}</option>)}</select><button className="button button-secondary filter-button"><Filter size={15} /> Filters</button></div></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>MEAL SLOT</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th>STATUS</th><th></th></tr></thead><tbody>{visible.map((order) => <tr key={order.id}><td><button className="table-link" onClick={() => onSelect(order)}>{order.id}</button><small>Today, 8:32 AM</small></td><td><strong>{order.customer}</strong><small>{order.phone}</small></td><td><span className="meal-tag">{order.slot === 'Breakfast' ? <Coffee size={13} /> : <Soup size={13} />}{order.slot}</span></td><td className="items-cell">{order.items}</td><td className="money-cell">{money(order.total)}</td><td><StatusPill>{order.payment}</StatusPill></td><td><select className="status-select" value={order.status} onChange={(event) => onUpdateStatus(order.id, event.target.value)} aria-label={`Update status for ${order.id}`}>{orderStatuses.map((value) => <option key={value}>{value}</option>)}</select></td><td><button className="icon-button" aria-label={`View ${order.id}`} onClick={() => onSelect(order)}><Eye size={16} /></button></td></tr>)}</tbody></table></div>{visible.length === 0 && <EmptyState title="No matching orders" detail="Try changing your search or filters." />}</div><div className="list-footer">Showing {visible.length} of {orders.length} sample orders <span>Page 1 of 1</span></div></>
}

function SubscriptionsPage() {
  const subscriptions = [
    { name: 'Meera Iyer', type: 'Weekly', dates: 'Nov 16 – Nov 22, 2026', meals: 'Breakfast + Lunch', amount: 2450, state: 'Active', next: 'Nov 20', payment: 'Paid', selectedDates: ['Nov 20', 'Nov 21'], skippedDates: [] },
    { name: 'Ananya Rao', type: 'Monthly', dates: 'Nov 01 – Nov 30, 2026', meals: 'Breakfast', amount: 3600, state: 'Active', next: 'Nov 20', payment: 'Paid', selectedDates: ['Nov 20', 'Nov 21', 'Nov 22'], skippedDates: ['Nov 18'] },
    { name: 'Kavya Menon', type: 'Weekly', dates: 'Nov 23 – Nov 29, 2026', meals: 'Lunch', amount: 1750, state: 'Upcoming', next: 'Nov 23', payment: 'Pending', selectedDates: ['Nov 23', 'Nov 24'], skippedDates: [] },
    { name: 'Rohan Mehta', type: 'Monthly', dates: 'Oct 20 – Nov 19, 2026', meals: 'Breakfast + Lunch', amount: 5200, state: 'Completed', next: '—', payment: 'Paid', selectedDates: ['Nov 18', 'Nov 19'], skippedDates: [] },
    { name: 'Priya Shah', type: 'Weekly', dates: 'Nov 16 – Nov 22, 2026', meals: 'Lunch', amount: 1680, state: 'Paused', next: '—', payment: 'Paid', selectedDates: ['Nov 20'], skippedDates: [] },
  ]
  const [filter, setFilter] = useState('All subscriptions')
  const [selectedSubscription, setSelectedSubscription] = useState<(typeof subscriptions)[number] | null>(null)
  const visible = subscriptions.filter((item) => filter === 'All subscriptions' || item.state === filter)
  return <>
    <SectionTitle eyebrow="RECURRING MEALS" title="Meal Subscriptions" description="A sample view of weekly and monthly meal plans." action={<button className="button button-primary" onClick={() => window.alert('Subscription creation is not connected in this prototype.')}><Plus size={16} /> Add subscription</button>} />
    <div className="prototype-note"><Sparkles size={16} /><span>Sample subscription records. Plan policies, billing and fulfillment are not connected.</span></div>
    <div className="summary-strip"><div><span>Active</span><strong>36</strong></div><div><span>Upcoming</span><strong>8</strong></div><div><span>Paused</span><strong>3</strong></div><div><span>Sample monthly value</span><strong>₹82,400</strong></div></div>
    <div className="panel table-panel">
      <div className="table-toolbar"><div><h2>All subscriptions</h2><p>{visible.length} sample records</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)}>{['All subscriptions', 'Active', 'Upcoming', 'Completed', 'Paused', 'Cancelled'].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>PLAN</th><th>PERIOD</th><th>MEALS</th><th>NEXT DELIVERY</th><th>AMOUNT</th><th>PAYMENT</th><th>STATUS</th><th></th></tr></thead><tbody>{visible.map((item) => <tr key={item.name}><td><strong>{item.name}</strong><small>Subscription sample</small></td><td><span className="plan-tag">{item.type}</span></td><td>{item.dates}</td><td>{item.meals}</td><td>{item.next}</td><td className="money-cell">{money(item.amount)}</td><td><StatusPill>{item.payment}</StatusPill></td><td><StatusPill>{item.state}</StatusPill></td><td><button className="icon-button" aria-label={`View ${item.name} subscription`} onClick={() => setSelectedSubscription(item)}><Eye size={16} /></button></td></tr>)}</tbody></table></div>
    </div>
    <p className="muted-note page-note">Sample skipped dates are shown only as supplied in these records. No refund or credit policy is implied.</p>
    {selectedSubscription && <Modal title={`${selectedSubscription.type} subscription`} onClose={() => setSelectedSubscription(null)}><div className="order-detail"><div className="order-detail-head"><div className="avatar avatar-yellow">{initials(selectedSubscription.name)}</div><div><strong>{selectedSubscription.name}</strong><span>{selectedSubscription.dates}</span></div><StatusPill>{selectedSubscription.state}</StatusPill></div><div className="detail-block"><span>PLAN & PAYMENT</span><p>{selectedSubscription.meals} · {money(selectedSubscription.amount)} · {selectedSubscription.payment}</p></div><div className="detail-block"><span>SELECTED DELIVERY DATES · SAMPLE</span>{selectedSubscription.selectedDates.map((day) => <div className="subscription-day" key={day}><strong>{day}, 2026</strong><span>{selectedSubscription.meals.includes('Breakfast') ? 'Breakfast' : ''}{selectedSubscription.meals.includes('Breakfast') && selectedSubscription.meals.includes('Lunch') ? ' + ' : ''}{selectedSubscription.meals.includes('Lunch') ? 'Lunch' : ''}</span></div>)}</div><div className="detail-block"><span>SKIPPED DATES · SAMPLE</span><p>{selectedSubscription.skippedDates.length ? selectedSubscription.skippedDates.join(', ') : 'None listed in this sample.'}</p></div></div></Modal>}
  </>
}

function KitchenPage({ date, setDate, checked, setChecked }: { date: string; setDate: (value: string) => void; checked: string[]; setChecked: (value: string[]) => void }) {
  const breakfast = [{ name: 'Idli & Sambar', total: 40, orders: 24, subscriptions: 16 }, { name: 'Masala Dosa', total: 22, orders: 14, subscriptions: 8 }, { name: 'Pongal', total: 12, orders: 7, subscriptions: 5 }]
  const lunch = [{ name: 'Veg Meals', total: 25, orders: 15, subscriptions: 10 }, { name: 'Paneer Fried Rice', total: 10, orders: 6, subscriptions: 4 }]
  function renderMeal(title: string, icon: LucideIcon, items: typeof breakfast) {
    const Icon = icon
    return <section className="panel schedule-panel"><div className="schedule-heading"><div className="schedule-icon"><Icon size={19} /></div><div><h2>{title}</h2><p>{items.reduce((sum, item) => sum + item.total, 0)} total portions</p></div><span className="meal-time">{title === 'Breakfast' ? '7:00 – 10:30 AM' : '12:00 – 2:30 PM'}</span></div>{items.map((item) => { const key = `${date}-${title}-${item.name}`; const done = checked.includes(key); return <div className={`schedule-item ${done ? 'schedule-done' : ''}`} key={key}><button className={`check-toggle ${done ? 'checked' : ''}`} aria-label={`${done ? 'Unmark' : 'Mark'} ${item.name} prepared`} onClick={() => setChecked(done ? checked.filter((entry) => entry !== key) : [...checked, key])}>{done && <Check size={14} />}</button><div className="schedule-item-name"><strong>{item.name}</strong><span>{item.orders} one-time orders + {item.subscriptions} subscriptions</span></div><strong className="schedule-quantity">{item.total}<small> portions</small></strong></div>})}<div className="schedule-foot"><ListChecks size={15} /> Preparation progress saved for this session</div></section>
  }
  return <><SectionTitle eyebrow="PREP PLANNING" title="Kitchen Schedule" description="Combined sample preparation quantities by service." action={<label className="date-picker"><CalendarDays size={16} /><input aria-label="Schedule date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>} /><div className="prototype-note"><Sparkles size={16} /><span>Sample quantities combine one-time orders and subscription meals. No real inventory is deducted.</span></div><div className="schedule-summary"><div><span>Schedule date</span><strong>{date}</strong></div><div><span>Total portions</span><strong>109</strong></div><div><span>Preparation checks</span><strong>{checked.filter((item) => item.startsWith(date)).length} / 5</strong></div></div><div className="schedule-grid">{renderMeal('Breakfast', Coffee, breakfast)}{renderMeal('Lunch', Soup, lunch)}</div></>
}

function MenuPage({ items, allItems, categories, query, setQuery, category, setCategory, meal, setMeal, availability, setAvailability, onAdd, onEdit, onDelete, onPreview, onAvailability, onStock, categoryAction, setCategoryName, deleteCategory, moveCategory }: {
  items: MenuItem[]; allItems: MenuItem[]; categories: Category[]; query: string; setQuery: (value: string) => void; category: string; setCategory: (value: string) => void; meal: string; setMeal: (value: string) => void; availability: string; setAvailability: (value: string) => void; onAdd: () => void; onEdit: (item: MenuItem) => void; onDelete: (item: MenuItem) => void; onPreview: (item: MenuItem) => void; onAvailability: (id: string, value: Availability) => void; onStock: (id: string, value: number) => void; categoryAction: (value: { mode: 'add' | 'edit'; category?: Category } | null) => void; setCategoryName: (value: string) => void; deleteCategory: (category: Category) => void; moveCategory: (index: number, direction: -1 | 1) => void;
}) {
  const [tab, setTab] = useState<'items' | 'categories'>('items')
  return <><SectionTitle eyebrow="YOUR FOOD CATALOG" title="Menu Management" description="Manage dishes, availability and stock for your kitchen." action={tab === 'items' ? <button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add food item</button> : <button className="button button-primary" onClick={() => { setCategoryName(''); categoryAction({ mode: 'add' }) }}><Plus size={16} /> Add category</button>} /><div className="prototype-note"><Sparkles size={16} /><span><strong>Local prototype data</strong> · Menu edits and images are saved only in this browser on this device. No order-driven stock deductions.</span></div><div className="menu-tabs"><button className={tab === 'items' ? 'selected' : ''} onClick={() => setTab('items')}><Utensils size={16} /> Food items <span>{allItems.length}</span></button><button className={tab === 'categories' ? 'selected' : ''} onClick={() => setTab('categories')}><Tags size={16} /> Categories <span>{categories.length}</span></button></div>{tab === 'items' ? <><div className="menu-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search food items" /></div><div className="toolbar-filters"><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select><select value={meal} onChange={(event) => setMeal(event.target.value)}><option>All meals</option><option>Breakfast</option><option>Lunch</option></select><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option>All availability</option><option>Available</option><option>Sold Out</option><option>Temporarily Unavailable</option></select><SlidersHorizontal className="filter-glyph" size={17} /></div></div><div className="menu-grid">{items.map((item) => <article className="food-card" key={item.id}>  <div className="food-visual">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className={`food-placeholder food-${categorySlug(item.category)}`}><span>{foodEmoji(item.category)}</span><i>{item.category}</i></div>}<span className={`availability-badge ${item.availability.toLowerCase().replaceAll(' ', '-')}`}><i />{item.availability}</span><button className="food-preview" aria-label={`Preview ${item.name}`} onClick={() => onPreview(item)}><Eye size={15} /></button></div><div className="food-card-body"><div className="food-card-category">{item.category}<span>·</span>{item.meal.join(' & ')}</div><div className="food-name-row"><h3>{item.name}</h3><strong>{money(item.price)}</strong></div><p>{item.description || 'No description provided.'}</p><div className="food-card-meta"><span><Clock3 size={13} /> {item.prepTime} min</span><span className={item.stock <= 10 ? 'low-stock' : ''}><PackageCheck size={13} /> {item.stock} in stock{item.stock > 0 && item.stock <= 10 ? ' · Low' : ''}</span><span className="veg-badge"><i /> Veg</span></div><div className="food-controls"><select aria-label={`Availability for ${item.name}`} value={item.availability} onChange={(event) => onAvailability(item.id, event.target.value as Availability)}><option>Available</option><option>Sold Out</option><option>Temporarily Unavailable</option></select><label className="stock-input"><span>Stock</span><input aria-label={`Stock quantity for ${item.name}`} type="number" min="0" value={item.stock} onChange={(event) => onStock(item.id, Math.max(0, Number(event.target.value)))} /></label><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)}><Trash2 size={15} /></button></div>{item.availability !== 'Available' && <div className="unavailable-reason"><CircleHelp size={13} /> {item.availability === 'Sold Out' ? item.stock === 0 ? 'Marked sold out · stock is zero' : 'Manually marked sold out' : 'Temporarily hidden by manual setting'}</div>}</div></article>)}</div>{items.length === 0 && <EmptyState title="No food items found" detail="Try a different search or add your first menu item." action={<button className="button button-primary" onClick={onAdd}><Plus size={15} /> Add food item</button>} />}<div className="inventory-note"><PackageCheck size={15} /><span>Stock availability is a local prototype control. In a future backend, order confirmation can reduce stock; it does not happen here.</span></div></> : <div className="category-management"><div className="category-intro"><div><h2>Menu categories</h2><p>Reorder categories and keep your menu organised.</p></div><span>Use the arrows to change display order</span></div>{categories.map((entry, index) => { const count = allItems.filter((item) => item.category === entry.name).length; return <div className="category-row" key={entry.id}><div className="category-reorder"><button className="icon-button" aria-label={`Move ${entry.name} up`} disabled={index === 0} onClick={() => moveCategory(index, -1)}><ChevronLeft size={16} /></button><button className="icon-button" aria-label={`Move ${entry.name} down`} disabled={index === categories.length - 1} onClick={() => moveCategory(index, 1)}><ChevronRight size={16} /></button></div><div className="category-symbol"><Tags size={17} /></div><div className="category-copy"><strong>{entry.name}</strong><span>{count} menu {count === 1 ? 'item' : 'items'}</span></div><span className="category-count">{count}</span><button className="icon-button" aria-label={`Rename ${entry.name}`} onClick={() => { setCategoryName(entry.name); categoryAction({ mode: 'edit', category: entry }) }}><Pencil size={15} /></button><button className="icon-button danger-icon" aria-label={`Delete ${entry.name}`} onClick={() => deleteCategory(entry)}><Trash2 size={15} /></button></div>})}<div className="category-help"><CircleHelp size={16} /><span>Categories containing food items cannot be deleted. Reassign or remove those items first to prevent accidental loss.</span></div></div>}</>
}

function ItemDialog({ item, categories, draftImage, removeImage, fileInputRef, onImage, onRemoveImage, onCancel, onSubmit }: { item: MenuItem | null; categories: Category[]; draftImage: { blob: Blob; url: string } | null; removeImage: boolean; fileInputRef: React.RefObject<HTMLInputElement | null>; onImage: (file?: File) => void; onRemoveImage: () => void; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const imageUrl = draftImage?.url ?? (removeImage ? undefined : item?.imageUrl)
  return <Modal title={item ? 'Edit food item' : 'Add food item'} onClose={onCancel} wide><form className="item-form" onSubmit={onSubmit}><div className="image-upload-block"><div className="image-upload-preview">{imageUrl ? <img src={imageUrl} alt="Selected food preview" /> : <div><Utensils size={24} /><span>Food photo</span></div>}</div><div className="image-upload-copy"><strong>Food image</strong><span>JPG, PNG or WebP · up to 5 MB</span><div><button type="button" className="button button-secondary button-small" onClick={() => fileInputRef.current?.click()}>{imageUrl ? 'Replace image' : 'Choose image'}</button>{imageUrl && <button type="button" className="text-button remove-image" onClick={onRemoveImage}>Remove</button>}</div><input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => onImage(event.target.files?.[0])} /><small>Images are stored in this browser only, and are not shared across devices.</small></div></div><div className="form-grid"><label className="field-label">Food name<input name="name" defaultValue={item?.name} required maxLength={70} placeholder="e.g. Masala Dosa" /></label><label className="field-label">Category<select name="category" required defaultValue={item?.category ?? categories[0]?.name}>{categories.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></label><label className="field-label full-field">Description<textarea name="description" rows={3} maxLength={220} defaultValue={item?.description} placeholder="Describe the dish and what makes it special." /></label><label className="field-label">Price (₹)<input name="price" type="number" min="0" step="1" defaultValue={item?.price ?? ''} required placeholder="0" /></label><label className="field-label">Preparation time (minutes)<input name="prepTime" type="number" min="1" max="240" defaultValue={item?.prepTime ?? 15} required /></label><label className="field-label">Stock quantity<input name="stock" type="number" min="0" defaultValue={item?.stock ?? 0} required /></label><label className="field-label">Availability<select name="availability" defaultValue={item?.availability ?? 'Available'}><option>Available</option><option>Sold Out</option><option>Temporarily Unavailable</option></select></label><fieldset className="meal-field full-field"><legend>Available for</legend><label><input name="meal" type="checkbox" value="Breakfast" defaultChecked={item?.meal.includes('Breakfast') ?? false} /> Breakfast</label><label><input name="meal" type="checkbox" value="Lunch" defaultChecked={item?.meal.includes('Lunch') ?? false} /> Lunch</label></fieldset>  <div className="veg-check full-field"><span><i /> Vegetarian menu only</span><small>Every food item in Daily Bite is vegetarian.</small></div></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary"><Check size={16} /> {item ? 'Save changes' : 'Add food item'}</button></div></form></Modal>
}

function DeliveriesPage({ items, filter, setFilter, onStatus }: { items: typeof deliveriesSeed; filter: string; setFilter: (value: string) => void; onStatus: (id: string, status: string) => void }) {
  const [date, setDate] = useState(todayDate)
  const statuses = ['Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Delayed']
  const dateItems = date === todayDate ? items : []
  const visible = dateItems.filter((item) => filter === 'All statuses' || item.status === filter)
  return <><SectionTitle eyebrow="TODAY'S ROUTE" title="Deliveries" description="Review sample drop-offs and update their local status." action={<label className="date-picker"><CalendarDays size={16} /><input type="date" aria-label="Delivery date" value={date} onChange={(event) => setDate(event.target.value)} /></label>} /><div className="prototype-note"><Sparkles size={16} /><span>Sample delivery list only. No delivery staff, route tracking or third-party integration is connected.</span></div><div className="delivery-summary"><div><Truck size={18} /><span>Today's sample drops</span><strong>{dateItems.length}</strong></div><div><PackageCheck size={18} /><span>Ready / in transit</span><strong>{dateItems.filter((item) => item.status === 'Ready' || item.status === 'Out for Delivery').length}</strong></div><div><CheckCircle2 size={18} /><span>Delivered</span><strong>{dateItems.filter((item) => item.status === 'Delivered').length}</strong></div></div><div className="panel table-panel"><div className="table-toolbar"><div><h2>Delivery list</h2><p>Breakfast and lunch service</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>DELIVERY ADDRESS</th><th>SLOT</th><th>STATUS</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id}><td><button className="table-link">{item.id}</button></td><td><strong>{item.name}</strong><small>{item.phone}</small></td><td className="address-cell"><MapPin size={14} />{item.address}</td><td><span className="meal-tag">{item.slot}</span></td><td><select className="status-select" value={item.status} onChange={(event) => onStatus(item.id, event.target.value)} aria-label={`Update ${item.id} delivery status`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>{visible.length === 0 && <EmptyState title="No deliveries in this status" detail="Choose a different date or status filter." />}</div><div className="callout-note"><CircleHelp size={16} /> Status controls are prototype-only and do not notify a customer or delivery partner.</div></>
}

function CustomersPage({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  const customers = [{ name: 'Ananya Rao', phone: '+91 98765 43210', email: 'ananya.rao@example.com', address: '12, Lake View Road, Indiranagar', orders: 18, plan: 'Active' }, { name: 'Rohan Mehta', phone: '+91 98123 45678', email: 'rohan.m@example.com', address: 'Flat 302, Green Park Apartments', orders: 12, plan: 'Active' }, { name: 'Meera Iyer', phone: '+91 99001 12233', email: 'meera.iyer@example.com', address: '44, 2nd Main, Koramangala', orders: 24, plan: 'Active' }, { name: 'Arjun Nair', phone: '+91 98450 67890', email: 'arjun.nair@example.com', address: '8B, Sunrise Residency, HSR Layout', orders: 7, plan: 'None' }, { name: 'Priya Shah', phone: '+91 99887 66554', email: 'priya.shah@example.com', address: '21, Palm Street, Whitefield', orders: 15, plan: 'Paused' }]
  const [planFilter, setPlanFilter] = useState('All subscriptions')
  const visible = customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(query.toLowerCase()) && (planFilter === 'All subscriptions' || (planFilter === 'No subscription' ? customer.plan === 'None' : customer.plan === planFilter)))
  const [selected, setSelected] = useState<(typeof customers)[number] | null>(null)
  const customerOrders = selected ? orders.filter((order) => order.customer === selected.name) : []
  return <><SectionTitle eyebrow="CUSTOMER DIRECTORY" title="Customers" description="A sample directory with order history and saved addresses." action={<button className="button button-secondary" onClick={() => window.alert('Customer data is sample-only and cannot be exported from a backend.')}><ArrowDownRight size={16} /> Export sample</button>} /><div className="prototype-note"><Sparkles size={16} /><span>Sample customer data. Contact details and history are illustrative.</span></div><div className="customer-stats"><div><span>Total customers</span><strong>248</strong><small>sample directory</small></div><div><span>Active subscribers</span><strong>36</strong><small>sample profiles</small></div><div><span>Repeat customers</span><strong>72%</strong><small>illustrative rate</small></div></div><div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, phone or email" /></div><select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}><option>All subscriptions</option><option>Active</option><option>Paused</option><option>No subscription</option></select></div><div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>SAVED ADDRESS</th><th>ORDERS</th><th>SUBSCRIPTION</th><th></th></tr></thead><tbody>{visible.map((customer) => <tr key={customer.name}><td><div className="customer-name"><div className="avatar avatar-yellow">{initials(customer.name)}</div><strong>{customer.name}</strong></div></td><td>{customer.phone}<small>{customer.email}</small></td><td className="address-cell"><MapPin size={14} />{customer.address}</td><td className="money-cell">{customer.orders}</td><td><StatusPill>{customer.plan}</StatusPill></td><td><button className="icon-button" aria-label={`View ${customer.name}`} onClick={() => setSelected(customer)}><Eye size={16} /></button></td></tr>)}</tbody></table></div>{visible.length === 0 && <EmptyState title="No customers found" detail="Try searching for a different customer." />}</div>{selected && <Modal title="Customer profile" onClose={() => setSelected(null)}><div className="order-detail"><div className="order-detail-head"><div className="avatar avatar-yellow">{initials(selected.name)}</div><div><strong>{selected.name}</strong><span>{selected.phone}</span></div><StatusPill>{selected.plan === 'None' ? 'No subscription' : selected.plan}</StatusPill></div><div className="detail-block"><span>EMAIL</span><p>{selected.email}</p></div><div className="detail-block"><span>SAVED ADDRESS</span><p>{selected.address}</p></div><div className="detail-block"><span>ORDER HISTORY · SAMPLE</span>{customerOrders.length ? customerOrders.map((order) => <div className="customer-order-history" key={order.id}><div><strong>{order.id}</strong><span>{order.slot} · {order.items}</span></div><b>{money(order.total)}</b><StatusPill>{order.status}</StatusPill></div>) : <p>No matching sample orders in this snapshot.</p>}</div><p className="muted-note">The records shown here are illustrative, not a complete customer history.</p></div></Modal>}</>
}

function ReportsPage() {
  const [period, setPeriod] = useState('This month')
  const summaries = {
    Today: { total: '₹18,420', successful: '48', pending: '2', failed: '0', oneTime: '₹11,420', subscriptions: '₹7,000' },
    'This week': { total: '₹1,16,480', successful: '312', pending: '7', failed: '3', oneTime: '₹71,920', subscriptions: '₹44,560' },
    'This month': { total: '₹4,82,640', successful: '1,284', pending: '18', failed: '6', oneTime: '₹2,98,440', subscriptions: '₹1,84,200' },
  }
  const summary = summaries[period as keyof typeof summaries]
  const bars = [42, 61, 48, 76, 57, 84, 68, 51, 91, 73, 62, 100]
  return <><SectionTitle eyebrow="BUSINESS SNAPSHOT" title="Payments & Reports" description="Illustrative revenue and payment summaries for the kitchen." action={<select className="range-select" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Today</option><option>This week</option><option>This month</option></select>} /><div className="prototype-note"><Sparkles size={16} /><span>Illustrative report values only. No payment gateway or real transaction data is connected.</span></div><div className="report-metrics"><MetricCard title="Total revenue" value={summary.total} change="Sample data" icon={BadgeIndianRupee} note={period.toLowerCase()} tone="yellow" /><MetricCard title="Successful payments" value={summary.successful} change="Sample count" icon={CheckCircle2} note={period.toLowerCase()} tone="green" /><MetricCard title="Pending payments" value={summary.pending} change="Review sample" icon={Clock3} note="not payment requests" tone="peach" /><MetricCard title="Failed payments" value={summary.failed} change="Sample count" icon={CreditCard} note="illustrative" tone="lavender" /></div><div className="reports-grid"><section className="panel revenue-panel"><div className="panel-heading"><div><h2>Revenue overview</h2><p>Sample revenue · {period}</p></div><div className="revenue-total"><strong>{summary.total}</strong><span><ArrowUpRight size={13} /> illustrative summary</span></div></div><div className="chart-area"><div className="chart-y-labels"><span>₹50k</span><span>₹35k</span><span>₹20k</span><span>₹5k</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-column" key={`${height}-${index}`}><div className={`bar ${index === 11 ? 'bar-current' : ''}`} style={{ height: `${height}%` }} title={`Sample revenue ${index + 1}`} /><small>{['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23'][index]}</small></div>)}</div></div><div className="chart-legend"><span><i /> Sample period</span><span><i /> No live transaction history</span></div></section><section className="panel revenue-split"><div className="panel-heading"><div><h2>Revenue by source</h2><p>Sample {period.toLowerCase()} mix</p></div></div><div className="split-donut"><div><strong>{summary.total}</strong><span>sample revenue</span></div></div><div className="split-legend"><div><i className="legend-yellow" /><span>One-time orders</span><strong>{summary.oneTime}</strong><small>62%</small></div><div><i className="legend-green" /><span>Subscriptions</span><strong>{summary.subscriptions}</strong><small>38%</small></div></div></section><section className="panel popular-panel"><div className="panel-heading"><div><h2>Popular food items</h2><p>Illustrative item ranking</p></div></div>{[['Masala Dosa', '184 orders', '₹25,760'], ['Veg Meals', '162 orders', '₹35,640'], ['Idli & Sambar', '148 orders', '₹13,320'], ['Paneer Fried Rice', '96 orders', '₹18,240']].map(([name, count, sum], index) => <div className="popular-row" key={name}><span className="popular-rank">0{index + 1}</span><div><strong>{name}</strong><small>{count}</small></div><strong>{sum}</strong></div>)}</section><section className="panel payment-source-panel"><div className="panel-heading"><div><h2>Payment summary</h2><p>Sample transactions · {period.toLowerCase()}</p></div></div><div className="payment-line"><span><i className="payment-dot paid" />Successful</span><strong>{summary.successful}</strong><b>98.2%</b></div><div className="payment-track"><i style={{ width: '98.2%' }} /></div><div className="payment-line"><span><i className="payment-dot pending" />Pending</span><strong>{summary.pending}</strong><b>1.4%</b></div><div className="payment-track"><i className="track-pending" style={{ width: '18%' }} /></div><div className="payment-line"><span><i className="payment-dot failed" />Failed</span><strong>{summary.failed}</strong><b>0.4%</b></div><div className="payment-track"><i className="track-failed" style={{ width: '8%' }} /></div><p className="muted-note">No payment actions are available from this sample report.</p></section></div></>
}

function SettingsPage({ values, onSave, saved }: { values: SettingsValues; onSave: (values: SettingsValues) => void; saved: boolean }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))
    next.kitchenOpen = form.has('kitchenOpen') ? 'on' : 'off'
    next.temporaryClosure = form.has('temporaryClosure') ? 'on' : 'off'
    onSave(next)
  }
  return <><SectionTitle eyebrow="KITCHEN CONFIGURATION" title="Settings" description="Editable sample values for your kitchen setup." action={<button className="button button-primary" type="submit" form="settings-form"><Check size={16} /> Save settings</button>} /><div className="prototype-note"><CircleHelp size={16} /><span>These are configurable sample values only; they are not confirmed business policies and are not connected to a backend.</span></div>{saved && <div className="settings-saved"><CheckCircle2 size={17} /> Sample settings saved for this session.</div>}<form id="settings-form" onSubmit={submit}><div className="settings-grid"><section className="panel settings-panel"><div className="settings-panel-heading"><div className="settings-panel-icon"><Clock3 size={18} /></div><div><h2>Operating hours</h2><p>Set kitchen service windows</p></div></div><div className="settings-field-row"><label className="field-label">Breakfast opens<input name="breakfastOpen" type="time" defaultValue={values.breakfastOpen} /></label><label className="field-label">Breakfast closes<input name="breakfastClose" type="time" defaultValue={values.breakfastClose} /></label></div><div className="settings-field-row"><label className="field-label">Lunch opens<input name="lunchOpen" type="time" defaultValue={values.lunchOpen} /></label><label className="field-label">Lunch closes<input name="lunchClose" type="time" defaultValue={values.lunchClose} /></label></div><label className="toggle-row"><span><strong>Kitchen currently open</strong><small>Sample operating availability</small></span><input name="kitchenOpen" type="checkbox" defaultChecked={values.kitchenOpen === 'on'} /></label></section><section className="panel settings-panel"><div className="settings-panel-heading"><div className="settings-panel-icon"><Truck size={18} /></div><div><h2>Delivery setup</h2><p>Sample fees and service coverage</p></div></div><label className="field-label">Delivery charge (₹)<input name="deliveryCharge" type="number" min="0" defaultValue={values.deliveryCharge} /></label><label className="field-label">Service area<input name="serviceArea" defaultValue={values.serviceArea} /></label><label className="field-label">Maximum delivery radius (km)<input name="deliveryRadius" type="number" min="1" defaultValue={values.deliveryRadius} /></label><small className="field-help">Delivery is restricted to the configured service area. Confirm actual zones before accepting orders.</small></section><section className="panel settings-panel"><div className="settings-panel-heading"><div className="settings-panel-icon"><ShoppingBag size={18} /></div><div><h2>Order cut-off times</h2><p>Sample lead times for meal services</p></div></div><div className="settings-field-row"><label className="field-label">Breakfast orders close<input name="breakfastCutoff" type="time" defaultValue={values.breakfastCutoff} /></label><label className="field-label">Lunch orders close<input name="lunchCutoff" type="time" defaultValue={values.lunchCutoff} /></label></div><label className="field-label">Temporary closure message<input name="closureMessage" defaultValue={values.closureMessage} /></label><label className="toggle-row"><span><strong>Temporarily close kitchen</strong><small>Sample setting; no live orders are affected</small></span><input name="temporaryClosure" type="checkbox" defaultChecked={values.temporaryClosure === 'on'} /></label></section><section className="panel settings-panel"><div className="settings-panel-heading"><div className="settings-panel-icon"><Utensils size={18} /></div><div><h2>Business information</h2><p>Displayed details for the kitchen</p></div></div><label className="field-label">Business name<input name="businessName" defaultValue={values.businessName} /></label><label className="field-label">Contact email<input name="contactEmail" type="email" defaultValue={values.contactEmail} /></label><label className="field-label">Business phone<input name="businessPhone" type="tel" defaultValue={values.businessPhone} /></label></section></div></form></>
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><div><Search size={20} /></div><strong>{title}</strong><p>{detail}</p>{action}</div>
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</section></div>
}

function foodEmoji(category: string) {
  if (category.toLowerCase().includes('south')) return '🥣'
  if (category.toLowerCase().includes('north')) return '🍛'
  if (category.toLowerCase().includes('chinese')) return '🍜'
  if (category.toLowerCase().includes('chaat')) return '🥗'
  if (category.toLowerCase().includes('drink')) return '☕'
  return '🥘'
}
function categorySlug(category: string) { return category.toLowerCase().replaceAll(' ', '-') }
function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() }

export default App
