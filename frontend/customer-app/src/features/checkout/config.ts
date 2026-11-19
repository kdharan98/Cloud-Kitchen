import type { MenuMealType } from '../../types/menu'

export const checkoutConfig = {
  deliverySlots: {
    breakfast: ['7:00 AM – 8:00 AM', '8:00 AM – 9:00 AM', '9:00 AM – 10:00 AM'],
    lunch: ['12:00 PM – 1:00 PM', '1:00 PM – 2:00 PM', '2:00 PM – 3:00 PM'],
  } satisfies Record<MenuMealType, string[]>,
  deliveryCharge: null as number | null,
}
