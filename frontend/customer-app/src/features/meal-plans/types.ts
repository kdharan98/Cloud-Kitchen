import type { MenuItem } from '../../types/menu'

export type PlanDuration = 'weekly' | 'monthly'
export type MealType = 'breakfast' | 'lunch'
export type MealPlanStep =
  | 'duration'
  | 'preferences'
  | 'start-date'
  | 'delivery-dates'
  | 'customise'
  | 'review'
  | 'payment'

export interface MealPlanDraft {
  step: MealPlanStep
  duration: PlanDuration | null
  mealTypes: MealType[]
  startDate: string
  deliveryDates: string[]
  mealsByDate: Record<string, Partial<Record<MealType, string>>>
  repeatMealTypes: MealType[]
  repeatReferenceDates: Partial<Record<MealType, string>>
}

export type MealSelections = Partial<Record<MealType, MenuItem>>
