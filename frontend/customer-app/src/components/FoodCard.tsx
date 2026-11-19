import { Check, Leaf, Minus, Plus } from 'lucide-react'
import type { MenuItem } from '../types/menu'

interface FoodCardProps {
  item: MenuItem
  quantity: number
  onAdd: () => void
  onRemove: () => void
  selected?: boolean
  onSelect?: () => void
}

function FoodCard({ item, quantity, onAdd, onRemove, selected = false, onSelect }: FoodCardProps) {
  return (
    <article className={`food-card${selected ? ' is-selected' : ''}`}>
      <div className="food-card-image">
        <img alt={item.name} loading="lazy" src={item.image} />
        <span className="veg-mark" aria-label="Vegetarian">
          <Leaf aria-hidden="true" size={12} />
        </span>
      </div>
      <div className="food-card-content">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="food-card-footer">
          <strong>₹{item.price}</strong>
          {onSelect ? (
            <button
              aria-pressed={selected}
              className={`food-select-button${selected ? ' is-selected' : ''}`}
              onClick={onSelect}
              type="button"
            >
              {selected ? <><Check size={13} /> Selected</> : <><Plus size={13} /> Choose</>}
            </button>
          ) : quantity > 0 ? (
            <div className="quantity-control" aria-label={`${quantity} in cart`}>
              <button aria-label={`Remove one ${item.name}`} onClick={onRemove} type="button">
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button aria-label={`Add one ${item.name}`} onClick={onAdd} type="button">
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button className="add-button" onClick={onAdd} type="button">
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default FoodCard
