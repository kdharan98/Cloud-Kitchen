import { ArrowRight, ShoppingBag } from 'lucide-react'

interface CartBarProps {
  itemCount: number
  total: number
  onViewCart: () => void
}

function CartBar({ itemCount, total, onViewCart }: CartBarProps) {
  if (itemCount === 0) return null

  return (
    <div className="cart-bar">
      <div className="cart-bar-count">
        <ShoppingBag aria-hidden="true" size={19} />
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>
      <strong>₹{total}</strong>
      <button onClick={onViewCart} type="button">
        View Cart <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  )
}

export default CartBar
