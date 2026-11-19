export const mealPlanConfig = {
  durations: {
    weekly: 7,
    monthly: 30,
  },
  availability: {
    // Preview defaults only; replace with kitchen scheduling rules when available.
    availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
    unavailableDates: [] as string[],
    minimumDaysNotice: 1,
  },
  deliveryFee: null as number | null,
  paymentGatewayAvailable: false,
  skipDelivery: {
    cutoffHoursBeforeDelivery: null as number | null,
    creditPolicyConfigured: false,
  },
} as const
