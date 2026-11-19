import {
  ArrowLeft,
  Bell,
  Briefcase,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  House,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Shield,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { deliveryCoverageConfig } from './deliveryCoverage'
import {
  formatSavedAddress,
  type AddressLabel,
  type CustomerProfile,
  type NotificationPreferences,
  type SavedAddress,
} from './types'
import './account.css'

type AccountScreen =
  | 'dashboard'
  | 'profile'
  | 'addresses'
  | 'address-form'
  | 'notifications'
  | 'support'
  | 'terms'

interface AccountPageProps {
  profile: CustomerProfile
  addresses: SavedAddress[]
  selectedAddressId: string
  notifications: NotificationPreferences
  onProfileChange: (profile: CustomerProfile) => void
  onNotificationsChange: (preferences: NotificationPreferences) => void
  onAddressesChange: (addresses: SavedAddress[]) => void
  onSelectAddress: (address: SavedAddress | null) => void
  onNavigateHistory: (item: 'Orders' | 'Meal Plans') => void
}

interface AddressDraft {
  label: AddressLabel
  recipientName: string
  mobileNumber: string
  houseFlat: string
  streetArea: string
  landmark: string
  city: string
  state: string
  pinCode: string
}

const emptyAddressDraft: AddressDraft = {
  label: 'Home',
  recipientName: '',
  mobileNumber: '',
  houseFlat: '',
  streetArea: '',
  landmark: '',
  city: '',
  state: '',
  pinCode: '',
}

const notificationOptions: Array<{
  key: keyof NotificationPreferences
  label: string
  description: string
}> = [
  { key: 'orderStatus', label: 'Order status updates', description: 'Updates as an order moves through its stages.' },
  { key: 'deliveryUpdates', label: 'Delivery updates', description: 'Reminders and changes for a delivery in progress.' },
  { key: 'mealPlanReminders', label: 'Meal plan reminders', description: 'Reminders about your upcoming subscription days.' },
  { key: 'subscriptionDeliveries', label: 'Subscription delivery notifications', description: 'Updates for scheduled meal plan deliveries.' },
  { key: 'promotionalOffers', label: 'Promotional offers', description: 'Occasional offers and Daily Bite announcements.' },
]

const faqs = [
  {
    question: 'How do I place a food order?',
    answer: 'Browse the menu, add dishes to your cart, and continue to checkout to review your delivery details. Online payments are not connected in this preview, so an order cannot be confirmed yet.',
  },
  {
    question: 'How do Daily Bite meal subscriptions work?',
    answer: 'Choose a weekly or monthly plan, select delivery days, and customise breakfast and lunch. Subscription payment and activation are not connected in this preview.',
  },
  {
    question: 'How can I skip an upcoming subscription delivery?',
    answer: 'Subscription management is not connected yet. The My Meal Plans page will show subscription details when that feature is available.',
  },
  {
    question: 'How can I change my delivery address?',
    answer: 'Use the delivery location control or manage saved addresses in Account. New address coverage cannot be verified in this preview.',
  },
  {
    question: 'How do I view my previous orders?',
    answer: 'Open Orders from the bottom navigation to view order history when order records are available.',
  },
  {
    question: 'What should I do if my order is delayed?',
    answer: 'Order tracking and support contact details are not connected yet. Please check the Orders page for available order information.',
  },
  {
    question: 'How can I contact customer support?',
    answer: 'WhatsApp, phone, and email support details will be added when provided by the business owner.',
  },
]

function AccountPage({
  profile,
  addresses,
  selectedAddressId,
  notifications,
  onProfileChange,
  onNotificationsChange,
  onAddressesChange,
  onSelectAddress,
  onNavigateHistory,
}: AccountPageProps) {
  const [screen, setScreen] = useState<AccountScreen>('dashboard')
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutMessage, setLogoutMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  function startAddressForm(address?: SavedAddress) {
    setEditingAddressId(address?.id ?? null)
    setStatusMessage('')
    setScreen('address-form')
  }

  function goToDashboard() {
    setScreen('dashboard')
    setEditingAddressId(null)
    setStatusMessage('')
  }

  function setDefaultAddress(addressId: string) {
    const updated = addresses.map((address) => ({ ...address, isDefault: address.id === addressId }))
    const target = updated.find((address) => address.id === addressId)
    onAddressesChange(updated)
    if (target?.coverageStatus === 'current-selection') {
      onSelectAddress(target)
      setStatusMessage(`${target.label} is now your default delivery address.`)
    } else {
      setStatusMessage(
        'Default address updated. Coverage is unverified, so this address cannot be selected for checkout.',
      )
    }
  }

  function deleteAddress(addressId: string) {
    const removed = addresses.find((address) => address.id === addressId)
    const remaining = addresses.filter((address) => address.id !== addressId)
    if (removed?.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true }
    }
    onAddressesChange(remaining)
    if (removed?.id === selectedAddressId) {
      const currentAddress = remaining.find(
        (address) => address.coverageStatus === 'current-selection',
      )
      onSelectAddress(currentAddress ?? null)
    }
    setStatusMessage('Address removed from this device.')
  }

  const screenTitles: Record<Exclude<AccountScreen, 'dashboard'>, string> = {
    profile: 'Personal Information',
    addresses: 'Saved Addresses',
    'address-form': editingAddressId ? 'Edit address' : 'Add address',
    notifications: 'Notifications',
    support: 'Help & Support',
    terms: 'Terms & Privacy',
  }

  return (
    <section aria-label="Account" className="account-page">
      {screen === 'dashboard' ? (
        <AccountDashboard
          profile={profile}
          logoutMessage={logoutMessage}
          onEditProfile={() => setScreen('profile')}
          onNavigateHistory={onNavigateHistory}
          onNavigateSettings={setScreen}
          onLogout={() => setLogoutOpen(true)}
        />
      ) : (
        <div className="account-subpage">
          <div className="account-subpage-heading">
            <button
              aria-label="Back to My Account"
              className="account-back-button"
              onClick={goToDashboard}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={18} />
            </button>
            <h1>{screenTitles[screen]}</h1>
          </div>

          {screen === 'profile' && (
            <ProfileForm
              profile={profile}
              onCancel={goToDashboard}
              onSave={(updatedProfile) => {
                onProfileChange(updatedProfile)
                setStatusMessage('Saved on this device only. Account sync is not connected.')
              }}
            />
          )}
          {screen === 'addresses' && (
            <AddressList
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              statusMessage={statusMessage}
              onAdd={() => startAddressForm()}
              onDelete={deleteAddress}
              onEdit={startAddressForm}
              onSelect={(address) => {
                onSelectAddress(address)
                setStatusMessage(`${address.label} selected for delivery in this preview.`)
              }}
              onSetDefault={setDefaultAddress}
            />
          )}
          {screen === 'address-form' && (
            <AddressForm
              address={addresses.find((address) => address.id === editingAddressId)}
              onCancel={() => setScreen('addresses')}
              onSave={(draft) => {
                const current = addresses.find((address) => address.id === editingAddressId)
                const savedAddress: SavedAddress = {
                  ...draft,
                  id: current?.id ?? `address-${Date.now()}`,
                  isDefault: current?.isDefault ?? addresses.length === 0,
                  coverageStatus: 'unverified',
                }
                const updated = current
                  ? addresses.map((address) =>
                      address.id === current.id ? savedAddress : address,
                    )
                  : [...addresses, savedAddress]
                onAddressesChange(updated)
                if (current?.id === selectedAddressId) onSelectAddress(null)
                setStatusMessage(
                  `Address saved on this device. ${deliveryCoverageConfig.unavailableMessage} It can't be selected for checkout until verified.`,
                )
                setScreen('addresses')
              }}
            />
          )}
          {screen === 'notifications' && (
            <NotificationSettings
              preferences={notifications}
              statusMessage={statusMessage}
              onChange={(preferences) => {
                onNotificationsChange(preferences)
                setStatusMessage('Preference saved for this app session only.')
              }}
            />
          )}
          {screen === 'support' && <SupportPage />}
          {screen === 'terms' && <TermsPage />}
        </div>
      )}

      {logoutOpen && (
        <div className="account-dialog-backdrop">
          <section
            aria-labelledby="account-logout-title"
            aria-modal="true"
            className="account-dialog"
            role="dialog"
          >
            <div className="account-dialog-icon"><LogOut aria-hidden="true" size={21} /></div>
            <h2 id="account-logout-title">Log out?</h2>
            <p>Are you sure you want to log out?</p>
            <small>Authentication is not connected. Continuing will not end a real session.</small>
            <div className="account-dialog-actions">
              <button onClick={() => setLogoutOpen(false)} type="button">Cancel</button>
              <button
                onClick={() => {
                  setLogoutOpen(false)
                  setLogoutMessage('Authentication is not connected. No one was logged out.')
                }}
                type="button"
              >
                Log Out
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function AccountDashboard({
  profile,
  logoutMessage,
  onEditProfile,
  onNavigateHistory,
  onNavigateSettings,
  onLogout,
}: {
  profile: CustomerProfile
  logoutMessage: string
  onEditProfile: () => void
  onNavigateHistory: (item: 'Orders' | 'Meal Plans') => void
  onNavigateSettings: (screen: AccountScreen) => void
  onLogout: () => void
}) {
  const settings: Array<{
    title: string
    description: string
    Icon: LucideIcon
    screen: AccountScreen
  }> = [
    { title: 'Saved Addresses', description: 'Manage your delivery locations.', Icon: MapPin, screen: 'addresses' },
    { title: 'Personal Information', description: 'Name, mobile, email and profile picture.', Icon: UserRound, screen: 'profile' },
    { title: 'Notifications', description: 'Choose the updates you want to see.', Icon: Bell, screen: 'notifications' },
    { title: 'Help & Support', description: 'FAQs and ways to get help.', Icon: CircleHelp, screen: 'support' },
    { title: 'Terms & Privacy', description: 'Read the current draft documents.', Icon: FileText, screen: 'terms' },
  ]

  return (
    <>
      <div className="account-page-heading">
        <span className="account-eyebrow">YOUR PROFILE</span>
        <h1>My Account</h1>
      </div>

      <button className="account-profile-card" onClick={onEditProfile} type="button">
        <ProfileAvatar profile={profile} />
        <span className="account-profile-copy">
          <strong>{profile.fullName || 'Your name'}</strong>
          <span>{profile.mobileNumber || 'Mobile number not added'}</span>
          <span>{profile.emailAddress || 'Email address not added'}</span>
          <small>Manage your personal information · Demo profile, local only</small>
        </span>
        <Pencil aria-hidden="true" className="account-profile-edit" size={16} />
      </button>

      <section className="account-activity-section">
        <h2>Your activity</h2>
        <div className="account-activity-grid">
          <ActivityCard
            Icon={ShoppingBag}
            title="My Orders"
            description="View food orders"
            onClick={() => onNavigateHistory('Orders')}
          />
          <ActivityCard
            Icon={CalendarDays}
            title="My Meal Plans"
            description="Manage subscriptions"
            onClick={() => onNavigateHistory('Meal Plans')}
          />
        </div>
      </section>

      <section className="account-settings-section">
        <h2>Account settings</h2>
        <div className="account-settings-list">
          {settings.map(({ title, description, Icon, screen }) => (
            <SettingsRow
              key={title}
              Icon={Icon}
              title={title}
              description={description}
              onClick={() => onNavigateSettings(screen)}
            />
          ))}
        </div>
      </section>

      <button className="account-logout-button" onClick={onLogout} type="button">
        <LogOut aria-hidden="true" size={17} />
        <span>Log out</span>
        <ChevronRight aria-hidden="true" size={16} />
      </button>
      {logoutMessage && <p className="account-inline-notice" role="status">{logoutMessage}</p>}
      <p className="account-version">Daily Bite · Version 1.0</p>
    </>
  )
}

function ProfileAvatar({ profile }: { profile: CustomerProfile }) {
  return (
    <span className="account-avatar">
      {profile.photoDataUrl ? (
        <img alt="" src={profile.photoDataUrl} />
      ) : (
        <UserRound aria-hidden="true" size={25} />
      )}
    </span>
  )
}

function ActivityCard({
  Icon,
  title,
  description,
  onClick,
}: {
  Icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button className="account-activity-card" onClick={onClick} type="button">
      <span className="account-activity-icon"><Icon aria-hidden="true" size={19} /></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <ChevronRight aria-hidden="true" size={16} />
    </button>
  )
}

function SettingsRow({
  Icon,
  title,
  description,
  onClick,
}: {
  Icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button className="account-settings-row" onClick={onClick} type="button">
      <span className="account-settings-icon"><Icon aria-hidden="true" size={18} /></span>
      <span className="account-settings-copy"><strong>{title}</strong><small>{description}</small></span>
      <ChevronRight aria-hidden="true" size={16} />
    </button>
  )
}

function ProfileForm({
  profile,
  onSave,
  onCancel,
}: {
  profile: CustomerProfile
  onSave: (profile: CustomerProfile) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(profile)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')

  function updateField(key: keyof CustomerProfile, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setStatus('')
  }

  function save() {
    const nextErrors: Record<string, string> = {}
    if (!draft.fullName.trim()) nextErrors.fullName = 'Enter your full name.'
    if (draft.mobileNumber && !/^\+?[\d\s()-]{7,20}$/.test(draft.mobileNumber.trim())) {
      nextErrors.mobileNumber = 'Enter a valid phone number.'
    }
    if (draft.emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.emailAddress.trim())) {
      nextErrors.emailAddress = 'Enter a valid email address.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave({ ...draft, fullName: draft.fullName.trim() })
    setStatus('Saved on this device only. Account sync is not connected.')
  }

  function readProfilePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((current) => ({ ...current, photoDataUrl: 'Choose an image file.' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') updateField('photoDataUrl', reader.result)
    }
    reader.onerror = () => {
      setErrors((current) => ({ ...current, photoDataUrl: 'The image could not be read.' }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="account-form-page">
      <div className="account-photo-picker">
        <ProfileAvatar profile={draft} />
        <label htmlFor="account-profile-photo">
          <Camera aria-hidden="true" size={14} /> Change photo
        </label>
        <input
          accept="image/*"
          id="account-profile-photo"
          onChange={(event) => readProfilePhoto(event.currentTarget.files?.[0])}
          type="file"
        />
      </div>
      {errors.photoDataUrl && <p className="account-field-error" role="alert">{errors.photoDataUrl}</p>}
      <FormField
        error={errors.fullName}
        label="Full name"
        onChange={(value) => updateField('fullName', value)}
        value={draft.fullName}
      />
      <FormField
        error={errors.mobileNumber}
        label="Mobile number"
        onChange={(value) => updateField('mobileNumber', value)}
        type="tel"
        value={draft.mobileNumber}
      />
      <FormField
        error={errors.emailAddress}
        label="Email address"
        onChange={(value) => updateField('emailAddress', value)}
        type="email"
        value={draft.emailAddress}
      />
      <p className="account-local-note">Profile changes are saved in this app session only. Authentication and account sync are not connected.</p>
      {status && <p className="account-inline-notice" role="status">{status}</p>}
      <div className="account-form-actions">
        <button className="account-secondary-button" onClick={onCancel} type="button">Cancel</button>
        <button className="account-primary-button" onClick={save} type="button">Save Changes</button>
      </div>
    </div>
  )
}

function AddressList({
  addresses,
  selectedAddressId,
  statusMessage,
  onAdd,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
}: {
  addresses: SavedAddress[]
  selectedAddressId: string
  statusMessage: string
  onAdd: () => void
  onEdit: (address: SavedAddress) => void
  onDelete: (addressId: string) => void
  onSetDefault: (addressId: string) => void
  onSelect: (address: SavedAddress) => void
}) {
  return (
    <div className="account-address-page">
      <div className="account-coverage-note" role="status">
        <MapPin aria-hidden="true" size={17} />
        <span>
          {deliveryCoverageConfig.unavailableMessage} New or edited addresses stay unavailable for checkout until verified.
        </span>
      </div>
      <button className="account-add-address-button" onClick={onAdd} type="button">
        <Plus aria-hidden="true" size={17} /> Add new address
      </button>
      {statusMessage && <p className="account-inline-notice" role="status">{statusMessage}</p>}
      {addresses.length === 0 ? (
        <div className="account-no-addresses">
          <MapPin aria-hidden="true" size={25} />
          <strong>No saved addresses</strong>
          <span>Add an address to keep it on this device.</span>
        </div>
      ) : (
        <div className="account-address-list">
          {addresses.map((address) => {
            const canSelect = address.coverageStatus === 'current-selection'
            const formatted = formatSavedAddress(address) || 'Address details not provided'
            return (
              <article className="account-address-card" key={address.id}>
                <div className="account-address-card-top">
                  <span className="account-address-label">
                    {address.label === 'Home' ? <House size={15} /> : address.label === 'Work' ? <Briefcase size={15} /> : <MapPin size={15} />}
                    {address.label}
                  </span>
                  {address.isDefault && <span className="account-default-badge"><Star size={12} /> Default</span>}
                </div>
                <strong className="account-address-recipient">{address.recipientName || 'Recipient name not added'}</strong>
                <span className="account-address-phone">{address.mobileNumber || 'Mobile number not added'}</span>
                <p>{formatted}</p>
                <span className={`account-coverage-status${canSelect ? ' is-current' : ''}`}>
                  {canSelect
                    ? 'Current app-selected location · coverage not verified'
                    : address.coverageStatus === 'unsupported'
                      ? deliveryCoverageConfig.blockedMessage
                      : 'Coverage unverified · not selectable for checkout'}
                </span>
                <div className="account-address-actions">
                  <button
                    disabled={!canSelect}
                    onClick={() => onSelect(address)}
                    type="button"
                  >
                    {selectedAddressId === address.id ? <Check size={14} /> : <MapPin size={14} />}
                    {selectedAddressId === address.id ? 'Selected for delivery' : 'Select for delivery'}
                  </button>
                  {!address.isDefault && (
                    <button onClick={() => onSetDefault(address.id)} type="button">Set default</button>
                  )}
                  <button aria-label={`Edit ${address.label} address`} onClick={() => onEdit(address)} type="button">
                    <Pencil size={14} /> Edit
                  </button>
                  <button aria-label={`Delete ${address.label} address`} onClick={() => onDelete(address.id)} type="button">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddressForm({
  address,
  onSave,
  onCancel,
}: {
  address?: SavedAddress
  onSave: (draft: AddressDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<AddressDraft>(
    address
      ? {
          label: address.label,
          recipientName: address.recipientName,
          mobileNumber: address.mobileNumber,
          houseFlat: address.houseFlat,
          streetArea: address.streetArea,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          pinCode: address.pinCode,
        }
      : emptyAddressDraft,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [coverageNotice, setCoverageNotice] = useState('')

  function updateField(key: keyof AddressDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
    setCoverageNotice('')
  }

  function save() {
    const nextErrors: Record<string, string> = {}
    const requiredFields: Array<keyof AddressDraft> = [
      'recipientName',
      'mobileNumber',
      'houseFlat',
      'streetArea',
      'city',
      'state',
      'pinCode',
    ]
    requiredFields.forEach((field) => {
      if (!draft[field].trim()) nextErrors[field] = 'This field is required.'
    })
    if (draft.mobileNumber && !/^\+?[\d\s()-]{7,20}$/.test(draft.mobileNumber.trim())) {
      nextErrors.mobileNumber = 'Enter a valid phone number.'
    }
    if (draft.pinCode && !/^\d{6}$/.test(draft.pinCode.trim())) {
      nextErrors.pinCode = 'Enter a 6-digit PIN code.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setCoverageNotice(deliveryCoverageConfig.unavailableMessage)
    onSave(draft)
  }

  return (
    <div className="account-form-page">
      <label className="account-field">
        <span>Address label</span>
        <select
          onChange={(event) => updateField('label', event.currentTarget.value as AddressLabel)}
          value={draft.label}
        >
          <option value="Home">Home</option>
          <option value="Work">Work</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <FormField error={errors.recipientName} label="Recipient name" onChange={(value) => updateField('recipientName', value)} value={draft.recipientName} />
      <FormField error={errors.mobileNumber} label="Mobile number" onChange={(value) => updateField('mobileNumber', value)} type="tel" value={draft.mobileNumber} />
      <FormField error={errors.houseFlat} label="House / flat number" onChange={(value) => updateField('houseFlat', value)} value={draft.houseFlat} />
      <FormField error={errors.streetArea} label="Street or area" onChange={(value) => updateField('streetArea', value)} value={draft.streetArea} />
      <FormField label="Landmark (optional)" onChange={(value) => updateField('landmark', value)} value={draft.landmark} />
      <div className="account-form-columns">
        <FormField error={errors.city} label="City" onChange={(value) => updateField('city', value)} value={draft.city} />
        <FormField error={errors.state} label="State" onChange={(value) => updateField('state', value)} value={draft.state} />
      </div>
      <FormField error={errors.pinCode} label="PIN code" onChange={(value) => updateField('pinCode', value)} inputMode="numeric" value={draft.pinCode} />
      <div className="account-coverage-note" role="status">
        <MapPin aria-hidden="true" size={17} />
        <span>{coverageNotice || `${deliveryCoverageConfig.unavailableMessage} This address will be saved but cannot be selected for checkout yet.`}</span>
      </div>
      <p className="account-local-note">Address changes are kept in this app session only.</p>
      <div className="account-form-actions">
        <button className="account-secondary-button" onClick={onCancel} type="button">Cancel</button>
        <button className="account-primary-button" onClick={save} type="button">Save Address</button>
      </div>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'
}) {
  const id = `account-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label className="account-field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        id={id}
        inputMode={inputMode}
        onChange={(event) => onChange(event.currentTarget.value)}
        type={type}
        value={value}
      />
      {error && <small className="account-field-error" role="alert">{error}</small>}
    </label>
  )
}

function NotificationSettings({
  preferences,
  statusMessage,
  onChange,
}: {
  preferences: NotificationPreferences
  statusMessage: string
  onChange: (preferences: NotificationPreferences) => void
}) {
  return (
    <div className="account-notification-page">
      <p className="account-local-note">These preferences are saved in this app session. Push notifications and SMS are not connected.</p>
      {statusMessage && <p className="account-inline-notice" role="status">{statusMessage}</p>}
      <div className="account-notification-list">
        {notificationOptions.map(({ key, label, description }) => (
          <div className="account-notification-row" key={key}>
            <span><strong>{label}</strong><small>{description}</small></span>
            <button
              aria-checked={preferences[key]}
              aria-label={label}
              className={`account-toggle${preferences[key] ? ' is-on' : ''}`}
              onClick={() => onChange({ ...preferences, [key]: !preferences[key] })}
              role="switch"
              type="button"
            >
              <span />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  return (
    <div className="account-support-page">
      <section className="account-support-section">
        <h2>Frequently asked questions</h2>
        <div className="account-faq-list">
          {faqs.map(({ question, answer }) => {
            const expanded = expandedFaq === question
            return (
              <div className="account-faq-item" key={question}>
                <button
                  aria-expanded={expanded}
                  onClick={() => setExpandedFaq(expanded ? null : question)}
                  type="button"
                >
                  <span>{question}</span>
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
                {expanded && <p>{answer}</p>}
              </div>
            )
          })}
        </div>
      </section>
      <section className="account-support-section">
        <h2>Contact Support</h2>
        <p className="account-local-note">Contact details will be available soon.</p>
        <div className="account-contact-list">
          <ContactOption Icon={MessageCircle} title="WhatsApp support" />
          <ContactOption Icon={Phone} title="Phone support" />
          <ContactOption Icon={Mail} title="Email support" />
        </div>
      </section>
    </div>
  )
}

function ContactOption({ Icon, title }: { Icon: LucideIcon; title: string }) {
  return (
    <div className="account-contact-option">
      <Icon aria-hidden="true" size={18} />
      <strong>{title}</strong>
      <span>Coming soon</span>
    </div>
  )
}

function TermsPage() {
  return (
    <div className="account-legal-page">
      <div className="account-draft-banner">
        <Shield aria-hidden="true" size={18} />
        <span>Draft content only · Not approved legal documentation</span>
      </div>
      <article className="account-legal-section">
        <h2>Terms and Conditions</h2>
        <p>Draft placeholder. Official Daily Bite terms and conditions are pending review and publication by the business owner.</p>
      </article>
      <article className="account-legal-section">
        <h2>Privacy Policy</h2>
        <p>Draft placeholder. The official privacy policy, including details about data handling, is pending review and publication by the business owner.</p>
      </article>
    </div>
  )
}

export default AccountPage
