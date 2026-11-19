import type { CartItem, MenuMealType } from '../../types/menu'

export function getCartMealTypes(cart: Record<string, CartItem>): MenuMealType[] {
  const types = new Set(
    Object.values(cart)
      .filter(({ quantity }) => quantity > 0)
      .map(({ item }) => item.mealType)
      .filter((type): type is MenuMealType => Boolean(type)),
  )

  return (['breakfast', 'lunch'] as const).filter((type) => types.has(type))
}
