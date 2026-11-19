import { ArrowRight, CalendarDays, ClipboardList, ShoppingBag } from 'lucide-react'
import type { ReactNode } from 'react'

export type HistoryPageKind = 'orders' | 'meal-plans'

export interface OrderHistoryRecord {
  id: string
  reference: string
  dateTime: string
  items: Array<{ name: string; quantity: number }>
  total: number
  status: 'active' | 'past'
}

export interface MealPlanHistoryRecord {
  id: string
  planType: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  deliveryDays: number
  upcomingDelivery?: string
  breakfastMeals: string[]
  lunchMeals: string[]
  amount: number
  status: 'active' | 'completed' | 'expired'
}

interface HistoryPageProps {
  kind: HistoryPageKind
  onExplore: () => void
  orders?: OrderHistoryRecord[]
  subscriptions?: MealPlanHistoryRecord[]
  onViewOrder?: (order: OrderHistoryRecord) => void
  onReorder?: (order: OrderHistoryRecord) => void
  onViewPlan?: (plan: MealPlanHistoryRecord) => void
  onManagePlan?: (plan: MealPlanHistoryRecord) => void
}

const pageContent = {
  orders: {
    heading: 'My Orders',
    title: 'No orders yet',
    description:
      "You haven't placed any food orders yet. Explore our menu and find something delicious!",
    action: 'Explore Menu',
    Icon: ShoppingBag,
  },
  'meal-plans': {
    heading: 'My Meal Plans',
    title: 'No meal plans yet',
    description:
      "You haven't subscribed to any meal plans yet. Choose a weekly or monthly plan and enjoy fresh vegetarian meals on your schedule.",
    action: 'Explore Meal Plans',
    Icon: CalendarDays,
  },
}

function HistoryPage({
  kind,
  onExplore,
  orders = [],
  subscriptions = [],
  onViewOrder,
  onReorder,
  onViewPlan,
  onManagePlan,
}: HistoryPageProps) {
  const content = pageContent[kind]
  const Icon = content.Icon
  const activeOrders = orders.filter(({ status }) => status === 'active')
  const pastOrders = orders.filter(({ status }) => status === 'past')
  const activePlans = subscriptions.filter(({ status }) => status === 'active')
  const pastPlans = subscriptions.filter(({ status }) => status !== 'active')

  return (
    <section aria-labelledby="history-heading" className={`history-page history-page-${kind}`}>
      <h1 id="history-heading">{content.heading}</h1>
      {kind === 'orders' ? (
        orders.length > 0 ? (
          <div className="history-record-groups">
            {activeOrders.length > 0 && (
              <HistoryRecordGroup title="Active orders">
                {activeOrders.map((order) => (
                  <article className="history-record-card" key={order.id}>
                    <div className="history-record-topline">
                      <strong>Order {order.reference}</strong>
                      <span className="history-status is-active">In progress</span>
                    </div>
                    <p className="history-record-date">{order.dateTime}</p>
                    <p className="history-record-items">
                      {order.items.map(({ name, quantity }) => `${quantity} × ${name}`).join(' · ')}
                    </p>
                    <div className="history-record-footer">
                      <strong>₹{order.total}</strong>
                      <div className="history-record-actions">
                        {onViewOrder && (
                          <button onClick={() => onViewOrder(order)} type="button">View details</button>
                        )}
                        {onReorder && (
                          <button onClick={() => onReorder(order)} type="button">Reorder</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </HistoryRecordGroup>
            )}
            {pastOrders.length > 0 && (
              <HistoryRecordGroup title="Past orders">
                {pastOrders.map((order) => (
                  <article className="history-record-card is-past" key={order.id}>
                    <div className="history-record-topline">
                      <strong>Order {order.reference}</strong>
                      <span className="history-status">Completed</span>
                    </div>
                    <p className="history-record-date">{order.dateTime}</p>
                    <p className="history-record-items">
                      {order.items.map(({ name, quantity }) => `${quantity} × ${name}`).join(' · ')}
                    </p>
                    <div className="history-record-footer">
                      <strong>₹{order.total}</strong>
                      <div className="history-record-actions">
                        {onViewOrder && (
                          <button onClick={() => onViewOrder(order)} type="button">View details</button>
                        )}
                        {onReorder && (
                          <button onClick={() => onReorder(order)} type="button">Reorder</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </HistoryRecordGroup>
            )}
          </div>
        ) : (
          <HistoryEmptyState
            action={content.action}
            description={content.description}
            Icon={Icon}
            kind={kind}
            onExplore={onExplore}
            title={content.title}
          />
        )
      ) : subscriptions.length > 0 ? (
        <div className="history-record-groups">
          {activePlans.length > 0 && (
            <HistoryRecordGroup title="Active subscriptions">
              {activePlans.map((plan) => (
                <article className="history-record-card" key={plan.id}>
                  <div className="history-record-topline">
                    <strong>{capitalize(plan.planType)} meal plan</strong>
                    <span className="history-status is-active">Active</span>
                  </div>
                  <p className="history-record-date">{plan.startDate} – {plan.endDate}</p>
                  <p className="history-record-items">{plan.deliveryDays} delivery days</p>
                  {plan.upcomingDelivery && (
                    <p className="history-record-detail">Upcoming delivery · {plan.upcomingDelivery}</p>
                  )}
                  <p className="history-record-detail">
                    Breakfast: {plan.breakfastMeals.join(', ') || 'Not selected'}
                    <br />
                    Lunch: {plan.lunchMeals.join(', ') || 'Not selected'}
                  </p>
                  <div className="history-record-footer">
                    <strong>₹{plan.amount}</strong>
                    <div className="history-record-actions">
                      {onViewPlan && (
                        <button onClick={() => onViewPlan(plan)} type="button">View details</button>
                      )}
                      {onManagePlan && (
                        <button onClick={() => onManagePlan(plan)} type="button">Manage plan</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </HistoryRecordGroup>
          )}
          {pastPlans.length > 0 && (
            <HistoryRecordGroup title="Subscription history">
              {pastPlans.map((plan) => (
                <article className="history-record-card is-past" key={plan.id}>
                  <div className="history-record-topline">
                    <strong>{capitalize(plan.planType)} meal plan</strong>
                    <span className="history-status">{capitalize(plan.status)}</span>
                  </div>
                  <p className="history-record-date">{plan.startDate} – {plan.endDate}</p>
                  <p className="history-record-items">
                    {plan.deliveryDays} delivery days · {plan.breakfastMeals.length + plan.lunchMeals.length} selected meals
                  </p>
                  <div className="history-record-footer">
                    <strong>₹{plan.amount}</strong>
                    {onViewPlan && (
                      <div className="history-record-actions">
                        <button onClick={() => onViewPlan(plan)} type="button">View details</button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </HistoryRecordGroup>
          )}
        </div>
      ) : (
        <HistoryEmptyState
          action={content.action}
          description={content.description}
          Icon={Icon}
          kind={kind}
          onExplore={onExplore}
          title={content.title}
        />
      )}
    </section>
  )
}

function HistoryEmptyState({
  action,
  description,
  Icon,
  kind,
  onExplore,
  title,
}: {
  action: string
  description: string
  Icon: typeof ShoppingBag
  kind: HistoryPageKind
  onExplore: () => void
  title: string
}) {
  return (
    <div className="history-empty-state">
      <div aria-hidden="true" className="history-empty-illustration">
        <Icon size={34} strokeWidth={1.7} />
        {kind === 'orders' ? (
          <ClipboardList className="history-empty-accent" size={18} />
        ) : (
          <ShoppingBag className="history-empty-accent" size={18} />
        )}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="history-explore-button" onClick={onExplore} type="button">
        {action}
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </div>
  )
}

function HistoryRecordGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="history-record-group">
      <h2>{title}</h2>
      <div className="history-record-list">{children}</div>
    </section>
  )
}

function capitalize(value: string) {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`
}

export default HistoryPage
