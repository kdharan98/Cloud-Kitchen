import { mealPlanConfig } from './config'
import type { PlanDuration } from './types'

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addCalendarDays(date: Date, count: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

export function getPlanEndDate(startDate: string, duration: PlanDuration): Date {
  return addCalendarDays(
    fromDateKey(startDate),
    mealPlanConfig.durations[duration] - 1,
  )
}

export function isAvailableDeliveryDate(date: Date): boolean {
  return (
    mealPlanConfig.availability.availableWeekdays.some((weekday) => weekday === date.getDay()) &&
    !mealPlanConfig.availability.unavailableDates.includes(toDateKey(date))
  )
}

export function getNextAvailableStartDate(today = new Date()): string {
  const firstPossibleDate = addCalendarDays(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    mealPlanConfig.availability.minimumDaysNotice,
  )

  for (let offset = 0; offset < 366; offset += 1) {
    const candidate = addCalendarDays(firstPossibleDate, offset)
    if (isAvailableDeliveryDate(candidate)) return toDateKey(candidate)
  }

  throw new Error('No available meal plan start date was found in the next year.')
}

export function getAvailableDates(startDate: string, duration: PlanDuration): string[] {
  const start = fromDateKey(startDate)
  const end = getPlanEndDate(startDate, duration)
  const dates: string[] = []

  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (isAvailableDeliveryDate(date)) dates.push(toDateKey(date))
  }

  return dates
}

export function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(fromDateKey(dateKey))
}

export function formatWeekday(dateKey: string, width: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: width }).format(fromDateKey(dateKey))
}
