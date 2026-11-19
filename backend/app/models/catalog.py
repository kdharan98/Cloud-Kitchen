from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    Table,
    Time,
    UniqueConstraint,
    Uuid,
    column,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import MealPeriodCode, enum_column

if TYPE_CHECKING:
    from app.models.cart import CartItem
    from app.models.inventory import InventoryReservation
    from app.models.order import Order, OrderItem
    from app.models.subscription import (
        MealPlan,
        ScheduledMeal,
        ScheduledMealAddon,
        ScheduledMealItem,
    )

menu_item_categories = Table(
    "menu_item_categories",
    Base.metadata,
    Column(
        "menu_item_id",
        Uuid(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "category_id",
        Uuid(as_uuid=True),
        ForeignKey("food_categories.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    areas: Mapped[list[DeliveryZoneArea]] = relationship(back_populates="zone")
    scheduled_meals: Mapped[list[ScheduledMeal]] = relationship(back_populates="delivery_zone")
    orders: Mapped[list[Order]] = relationship(back_populates="delivery_zone")


class DeliveryZoneArea(Base):
    __tablename__ = "delivery_zone_areas"
    __table_args__ = (
        UniqueConstraint(
            "zone_id", "locality_normalized", "postal_code", name="uq_delivery_zone_area"
        ),
        CheckConstraint(
            "locality_normalized = lower(locality_normalized)",
            name="ck_delivery_zone_area_locality_normalized",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    zone_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("delivery_zones.id", ondelete="RESTRICT"),
        nullable=False,
    )
    locality_normalized: Mapped[str] = mapped_column(String(120), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(16), nullable=False)

    zone: Mapped[DeliveryZone] = relationship(back_populates="areas")


class MealPeriod(Base):
    __tablename__ = "meal_periods"
    __table_args__ = (
        CheckConstraint("delivery_start_time < delivery_end_time", name="ck_meal_period_window"),
        CheckConstraint("cutoff_lead_minutes >= 0", name="ck_meal_period_cutoff_lead"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[MealPeriodCode] = mapped_column(
        enum_column(MealPeriodCode, "meal_period_code"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    delivery_start_time: Mapped[time] = mapped_column(Time, nullable=False)
    delivery_end_time: Mapped[time] = mapped_column(Time, nullable=False)
    cutoff_lead_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    availability: Mapped[list[MenuItemAvailability]] = relationship(back_populates="meal_period")
    scheduled_meals: Mapped[list[ScheduledMeal]] = relationship(back_populates="meal_period")
    orders: Mapped[list[Order]] = relationship(back_populates="meal_period")
    meal_plans: Mapped[list[MealPlan]] = relationship(
        secondary="meal_plan_meal_periods", back_populates="meal_periods"
    )


class FoodCategory(Base):
    __tablename__ = "food_categories"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_food_categories_slug"),
        CheckConstraint("sort_order >= 0", name="ck_food_categories_sort_order"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    parent_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("food_categories.id", ondelete="SET NULL")
    )
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    parent: Mapped[FoodCategory | None] = relationship(
        back_populates="children", remote_side="FoodCategory.id"
    )
    children: Mapped[list[FoodCategory]] = relationship(back_populates="parent")
    menu_items: Mapped[list[MenuItem]] = relationship(
        secondary=menu_item_categories, back_populates="categories"
    )


class MenuItem(Base):
    __tablename__ = "menu_items"
    __table_args__ = (
        CheckConstraint("is_vegetarian IS TRUE", name="ck_menu_items_vegetarian_only"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    sku: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    is_vegetarian: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    categories: Mapped[list[FoodCategory]] = relationship(
        secondary=menu_item_categories, back_populates="menu_items"
    )
    prices: Mapped[list[MenuItemPrice]] = relationship(back_populates="menu_item")
    availability: Mapped[list[MenuItemAvailability]] = relationship(back_populates="menu_item")
    cart_items: Mapped[list[CartItem]] = relationship(back_populates="menu_item")
    order_items: Mapped[list[OrderItem]] = relationship(back_populates="menu_item")
    scheduled_items: Mapped[list[ScheduledMealItem]] = relationship(
        back_populates="menu_item"
    )
    scheduled_addons: Mapped[list[ScheduledMealAddon]] = relationship(
        back_populates="menu_item"
    )
    meal_plans: Mapped[list[MealPlan]] = relationship(
        secondary="meal_plan_menu_items", back_populates="selectable_items"
    )


class MenuItemPrice(Base):
    __tablename__ = "menu_item_prices"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_menu_item_prices_amount_positive"),
        CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name="ck_menu_item_prices_valid_period",
        ),
        ExcludeConstraint(
            ("menu_item_id", "="),
            (func.tstzrange(column("valid_from"), column("valid_until"), "[)"), "&&"),
            using="gist",
            name="ex_menu_item_prices_no_overlap",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    menu_item: Mapped[MenuItem] = relationship(back_populates="prices")


class MenuItemAvailability(Base):
    __tablename__ = "menu_item_availability"
    __table_args__ = (
        UniqueConstraint(
            "menu_item_id", "service_date", "meal_period_id", name="uq_menu_item_availability_slot"
        ),
        UniqueConstraint("id", "menu_item_id", name="uq_menu_item_availability_id_item"),
        CheckConstraint(
            "quantity_limit IS NULL OR quantity_limit > 0",
            name="ck_menu_item_availability_limit_positive",
        ),
        CheckConstraint("quantity_reserved >= 0", name="ck_menu_item_availability_reserved_nonnegative"),
        CheckConstraint("quantity_fulfilled >= 0", name="ck_menu_item_availability_fulfilled_nonnegative"),
        CheckConstraint(
            "quantity_limit IS NULL OR quantity_reserved + quantity_fulfilled <= quantity_limit",
            name="ck_menu_item_availability_capacity",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_period_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_periods.id", ondelete="RESTRICT"), nullable=False
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    quantity_limit: Mapped[int | None] = mapped_column(Integer)
    quantity_reserved: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    quantity_fulfilled: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )

    menu_item: Mapped[MenuItem] = relationship(back_populates="availability")
    meal_period: Mapped[MealPeriod] = relationship(back_populates="availability")
    reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="availability"
    )
