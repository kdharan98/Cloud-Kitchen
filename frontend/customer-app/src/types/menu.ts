export type CuisineCategory =
  | 'South Indian'
  | 'North Indian'
  | 'Chinese'
  | 'Chaat'
  | 'Snacks'
  | 'Drinks'

export type MenuMealType = 'breakfast' | 'lunch'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: CuisineCategory
  section: string
  mealType?: MenuMealType
  image: string
}

export interface CartItem {
  item: MenuItem
  quantity: number
}
