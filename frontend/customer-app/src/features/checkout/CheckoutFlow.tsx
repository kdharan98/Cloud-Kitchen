import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { useState } from 'react'
import type { CartItem, MenuMealType } from '../../types/menu'
import { checkoutConfig } from './config'
import { getCartMealTypes } from './checkoutUtils'
import './checkout.css'

export interface PaidOrderConfirmation {
  orderReference: string
  deliveryAddress: string
  deliveryAddressType: string
  items: CartItem[]
  deliverySlots: Partial<Record<MenuMealType, string>>
  total: number
}

interface CheckoutFlowProps {
  cart: Record<string, CartItem>
  deliveryAddress: string
  deliveryAddressType: string
  selectedSlots: Partial<Record<MenuMealType, string>>
  onSelectSlot: (mealType: MenuMealType, slot: string) => void
  onChangeAddress: () => void
  onEditCart: () => void
  onReturnHome: () => void
  onViewOrders: () => void
  confirmation?: PaidOrderConfirmation
}

function CheckoutFlow({
  cart,
  deliveryAddress,
  deliveryAddressType,
  selectedSlots,
  onSelectSlot,
  onChangeAddress,
  onEditCart,
  onReturnHome,
  onViewOrders,
  confirmation,
}: CheckoutFlowProps) {
  const [screen, setScreen] = useState<'checkout' | 'payment'>('checkout')
  const cartItems = Object.values(cart).filter(({ quantity }) => quantity > 0)
  const mealTypes = getCartMealTypes(cart)
  const subtotal = cartItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)
  const total = subtotal + (checkoutConfig.deliveryCharge ?? 0)
  const missingSlots = mealTypes.filter((mealType) => !selectedSlots[mealType])
  const missingDeliveryAddress = deliveryAddress.trim().length === 0

  if (confirmation) {
    return (
      <OrderConfirmationScreen
        confirmation={confirmation}
        onReturnHome={onReturnHome}
        onViewOrders={onViewOrders}
      />
    )
  }

  if (screen === 'payment') {
    return (
      <section aria-label="Payment" className="checkout-flow">
        <div className="checkout-title-row">
          <button className="checkout-text-action" onClick={() => setScreen('checkout')} type="button">
            <ArrowLeft size={15} /> Checkout
          </button>
          <span className="checkout-step-label">PAYMENT</span>
          <h1>Payment</h1>
          <p>Review your order and pay securely online.</p>
        </div>
        <div className="payment-total-card">
          <span>FINAL PAYABLE AMOUNT</span>
          <strong>₹{total}</strong>
        </div>
        <PaymentMethodCard />
        <div className="checkout-payment-notice" role="status">
          <strong>Payments aren't connected yet.</strong>
          <p>This is a payment placeholder only. No payment has been taken, no order has been confirmed, and your cart has not been cleared.</p>
        </div>
        <OrderSummary
          cartItems={cartItems}
          deliveryCharge={checkoutConfig.deliveryCharge}
          mealTypes={mealTypes}
          selectedSlots={selectedSlots}
          subtotal={subtotal}
          total={total}
        />
        <div className="checkout-payment-note">
          <ShieldCheck size={16} />
          <span>Daily Bite accepts online payments only. Cash on Delivery is not available.</span>
        </div>
        <div className="checkout-actions">
          <button className="checkout-back-button" onClick={() => setScreen('checkout')} type="button">
            <ArrowLeft size={15} /> Back
          </button>
          <button className="checkout-primary-button" disabled type="button">
            Payment unavailable
          </button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Checkout" className="checkout-flow">
      <div className="checkout-title-row">
        <button className="checkout-text-action" onClick={onEditCart} type="button">
          <ArrowLeft size={15} /> Edit cart
        </button>
        <span className="checkout-step-label">ORDER DETAILS</span>
        <h1>Checkout</h1>
        <p>Confirm your delivery details and preferred times.</p>
      </div>

      {cartItems.length > 0 ? (
        <>
          <section className="checkout-card checkout-address-card">
            <div className="checkout-card-heading">
              <span className="checkout-card-icon"><MapPin size={17} /></span>
              <div><h2>Delivery address</h2><small>Delivering to</small></div>
              <button className="checkout-change-button" onClick={onChangeAddress} type="button">
                Change
              </button>
            </div>
            <div className="checkout-address-details">
              {deliveryAddress ? (
                <>
                  <strong>{deliveryAddressType}</strong>
                  <span>{deliveryAddress}</span>
                </>
              ) : (
                <span>No verified delivery address selected.</span>
              )}
            </div>
          </section>

          <section className="checkout-card checkout-slot-card">
            <div className="checkout-section-heading">
              <span className="checkout-card-icon"><Clock3 size={17} /></span>
              <div><h2>Delivery time</h2><small>Choose a slot for each meal type</small></div>
            </div>
            {mealTypes.length > 0 ? (
              mealTypes.map((mealType) => (
                <DeliverySlotSection
                  key={mealType}
                  mealType={mealType}
                  onSelect={(slot) => onSelectSlot(mealType, slot)}
                  selectedSlot={selectedSlots[mealType]}
                />
              ))
            ) : (
              <p className="checkout-no-slots">No breakfast or lunch delivery slot is required for these cart items.</p>
            )}
            <p className="checkout-config-note">Preview slots only; live kitchen availability is not connected.</p>
          </section>

          <OrderSummary
            cartItems={cartItems}
            deliveryCharge={checkoutConfig.deliveryCharge}
            mealTypes={mealTypes}
            selectedSlots={selectedSlots}
            subtotal={subtotal}
            total={total}
            onEditCart={onEditCart}
          />
          {missingSlots.length > 0 && (
            <p className="checkout-validation-message" role="status">
              Choose a delivery slot for {missingSlots.map((type) => type).join(' and ')} to continue.
            </p>
          )}
          {missingDeliveryAddress && (
            <p className="checkout-validation-message" role="status">
              Select a verified delivery address before continuing.
            </p>
          )}
          {checkoutConfig.deliveryCharge === null && (
            <p className="checkout-config-note">Delivery charges are not configured and are not included.</p>
          )}
        </>
      ) : (
        <div className="checkout-empty-state">
          <ShoppingBag size={26} />
          <strong>Your cart is empty</strong>
          <p>Add a dish before continuing to checkout.</p>
          <button className="checkout-change-button" onClick={onReturnHome} type="button">Return to menu</button>
        </div>
      )}

      <div className="checkout-actions">
        <button className="checkout-back-button" onClick={onEditCart} type="button">
          <Pencil size={14} /> Edit cart
        </button>
        <button
          className="checkout-primary-button"
          disabled={cartItems.length === 0 || missingSlots.length > 0 || missingDeliveryAddress}
          onClick={() => setScreen('payment')}
          type="button"
        >
          Continue to payment · ₹{total} <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}

function DeliverySlotSection({
  mealType,
  selectedSlot,
  onSelect,
}: {
  mealType: MenuMealType
  selectedSlot: string | undefined
  onSelect: (slot: string) => void
}) {
  const mealLabel = mealType === 'breakfast' ? 'Breakfast' : 'Lunch'
  const slots = checkoutConfig.deliverySlots[mealType]

  return (
    <div className="delivery-slot-section">
      <div className="delivery-slot-heading">
        <h3>{mealLabel} delivery</h3>
        {selectedSlot && <span><CheckCircle2 size={13} /> {selectedSlot}</span>}
      </div>
      <div aria-label={`${mealLabel} delivery slots`} className="delivery-slot-options" role="group">
        {slots.map((slot) => (
          <button
            aria-pressed={selectedSlot === slot}
            className={`delivery-slot-option${selectedSlot === slot ? ' is-selected' : ''}`}
            key={slot}
            onClick={() => onSelect(slot)}
            type="button"
          >
            <span className="slot-radio">{selectedSlot === slot && <span />}</span>
            {slot}
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderSummary({
  cartItems,
  mealTypes,
  selectedSlots,
  subtotal,
  deliveryCharge,
  total,
  onEditCart,
}: {
  cartItems: CartItem[]
  mealTypes: MenuMealType[]
  selectedSlots: Partial<Record<MenuMealType, string>>
  subtotal: number
  deliveryCharge: number | null
  total: number
  onEditCart?: () => void
}) {
  return (
    <section className="checkout-card checkout-order-summary">
      <div className="checkout-section-heading">
        <span className="checkout-card-icon"><ShoppingBag size={17} /></span>
        <div><h2>Order summary</h2><small>{cartItems.reduce((count, item) => count + item.quantity, 0)} items</small></div>
        {onEditCart && (
          <button className="checkout-change-button" onClick={onEditCart} type="button">Edit</button>
        )}
      </div>
      <div className="checkout-summary-items">
        {cartItems.map(({ item, quantity }) => (
          <div className="checkout-summary-item" key={item.id}>
            <img alt="" src={item.image} />
            <div className="checkout-summary-item-copy">
              <strong>{item.name}</strong>
              <small>{quantity} × ₹{item.price}</small>
            </div>
            <strong>₹{quantity * item.price}</strong>
          </div>
        ))}
      </div>
      {mealTypes.length > 0 && (
        <div className="checkout-summary-slots">
          {mealTypes.map((mealType) => (
            <div key={mealType}>
              <span>{mealType === 'breakfast' ? 'Breakfast' : 'Lunch'} delivery</span>
              <strong>{selectedSlots[mealType] ?? 'Choose a slot'}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="checkout-price-line"><span>Subtotal</span><strong>₹{subtotal}</strong></div>
      {deliveryCharge !== null && (
        <div className="checkout-price-line"><span>Delivery charge</span><strong>₹{deliveryCharge}</strong></div>
      )}
      <div className="checkout-price-total"><span>Total payable</span><strong>₹{total}</strong></div>
    </section>
  )
}

function PaymentMethodCard() {
  return (
    <section className="checkout-card checkout-payment-method">
      <span className="checkout-card-icon"><CreditCard size={18} /></span>
      <div><strong>Online payment</strong><small>Secure payment gateway connection required</small></div>
      <LockKeyhole size={16} />
    </section>
  )
}

export function OrderConfirmationScreen({
  confirmation,
  onReturnHome,
  onViewOrders,
}: {
  confirmation: PaidOrderConfirmation
  onReturnHome: () => void
  onViewOrders: () => void
}) {
  const mealTypes = getCartMealTypes(
    Object.fromEntries(confirmation.items.map((entry) => [entry.item.id, entry])),
  )
  const subtotal = confirmation.items.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  )

  return (
    <section aria-label="Order confirmation" className="checkout-flow checkout-confirmation">
      <div className="confirmation-mark"><CheckCircle2 size={32} /></div>
      <span className="checkout-step-label">PAYMENT CONFIRMED</span>
      <h1>Order confirmed!</h1>
      <p>Your payment was successful. Your order is on its way.</p>
      <div className="checkout-card confirmation-order-reference">
        <small>ORDER REFERENCE</small>
        <strong>{confirmation.orderReference}</strong>
      </div>
      <div className="checkout-card confirmation-details">
        <strong>{confirmation.deliveryAddressType} · {confirmation.deliveryAddress}</strong>
        {mealTypes.map((type) => (
          <span key={type}>
            {type === 'breakfast' ? 'Breakfast' : 'Lunch'} · {confirmation.deliverySlots[type]}
          </span>
        ))}
        <strong>Total · ₹{confirmation.total}</strong>
      </div>
      <OrderSummary
        cartItems={confirmation.items}
        deliveryCharge={confirmation.total - subtotal}
        mealTypes={mealTypes}
        selectedSlots={confirmation.deliverySlots}
        subtotal={subtotal}
        total={confirmation.total}
      />
      <div className="confirmation-actions">
        <button className="checkout-back-button" onClick={onViewOrders} type="button">
          View orders <ArrowRight size={15} />
        </button>
        <button className="checkout-primary-button" onClick={onReturnHome} type="button">
          Return home
        </button>
      </div>
    </section>
  )
}

export default CheckoutFlow
