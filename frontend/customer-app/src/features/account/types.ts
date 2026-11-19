export type AddressLabel = 'Home' | 'Work' | 'Other'

export type AddressCoverageStatus = 'current-selection' | 'unverified' | 'unsupported'

export interface SavedAddress {
  id: string
  label: AddressLabel
  recipientName: string
  mobileNumber: string
  houseFlat: string
  streetArea: string
  landmark: string
  city: string
  state: string
  pinCode: string
  isDefault: boolean
  coverageStatus: AddressCoverageStatus
}

export interface CustomerProfile {
  fullName: string
  mobileNumber: string
  emailAddress: string
  photoDataUrl: string
}

export interface NotificationPreferences {
  orderStatus: boolean
  deliveryUpdates: boolean
  mealPlanReminders: boolean
  subscriptionDeliveries: boolean
  promotionalOffers: boolean
}

export const initialProfile: CustomerProfile = {
  fullName: '',
  mobileNumber: '',
  emailAddress: '',
  photoDataUrl: '',
}

export const initialAddresses: SavedAddress[] = [
  {
    id: 'existing-home',
    label: 'Home',
    recipientName: '',
    mobileNumber: '',
    houseFlat: '',
    streetArea: 'Semabakkam',
    landmark: '',
    city: 'Chennai',
    state: '',
    pinCode: '',
    isDefault: true,
    coverageStatus: 'current-selection',
  },
  {
    id: 'existing-work',
    label: 'Work',
    recipientName: '',
    mobileNumber: '',
    houseFlat: '',
    streetArea: 'Tambaram',
    landmark: '',
    city: 'Chennai',
    state: '',
    pinCode: '',
    isDefault: false,
    coverageStatus: 'unverified',
  },
]

export const initialNotificationPreferences: NotificationPreferences = {
  orderStatus: true,
  deliveryUpdates: true,
  mealPlanReminders: true,
  subscriptionDeliveries: true,
  promotionalOffers: false,
}

export function formatSavedAddress(address: SavedAddress) {
  return [
    address.houseFlat,
    address.streetArea,
    address.landmark,
    address.city,
    address.state,
    address.pinCode,
  ]
    .filter(Boolean)
    .join(', ')
}
