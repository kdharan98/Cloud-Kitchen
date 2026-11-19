import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  Leaf,
  LockKeyhole,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import FoodCard from '../../components/FoodCard'
import { mockMenu } from '../../data/mockMenu'
import type { MenuItem } from '../../types/menu'
import './meal-plans.css'
import { mealPlanConfig } from './config'
import {
  formatDate,
  formatWeekday,
  fromDateKey,
  getAvailableDates,
  getNextAvailableStartDate,
  getPlanEndDate,
  isAvailableDeliveryDate,
  toDateKey,
} from './dateUtils'
import type { MealPlanDraft, MealPlanStep, MealType, PlanDuration } from './types'

const DRAFT_STORAGE_KEY = 'daily-bite-meal-plan-draft'

const stepOrder: MealPlanStep[] = [
  'duration',
  'preferences',
  'start-date',
  'delivery-dates',
  'customise',
  'review',
  'payment',
]

const stepLabels = [
  'Plan',
  'Meals',
  'Start',
  'Dates',
  'Customise',
  'Review',
  'Payment',
]

const breakfastItems = mockMenu.filter(
  (item) => item.section === 'Breakfast Favourites' || item.section === 'South Indian Specials',
)
const lunchItems = mockMenu.filter(
  (item) => item.section === 'Lunch Favourites' && item.category !== 'Drinks',
)

function createInitialDraft(): MealPlanDraft {
  return {
    step: 'duration',
    duration: 'weekly',
    mealTypes: ['breakfast'],
    startDate: getNextAvailableStartDate(),
    deliveryDates: [],
    mealsByDate: {},
    repeatMealTypes: [],
    repeatReferenceDates: {},
  }
}

function isMealPlanDraft(value: unknown): value is MealPlanDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<MealPlanDraft>
  return (
    stepOrder.includes(draft.step as MealPlanStep) &&
    (draft.duration === 'weekly' || draft.duration === 'monthly') &&
    Array.isArray(draft.mealTypes) &&
    typeof draft.startDate === 'string' &&
    Array.isArray(draft.deliveryDates) &&
    Boolean(draft.mealsByDate && typeof draft.mealsByDate === 'object')
  )
}

function loadDraft(): MealPlanDraft {
  const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!savedDraft) return createInitialDraft()

  try {
    const parsed: unknown = JSON.parse(savedDraft)
    if (isMealPlanDraft(parsed)) {
      const repeatMealTypes = Array.isArray(parsed.repeatMealTypes)
        ? parsed.repeatMealTypes.filter(isMealType)
        : []
      const repeatReferenceDates =
        parsed.repeatReferenceDates &&
        typeof parsed.repeatReferenceDates === 'object' &&
        !Array.isArray(parsed.repeatReferenceDates)
          ? parsed.repeatReferenceDates
          : {}
      return { ...parsed, repeatMealTypes, repeatReferenceDates }
    }
    console.error('Saved meal plan draft has an invalid shape; starting a new draft.')
  } catch (error) {
    console.error('Could not restore the saved meal plan draft.', error)
  }

  return createInitialDraft()
}

function getMenuItem(itemId: string | undefined): MenuItem | undefined {
  return itemId ? mockMenu.find((item) => item.id === itemId) : undefined
}

function getSelectedMealCount(meals: Partial<Record<MealType, string>> | undefined): number {
  return Number(Boolean(meals?.breakfast)) + Number(Boolean(meals?.lunch))
}

function isMealType(value: unknown): value is MealType {
  return value === 'breakfast' || value === 'lunch'
}

function getMealTypeLabel(mealTypes: MealType[]): string {
  if (mealTypes.length === 2) return 'Breakfast + Lunch'
  if (mealTypes[0] === 'lunch') return 'Lunch'
  return 'Breakfast'
}

interface MealPlansPageProps {
  onNotice: (message: string) => void
}

function MealPlansPage({ onNotice }: MealPlansPageProps) {
  const [draft, setDraft] = useState<MealPlanDraft>(loadDraft)
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(draft.startDate))
  const [todayKey] = useState(() => toDateKey(new Date()))
  const nextAvailableStartDate = useMemo(
    () => getNextAvailableStartDate(fromDateKey(todayKey)),
    [todayKey],
  )
  const [activeDate, setActiveDate] = useState('')
  const [startDateError, setStartDateError] = useState('')
  const [copyMealTypes, setCopyMealTypes] = useState<MealType[]>([])
  const [copyTargets, setCopyTargets] = useState<string[]>([])
  const [expandedMealSection, setExpandedMealSection] = useState<MealType | null>(
    () => draft.mealTypes[0] ?? null,
  )

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const endDate = getPlanEndDate(draft.startDate, draft.duration)
  const endDateKey = toDateKey(endDate)
  const endDateLabel = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(endDate)
  const startDateLabel = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromDateKey(draft.startDate))
  const availableDates = useMemo(
    () => getAvailableDates(draft.startDate, draft.duration),
    [draft.startDate, draft.duration],
  )
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates])
  const incompleteDates = draft.deliveryDates.filter(
    (date) => getSelectedMealCount(draft.mealsByDate[date]) === 0,
  )
  const activeMenuDate = draft.deliveryDates.includes(activeDate)
    ? activeDate
    : draft.deliveryDates[0] ?? ''
  const activeMeals = draft.mealsByDate[activeMenuDate] ?? {}

  function updateDraft(update: (current: MealPlanDraft) => MealPlanDraft) {
    setDraft((current) => update(current))
  }

  function goToStep(step: MealPlanStep) {
    updateDraft((current) => ({ ...current, step }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    const currentIndex = stepOrder.indexOf(draft.step)
    if (currentIndex > 0) goToStep(stepOrder[currentIndex - 1])
  }

  function resetDraft() {
    setDraft(createInitialDraft())
    setActiveDate('')
    setVisibleMonth(fromDateKey(getNextAvailableStartDate()))
    setStartDateError('')
    onNotice('Your meal plan draft has been cleared.')
  }

  function chooseDuration(duration: PlanDuration) {
    updateDraft((current) => {
      const newEndDate = getPlanEndDate(current.startDate, duration)
      const newEndKey = toDateKey(newEndDate)
      const eligibleDates = getAvailableDates(current.startDate, duration)
      return {
        ...current,
        duration,
        deliveryDates: current.deliveryDates.filter(
          (date) => date <= newEndKey && eligibleDates.includes(date),
        ),
      }
    })
  }

  function setMealPreference(mealTypes: MealType[]) {
    setExpandedMealSection(mealTypes[0] ?? null)
    updateDraft((current) => ({
      ...current,
      mealTypes,
      repeatMealTypes: current.repeatMealTypes.filter((type) => mealTypes.includes(type)),
      repeatReferenceDates: {
        breakfast: mealTypes.includes('breakfast')
          ? current.repeatReferenceDates.breakfast
          : undefined,
        lunch: mealTypes.includes('lunch') ? current.repeatReferenceDates.lunch : undefined,
      },
      mealsByDate: Object.fromEntries(
        Object.entries(current.mealsByDate).map(([date, meals]) => [
          date,
          {
            breakfast: mealTypes.includes('breakfast') ? meals.breakfast : undefined,
            lunch: mealTypes.includes('lunch') ? meals.lunch : undefined,
          },
        ]),
      ),
    }))
  }

  function changeStartDate(startDate: string) {
    if (!startDate) {
      setStartDateError('Choose a start date.')
      return
    }
    setVisibleMonth(fromDateKey(startDate))
    const selectedDate = fromDateKey(startDate)
    if (startDate < todayKey) {
      setStartDateError('Choose today or a future date.')
    } else if (!isAvailableDeliveryDate(selectedDate)) {
      setStartDateError('This date is not available in the current preview schedule.')
    } else {
      setStartDateError('')
    }
    updateDraft((current) => {
      const eligibleDates = getAvailableDates(startDate, current.duration)
      return {
        ...current,
        startDate,
        deliveryDates: current.deliveryDates.filter((date) => eligibleDates.includes(date)),
      }
    })
  }

  function toggleDeliveryDate(date: string) {
    updateDraft((current) => ({
      ...current,
      deliveryDates: current.deliveryDates.includes(date)
        ? current.deliveryDates.filter((selectedDate) => selectedDate !== date)
        : [...current.deliveryDates, date].sort(),
    }))
  }

  function selectAvailableDates(predicate: (date: Date) => boolean) {
    const datesToSelect = availableDates.filter((date) => predicate(fromDateKey(date)))
    updateDraft((current) => ({
      ...current,
      deliveryDates: datesToSelect,
    }))
  }

  function selectMeal(date: string, type: MealType, item: MenuItem) {
    const currentItemId = draft.mealsByDate[date]?.[type]
    const nextItemId = currentItemId === item.id ? undefined : item.id
    const isRepeatReference =
      draft.repeatMealTypes.includes(type) && draft.repeatReferenceDates[type] === date
    let updateAllRepeatedDates = false

    if (isRepeatReference) {
      updateAllRepeatedDates = window.confirm(
        `Update ${type} on every selected delivery day? Choose Cancel to change only this date.`,
      )
      if (updateAllRepeatedDates) {
        const wouldOverwrite = draft.deliveryDates.some(
          (deliveryDate) =>
            availableDateSet.has(deliveryDate) &&
            deliveryDate !== date &&
            draft.mealsByDate[deliveryDate]?.[type] &&
            draft.mealsByDate[deliveryDate]?.[type] !== nextItemId,
        )
        if (
          wouldOverwrite &&
          !window.confirm(`This will replace different ${type} selections on other dates. Continue?`)
        ) {
          updateAllRepeatedDates = false
          onNotice('Only this delivery date was changed.')
        }
      }
    }

    updateDraft((current) => {
      const datesToChange = updateAllRepeatedDates
        ? current.deliveryDates.filter((deliveryDate) => availableDateSet.has(deliveryDate))
        : [date]
      const mealsByDate = { ...current.mealsByDate }
      for (const deliveryDate of datesToChange) {
        const nextMeals = { ...mealsByDate[deliveryDate] }
        if (nextItemId) nextMeals[type] = nextItemId
        else delete nextMeals[type]
        mealsByDate[deliveryDate] = nextMeals
      }
      return {
        ...current,
        mealsByDate,
      }
    })
  }

  function toggleRepeat(type: MealType, shouldRepeat: boolean) {
    if (!shouldRepeat) {
      updateDraft((current) => ({
        ...current,
        repeatMealTypes: current.repeatMealTypes.filter((mealType) => mealType !== type),
        repeatReferenceDates: { ...current.repeatReferenceDates, [type]: undefined },
      }))
      return
    }

    const referenceItemId = draft.mealsByDate[activeMenuDate]?.[type]
    if (!activeMenuDate || !referenceItemId) {
      onNotice(`Choose a ${type} dish for this date before repeating it.`)
      return
    }

    const datesToUpdate = draft.deliveryDates.filter((date) => availableDateSet.has(date))
    const wouldOverwrite = datesToUpdate.some(
      (date) =>
        date !== activeMenuDate &&
        draft.mealsByDate[date]?.[type] &&
        draft.mealsByDate[date]?.[type] !== referenceItemId,
    )
    if (
      wouldOverwrite &&
      !window.confirm(`Replace different ${type} selections on the other delivery days?`)
    ) {
      return
    }

    updateDraft((current) => {
      const mealsByDate = { ...current.mealsByDate }
      for (const date of datesToUpdate) {
        mealsByDate[date] = { ...mealsByDate[date], [type]: referenceItemId }
      }
      return {
        ...current,
        mealsByDate,
        repeatMealTypes: current.repeatMealTypes.includes(type)
          ? current.repeatMealTypes
          : [...current.repeatMealTypes, type],
        repeatReferenceDates: {
          ...current.repeatReferenceDates,
          [type]: activeMenuDate,
        },
      }
    })
  }

  function applyMealCopy() {
    if (!activeMenuDate || copyMealTypes.length === 0 || copyTargets.length === 0) return

    const source = draft.mealsByDate[activeMenuDate] ?? {}
    const mealsToCopy = Object.fromEntries(
      copyMealTypes
        .map((type) => [type, source[type]] as const)
        .filter((entry): entry is readonly [MealType, string] => Boolean(entry[1])),
    ) as Partial<Record<MealType, string>>

    if (Object.keys(mealsToCopy).length === 0) {
      onNotice('Choose at least one meal on this date before copying.')
      return
    }

    const wouldOverwrite = copyTargets.some((date) =>
      copyMealTypes.some(
        (type) =>
          mealsToCopy[type] &&
          draft.mealsByDate[date]?.[type] &&
          draft.mealsByDate[date]?.[type] !== mealsToCopy[type],
      ),
    )
    if (
      wouldOverwrite &&
      !window.confirm('Some selected dates already have a different meal. Replace those meals?')
    ) {
      return
    }

    updateDraft((current) => {
      const mealsByDate = { ...current.mealsByDate }
      for (const date of copyTargets) {
        mealsByDate[date] = { ...mealsByDate[date], ...mealsToCopy }
      }
      return { ...current, mealsByDate }
    })
    setCopyMealTypes([])
    setCopyTargets([])
    onNotice('Meals copied to the selected dates.')
  }

  const mealOrders = draft.deliveryDates.flatMap((date) =>
    (['breakfast', 'lunch'] as const).flatMap((type) => {
      const item = getMenuItem(draft.mealsByDate[date]?.[type])
      return item ? [{ date, type, item }] : []
    }),
  )
  const itemTotal = mealOrders.reduce((total, order) => total + order.item.price, 0)
  const total = itemTotal + (mealPlanConfig.deliveryFee ?? 0)

  const currentMonthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth)
  const firstDayOfMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay()
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate()
  const calendarCells: Array<Date | null> = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1),
    ),
  ]
  const firstMonth = fromDateKey(draft.startDate)
  const lastMonth = endDate
  const canGoToPreviousMonth =
    visibleMonth.getFullYear() > firstMonth.getFullYear() ||
    (visibleMonth.getFullYear() === firstMonth.getFullYear() &&
      visibleMonth.getMonth() > firstMonth.getMonth())
  const canGoToNextMonth =
    visibleMonth.getFullYear() < lastMonth.getFullYear() ||
    (visibleMonth.getFullYear() === lastMonth.getFullYear() &&
      visibleMonth.getMonth() < lastMonth.getMonth())

  return (
    <section aria-label="Meal Plans" className="meal-plans-app">
      <div className="meal-plan-heading">
        <div>
          <span className="meal-plan-kicker"><Sparkles size={14} /> DAILY BITE MEAL PLANS</span>
          <h1>Your meals, your schedule.</h1>
          <p>Plan your vegetarian meals around your routine.</p>
        </div>
        {draft.step === 'duration' && (
          <button className="meal-plan-reset" onClick={resetDraft} type="button">
            <RotateCcw size={14} /> Start over
          </button>
        )}
      </div>

      <div aria-label="Subscription progress" className="meal-plan-progress">
        {stepLabels.map((label, index) => {
          const currentIndex = stepOrder.indexOf(draft.step)
          return (
            <div
              aria-current={index === currentIndex ? 'step' : undefined}
              className={`meal-progress-step${index < currentIndex ? ' is-complete' : ''}${index === currentIndex ? ' is-current' : ''}`}
              key={label}
            >
              <span>{index < currentIndex ? <Check size={12} /> : index + 1}</span>
              <small>{label}</small>
            </div>
          )
        })}
      </div>

      {draft.step === 'duration' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 1 OF 7</span>
            <h2>Choose your plan</h2>
            <p>Pick a rhythm that works for you. You’ll choose each delivery day.</p>
          </div>
          <div className="plan-duration-options">
            {(['weekly', 'monthly'] as const).map((duration) => (
              <button
                aria-pressed={draft.duration === duration}
                className={`plan-duration-card${draft.duration === duration ? ' is-selected' : ''}`}
                key={duration}
                onClick={() => chooseDuration(duration)}
                type="button"
              >
                <span className="plan-card-topline">
                  <span className="plan-card-icon"><CalendarDays size={18} /></span>
                  {duration === 'monthly' && <span className="plan-card-tag">MORE FLEXIBILITY</span>}
                </span>
                <strong>{duration === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'}</strong>
                <span className="plan-card-duration">
                  {mealPlanConfig.durations[duration]} days · choose your delivery dates
                </span>
                <span className="plan-card-selection">
                  <span className="plan-radio">{draft.duration === duration && <span />}</span>
                  {draft.duration === duration ? 'Selected' : 'Select plan'}
                </span>
              </button>
            ))}
          </div>
          <div className="meal-plan-note">
            <Leaf size={17} />
            <span>Fresh vegetarian meals, chosen by you. Your total is based on the dishes you select.</span>
          </div>
        </div>
      )}

      {draft.step === 'preferences' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 2 OF 7</span>
            <h2>What would you like to plan?</h2>
            <p>Choose the meals you want to customise. You can pick either or both on each date.</p>
          </div>
          <div className="meal-preference-options">
            {[
              { label: 'Breakfast only', types: ['breakfast'] as MealType[], detail: 'Start your day fresh' },
              { label: 'Lunch only', types: ['lunch'] as MealType[], detail: 'A delicious midday meal' },
              { label: 'Breakfast + Lunch', types: ['breakfast', 'lunch'] as MealType[], detail: 'Mix and match every day' },
            ].map(({ label, types, detail }) => {
              const isSelected =
                types.length === draft.mealTypes.length &&
                types.every((type) => draft.mealTypes.includes(type))
              return (
                <button
                  aria-pressed={isSelected}
                  className={`meal-preference-card${isSelected ? ' is-selected' : ''}`}
                  key={label}
                  onClick={() => setMealPreference(types)}
                  type="button"
                >
                  <span className="meal-preference-icon">{types.length === 2 ? 'B + L' : types[0] === 'breakfast' ? 'B' : 'L'}</span>
                  <span className="meal-preference-copy">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <span className="meal-preference-check">{isSelected && <Check size={14} />}</span>
                </button>
              )
            })}
          </div>
          <div className="meal-plan-note">
            <CircleCheck size={17} />
            <span>With both selected, you can choose breakfast, lunch, or both for each delivery day.</span>
          </div>
        </div>
      )}

      {draft.step === 'start-date' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 3 OF 7</span>
            <h2>When should we start?</h2>
            <p>Start from the next available delivery date or choose a later date.</p>
          </div>
          <button
            aria-pressed={draft.startDate === nextAvailableStartDate}
            className={`start-date-option${draft.startDate === nextAvailableStartDate ? ' is-selected' : ''}`}
            onClick={() => changeStartDate(nextAvailableStartDate)}
            type="button"
          >
            <span className="start-date-icon"><Clock3 size={18} /></span>
            <span><strong>Start as soon as possible</strong><small>{formatDate(nextAvailableStartDate, { year: 'numeric' })}</small></span>
            <span className="meal-preference-check">{draft.startDate === nextAvailableStartDate && <Check size={14} />}</span>
          </button>
          <label className="future-date-field">
            <span>Or choose a future date</span>
            <input
              aria-invalid={Boolean(startDateError)}
              min={todayKey}
              onChange={(event) => changeStartDate(event.target.value)}
              type="date"
              value={draft.startDate}
            />
          </label>
          {startDateError && <p className="meal-plan-error" role="alert">{startDateError}</p>}
          <div className="subscription-date-summary">
            <div><small>SUBSCRIPTION START</small><strong>{startDateLabel}</strong></div>
            <ChevronRight size={17} />
            <div><small>SUBSCRIPTION END</small><strong>{endDateLabel}</strong></div>
          </div>
          <p className="meal-plan-config-note">
            Preview availability is configurable and isn’t connected to live kitchen scheduling.
          </p>
        </div>
      )}

      {draft.step === 'delivery-dates' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 4 OF 7</span>
            <h2>Choose your delivery days</h2>
            <p>Select the dates you’d like meals delivered during your {draft.duration} plan.</p>
          </div>
          <div className="delivery-period-strip">
            <span><CalendarDays size={16} /> {startDateLabel} – {endDateLabel}</span>
            <strong>{draft.deliveryDates.length} {draft.deliveryDates.length === 1 ? 'day' : 'days'} selected</strong>
          </div>
          <div className="calendar-card">
            <div className="calendar-heading">
              <button
                aria-label="Previous month"
                disabled={!canGoToPreviousMonth}
                onClick={() =>
                  setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
                }
                type="button"
              >
                <ChevronLeft size={19} />
              </button>
              <strong>{currentMonthLabel}</strong>
              <button
                aria-label="Next month"
                disabled={!canGoToNextMonth}
                onClick={() =>
                  setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
                }
                type="button"
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div aria-hidden="true" className="calendar-grid calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div aria-label="Available delivery dates" className="calendar-grid">
              {calendarCells.map((date, index) => {
                if (!date) return <span aria-hidden="true" className="calendar-empty" key={`empty-${index}`} />
                const dateKey = toDateKey(date)
                const inPeriod = dateKey >= draft.startDate && dateKey <= endDateKey
                const available = inPeriod && availableDateSet.has(dateKey)
                const isSelected = draft.deliveryDates.includes(dateKey)
                return (
                  <button
                    aria-label={`${formatWeekday(dateKey, 'long')}, ${formatDate(dateKey, { year: 'numeric' })}${available ? '' : ', unavailable'}`}
                    aria-pressed={isSelected}
                    className={`calendar-day${isSelected ? ' is-selected' : ''}${dateKey === todayKey ? ' is-today' : ''}`}
                    disabled={!available}
                    key={dateKey}
                    onClick={() => toggleDeliveryDate(dateKey)}
                    type="button"
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="calendar-legend">
              <span><i className="legend-selected" /> Selected</span>
              <span><i className="legend-unavailable" /> Unavailable</span>
              <span><i className="legend-today" /> Today</span>
            </div>
          </div>
          <div className="quick-date-actions">
            <button onClick={() => selectAvailableDates((date) => date.getDay() > 0 && date.getDay() < 6)} type="button">Weekdays</button>
            <button onClick={() => selectAvailableDates((date) => date.getDay() === 0 || date.getDay() === 6)} type="button">Weekends</button>
            <button onClick={() => selectAvailableDates(() => true)} type="button">All available</button>
            <button onClick={() => updateDraft((current) => ({ ...current, deliveryDates: [] }))} type="button">Clear</button>
          </div>
          {availableDates.length === 0 && (
            <p className="meal-plan-error" role="status">No delivery dates are available in this period. Choose another start date.</p>
          )}
        </div>
      )}

      {draft.step === 'customise' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 5 OF 7</span>
            <h2>Customise your meals</h2>
            <p>Choose what you’d like on each delivery day.</p>
          </div>
          <div aria-label="Selected delivery dates" className="meal-date-tabs">
            {draft.deliveryDates.map((date) => {
              const completed = getSelectedMealCount(draft.mealsByDate[date]) > 0
              return (
                <button
                  aria-pressed={activeMenuDate === date}
                  className={`meal-date-tab${activeMenuDate === date ? ' is-active' : ''}${completed ? ' is-complete' : ''}`}
                  key={date}
                  onClick={() => setActiveDate(date)}
                  type="button"
                >
                  <small>{formatWeekday(date)}</small>
                  <strong>{fromDateKey(date).getDate()}</strong>
                  <span>{completed ? <CircleCheck size={13} /> : 'Choose'}</span>
                </button>
              )
            })}
          </div>

          {activeMenuDate ? (
            <>
              <div className="active-meal-date">
                <div><span>YOUR MENU FOR</span><strong>{formatWeekday(activeMenuDate, 'long')}, {formatDate(activeMenuDate)}</strong></div>
                <span className={getSelectedMealCount(activeMeals) > 0 ? 'day-status is-complete' : 'day-status'}>
                  {getSelectedMealCount(activeMeals) > 0 ? 'Ready' : 'Choose at least 1'}
                </span>
              </div>
              {draft.mealTypes.includes('breakfast') && (
                <MealAccordion
                  expanded={expandedMealSection === 'breakfast'}
                  onToggle={() =>
                    setExpandedMealSection((current) =>
                      current === 'breakfast' ? null : 'breakfast',
                    )
                  }
                  selectedItem={getMenuItem(activeMeals.breakfast)}
                  title="Breakfast"
                  type="breakfast"
                >
                  <MealChoiceCards
                    items={breakfastItems}
                    onSelect={(item) => selectMeal(activeMenuDate, 'breakfast', item)}
                    selectedItemId={activeMeals.breakfast}
                  />
                </MealAccordion>
              )}
              {draft.mealTypes.includes('lunch') && (
                <MealAccordion
                  expanded={expandedMealSection === 'lunch'}
                  onToggle={() =>
                    setExpandedMealSection((current) =>
                      current === 'lunch' ? null : 'lunch',
                    )
                  }
                  selectedItem={getMenuItem(activeMeals.lunch)}
                  title="Lunch"
                  type="lunch"
                >
                  <MealChoiceCards
                    items={lunchItems}
                    onSelect={(item) => selectMeal(activeMenuDate, 'lunch', item)}
                    selectedItemId={activeMeals.lunch}
                  />
                </MealAccordion>
              )}
              <section className="repeat-meals-card">
                <div className="repeat-meals-heading">
                  <span><Repeat2 size={16} /></span>
                  <h3>Repeat meal selections</h3>
                </div>
                <p>Apply your selected meals to all delivery days. You can still customise individual dates.</p>
                <div className="repeat-meal-options">
                  {([
                    ['breakfast', 'Keep the same breakfast for all selected days'],
                    ['lunch', 'Keep the same lunch for all selected days'],
                  ] as const).map(([type, label]) => {
                    const isRepeating = draft.repeatMealTypes.includes(type)
                    const isAvailableForPlan = draft.mealTypes.includes(type)
                    const hasReferenceMeal = Boolean(activeMeals[type])
                    return (
                      <label className="repeat-meal-option" key={type}>
                        <input
                          checked={isRepeating}
                          disabled={
                            !isRepeating && (!isAvailableForPlan || !hasReferenceMeal)
                          }
                          onChange={(event) => toggleRepeat(type, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="repeat-option-copy">
                          <strong>{label}</strong>
                          <small>
                            {!isAvailableForPlan
                              ? 'Not included in this plan'
                              : !hasReferenceMeal
                                ? `Choose a ${type} dish for this date first`
                                : isRepeating
                                  ? 'Applied · individual dates can still differ'
                                  : 'Use the selected dish as your starting choice'}
                          </small>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
              <section className="meal-addon-section">
                <div className="meal-addon-heading"><h3>Add-ons</h3><span>Optional</span></div>
                <div className="meal-empty-addon"><Leaf size={16} /> No add-ons are configured in the current menu.</div>
              </section>
              <details className="copy-meals-panel">
                <summary><SlidersHorizontal size={15} /> Advanced options <ChevronDown size={15} /></summary>
                <div className="copy-meals-content">
                  <div className="advanced-copy-title"><Copy size={14} /><strong>Copy meals to other days</strong></div>
                  <p>Choose which meals to copy and the delivery dates to receive them.</p>
                  <div className="copy-meal-types">
                    {draft.mealTypes.map((type) => (
                      <label key={type}>
                        <input
                          checked={copyMealTypes.includes(type)}
                          onChange={() =>
                            setCopyMealTypes((current) =>
                              current.includes(type)
                                ? current.filter((value) => value !== type)
                                : [...current, type],
                            )
                          }
                          type="checkbox"
                        />
                        {type === 'breakfast' ? 'Breakfast' : 'Lunch'}
                      </label>
                    ))}
                  </div>
                  <div className="copy-target-list">
                    {draft.deliveryDates
                      .filter((date) => date !== activeMenuDate)
                      .map((date) => (
                        <label key={date}>
                          <input
                            checked={copyTargets.includes(date)}
                            onChange={() =>
                              setCopyTargets((current) =>
                                current.includes(date)
                                  ? current.filter((value) => value !== date)
                                  : [...current, date],
                              )
                            }
                            type="checkbox"
                          />
                          {formatWeekday(date)} · {formatDate(date)}
                        </label>
                      ))}
                  </div>
                  <button
                    className="copy-meals-button"
                    disabled={copyMealTypes.length === 0 || copyTargets.length === 0}
                    onClick={applyMealCopy}
                    type="button"
                  >
                    Copy selected meals
                  </button>
                </div>
              </details>
              <div className="meal-customise-summary">
                {draft.deliveryDates.filter((date) => getSelectedMealCount(draft.mealsByDate[date]) > 0).length} of {draft.deliveryDates.length} days customised
              </div>
              {incompleteDates.length > 0 && (
                <p className="meal-plan-config-note">
                  Every selected delivery day needs at least one meal before review.
                </p>
              )}
            </>
          ) : (
            <div className="meal-empty-selection">
              <CalendarDays size={24} />
              <strong>No delivery dates selected</strong>
              <p>Go back and select at least one date to customise meals.</p>
            </div>
          )}
        </div>
      )}

      {draft.step === 'review' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 6 OF 7</span>
            <h2>Review your meal plan</h2>
            <p>Check your schedule and itemised total before continuing to payment.</p>
          </div>
          <section className="review-summary-card">
            <div className="review-summary-heading">
              <span className="review-summary-icon"><CalendarDays size={18} /></span>
              <div><strong>{draft.duration === 'weekly' ? 'Weekly' : 'Monthly'} plan</strong><small>{getMealTypeLabel(draft.mealTypes)}</small></div>
            </div>
            <div className="review-summary-dates">
              <div><small>STARTS</small><strong>{startDateLabel}</strong></div>
              <div><small>ENDS</small><strong>{endDateLabel}</strong></div>
              <div><small>DELIVERY DAYS</small><strong>{draft.deliveryDates.length}</strong></div>
            </div>
          </section>
          <div className="review-schedule-heading">
            <h3>Delivery schedule</h3>
            <button onClick={() => goToStep('delivery-dates')} type="button">Edit dates</button>
          </div>
          <div className="review-day-list">
            {draft.deliveryDates.map((date) => {
              const meals = draft.mealsByDate[date] ?? {}
              const breakfast = getMenuItem(meals.breakfast)
              const lunch = getMenuItem(meals.lunch)
              return (
                <article className="review-day-card" key={date}>
                  <div className="review-day-header">
                    <div><small>{formatWeekday(date, 'long')}</small><strong>{formatDate(date, { year: 'numeric' })}</strong></div>
                    <button
                      aria-label={`Edit meals for ${formatDate(date)}`}
                      onClick={() => {
                        setActiveDate(date)
                        goToStep('customise')
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                  {breakfast && <ReviewMealRow item={breakfast} type="Breakfast" />}
                  {lunch && <ReviewMealRow item={lunch} type="Lunch" />}
                  {!breakfast && !lunch && <p className="review-empty-day">No meal selected yet.</p>}
                  <div className="review-addon-placeholder">Add-ons · None available in current menu</div>
                </article>
              )
            })}
          </div>
          <section className="price-breakdown">
            <h3>Price breakdown</h3>
            {mealOrders.map(({ date, type, item }, index) => (
              <div className="price-line" key={`${date}-${type}-${index}`}>
                <span>{item.name}<small>{formatDate(date)} · {type}</small></span>
                <strong>₹{item.price}</strong>
              </div>
            ))}
            {mealPlanConfig.deliveryFee !== null ? (
              <div className="price-line"><span>Delivery charges</span><strong>₹{mealPlanConfig.deliveryFee}</strong></div>
            ) : (
              <p className="meal-plan-config-note">Delivery charges are not configured.</p>
            )}
            <div className="price-total"><span>Subscription total</span><strong>₹{total}</strong></div>
            <small className="price-calculation-note">Calculated from the selected menu items. No add-ons or unconfigured charges included.</small>
          </section>
          {incompleteDates.length > 0 && (
            <p className="meal-plan-error" role="alert">
              Add at least one meal for {incompleteDates.length} selected {incompleteDates.length === 1 ? 'day' : 'days'} before payment.
            </p>
          )}
        </div>
      )}

      {draft.step === 'payment' && (
        <div className="meal-plan-step-content">
          <div className="meal-plan-section-title">
            <span className="meal-step-overline">STEP 7 OF 7</span>
            <h2>Payment</h2>
            <p>Your subscription is payable upfront after secure online payment is available.</p>
          </div>
          <section className="payment-total-card">
            <span>AMOUNT DUE</span>
            <strong>₹{total}</strong>
            <small>{mealOrders.length} selected {mealOrders.length === 1 ? 'meal' : 'meals'} across {draft.deliveryDates.length} delivery days</small>
          </section>
          <section className="payment-method-placeholder">
            <span className="payment-method-icon"><CreditCard size={21} /></span>
            <div><strong>Online payment</strong><small>Secure payment gateway connection required</small></div>
            <LockKeyhole className="payment-lock" size={17} />
          </section>
          <div className="payment-unavailable">
            <span><CreditCard size={17} /></span>
            <div>
              <strong>Payments aren’t connected yet</strong>
              <p>This is a payment placeholder only. No payment has been taken and this plan has not been activated.</p>
            </div>
          </div>
          <div className="payment-policy-note">
            <strong><ShieldCheck size={16} /> No cash on delivery</strong>
            <p>A plan can only become active after an online payment gateway confirms payment. Subscription references, confirmations, and skip delivery will be available after that integration and the applicable business rules are configured.</p>
          </div>
          <div className="payment-summary">
            <span>{draft.duration === 'weekly' ? 'Weekly' : 'Monthly'} · {formatDate(draft.startDate)} – {formatDate(endDateKey)}</span>
            <strong>₹{total}</strong>
          </div>
        </div>
      )}

      <div className="meal-plan-actions">
        {draft.step !== 'duration' && (
          <button className="meal-action-back" onClick={goBack} type="button">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {draft.step === 'duration' && (
          <button className="meal-action-primary" onClick={() => goToStep('preferences')} type="button">
            Choose meals <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'preferences' && (
          <button className="meal-action-primary" onClick={() => goToStep('start-date')} type="button">
            Choose start date <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'start-date' && (
          <button
            className="meal-action-primary"
            disabled={Boolean(startDateError)}
            onClick={() => goToStep('delivery-dates')}
            type="button"
          >
            Select delivery dates <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'delivery-dates' && (
          <button
            className="meal-action-primary"
            disabled={draft.deliveryDates.length === 0}
            onClick={() => {
              setActiveDate(draft.deliveryDates[0] ?? '')
              goToStep('customise')
            }}
            type="button"
          >
            Continue to meals <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'customise' && (
          <button
            className="meal-action-primary"
            disabled={draft.deliveryDates.length === 0 || incompleteDates.length > 0}
            onClick={() => goToStep('review')}
            type="button"
          >
            Review subscription <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'review' && (
          <button
            className="meal-action-primary"
            disabled={draft.deliveryDates.length === 0 || incompleteDates.length > 0}
            onClick={() => goToStep('payment')}
            type="button"
          >
            Continue to payment · ₹{total} <ChevronRight size={17} />
          </button>
        )}
        {draft.step === 'payment' && (
          <button className="meal-action-primary" disabled type="button">
            Payment gateway not connected
          </button>
        )}
      </div>
    </section>
  )
}

interface MealAccordionProps {
  type: MealType
  title: string
  selectedItem: MenuItem | undefined
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

function MealAccordion({
  type,
  title,
  selectedItem,
  expanded,
  onToggle,
  children,
}: MealAccordionProps) {
  const contentId = `meal-accordion-${type}-content`

  return (
    <section className={`meal-accordion${expanded ? ' is-expanded' : ''}`}>
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="meal-accordion-trigger"
        onClick={onToggle}
        type="button"
      >
        <span className="meal-accordion-label">{title}</span>
        <span className="meal-accordion-selection">
          {selectedItem ? (
            <><Check size={12} /> {selectedItem.name}</>
          ) : (
            'Choose a dish'
          )}
        </span>
        <span className="meal-accordion-count">{selectedItem ? '1 selected' : 'Choose 1'}</span>
        <ChevronDown aria-hidden="true" className="meal-accordion-chevron" size={16} />
      </button>
      <div
        aria-hidden={!expanded}
        className="meal-accordion-panel"
        id={contentId}
        inert={!expanded}
      >
        <div className="meal-accordion-panel-inner">
          {children}
        </div>
      </div>
    </section>
  )
}

interface MealChoiceCardsProps {
  items: MenuItem[]
  selectedItemId: string | undefined
  onSelect: (item: MenuItem) => void
}

function MealChoiceCards({ items, selectedItemId, onSelect }: MealChoiceCardsProps) {
  return (
    <div className="meal-choice-grid">
        {items.map((item) => (
          <FoodCard
            item={item}
            key={item.id}
            onAdd={() => onSelect(item)}
            onRemove={() => onSelect(item)}
            onSelect={() => onSelect(item)}
            quantity={selectedItemId === item.id ? 1 : 0}
            selected={selectedItemId === item.id}
          />
        ))}
    </div>
  )
}

function ReviewMealRow({ item, type }: { item: MenuItem; type: string }) {
  return (
    <div className="review-meal-row">
      <img alt="" src={item.image} />
      <div><small>{type}</small><strong>{item.name}</strong></div>
      <strong>₹{item.price}</strong>
    </div>
  )
}

export default MealPlansPage
