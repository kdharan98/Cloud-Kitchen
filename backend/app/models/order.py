from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.database.base import Base
from app.models.enums import OrderItemKind, OrderStatus, OrderType, enum_column

if TYPE_CHECKING:
    from app.models.catalog import DeliveryZone, MealPeriod, MenuItem
    from app.models.delivery import DeliveryAssignment
    from app.models.identity import Address, User
    from app.models.inventory import InventoryReservation
    from app.models.payments import Payment
    from app.models.subscription import ScheduledMeal, ScheduledMealAddon, ScheduledMealItem


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        ForeignKeyConstraint(
            [
                "scheduled_meal_id",
                "customer_id",
                "delivery_zone_id",
                "service_date",
                "meal_period_id",
                "delivery_zone_code_snapshot",
                "delivery_zone_name_snapshot",
            ],
            [
                "scheduled_meals.id",
                "scheduled_meals.customer_id",
                "scheduled_meals.delivery_zone_id",
                "scheduled_meals.service_date",
                "scheduled_meals.meal_period_id",
                "scheduled_meals.delivery_zone_code_snapshot",
                "scheduled_meals.delivery_zone_name_snapshot",
            ],
            name="fk_orders_scheduled_meal_identity",
        ),
        UniqueConstraint("order_number", name="uq_orders_order_number"),
        UniqueConstraint("id", "order_type", name="uq_orders_id_order_type"),
        UniqueConstraint("scheduled_meal_id", name="uq_orders_scheduled_meal"),
        UniqueConstraint("id", "scheduled_meal_id", name="uq_orders_id_scheduled_meal"),
        CheckConstraint(
            "(order_type = 'ONE_TIME' AND scheduled_meal_id IS NULL) OR "
            "(order_type = 'SUBSCRIPTION_MEAL' AND scheduled_meal_id IS NOT NULL)",
            name="ck_orders_type_schedule",
        ),
        CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_nonnegative"),
        CheckConstraint("delivery_fee >= 0", name="ck_orders_delivery_fee_nonnegative"),
        CheckConstraint("discount_amount >= 0", name="ck_orders_discount_nonnegative"),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_nonnegative"),
        Index(
            "ix_orders_scheduled_meal_identity",
            "scheduled_meal_id",
            "customer_id",
            "delivery_zone_id",
            "service_date",
            "meal_period_id",
            "delivery_zone_code_snapshot",
            "delivery_zone_name_snapshot",
        ),
        Index("ix_orders_customer_created", "customer_id", "created_at"),
        Index("ix_orders_status_service_date", "status", "service_date"),
        Index("ix_orders_delivery_zone_service_date", "delivery_zone_id", "service_date"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    order_number: Mapped[str] = mapped_column(String(40), nullable=False)
    customer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    order_type: Mapped[OrderType] = mapped_column(
        enum_column(OrderType, "order_type"), nullable=False
    )
    scheduled_meal_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True)
    )
    delivery_zone_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("delivery_zones.id", ondelete="RESTRICT"), nullable=False
    )
    delivery_zone_code_snapshot: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_zone_name_snapshot: Mapped[str] = mapped_column(String(120), nullable=False)
    address_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("addresses.id", ondelete="RESTRICT")
    )
    delivery_address_snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_period_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_periods.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        enum_column(OrderStatus, "order_status"),
        nullable=False,
        default=OrderStatus.PENDING_PAYMENT,
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0")
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0")
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[User] = relationship(
        back_populates="orders", foreign_keys=[customer_id]
    )
    scheduled_meal: Mapped[ScheduledMeal | None] = relationship(
        back_populates="order",
        primaryjoin="ScheduledMeal.id == foreign(Order.scheduled_meal_id)",
        uselist=False,
    )
    delivery_zone: Mapped[DeliveryZone] = relationship(back_populates="orders")
    address: Mapped[Address | None] = relationship(back_populates="orders")
    meal_period: Mapped[MealPeriod] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order",
        primaryjoin="Order.id == foreign(OrderItem.order_id)",
    )
    payments: Mapped[list[Payment]] = relationship(
        back_populates="order", foreign_keys="Payment.order_id"
    )
    status_history: Mapped[list[OrderStatusHistory]] = relationship(
        back_populates="order"
    )
    delivery_assignments: Mapped[list[DeliveryAssignment]] = relationship(
        back_populates="order"
    )
    inventory_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="order", foreign_keys="InventoryReservation.order_id"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["order_id", "scheduled_meal_id"],
            ["orders.id", "orders.scheduled_meal_id"],
            name="fk_order_items_order_schedule",
        ),
        ForeignKeyConstraint(
            ["scheduled_meal_item_id", "scheduled_meal_id", "menu_item_id"],
            [
                "scheduled_meal_items.id",
                "scheduled_meal_items.scheduled_meal_id",
                "scheduled_meal_items.menu_item_id",
            ],
            name="fk_order_items_scheduled_item_same_meal",
        ),
        ForeignKeyConstraint(
            ["scheduled_meal_addon_id", "scheduled_meal_id", "menu_item_id"],
            [
                "scheduled_meal_addons.id",
                "scheduled_meal_addons.scheduled_meal_id",
                "scheduled_meal_addons.menu_item_id",
            ],
            name="fk_order_items_addon_same_meal",
        ),
        UniqueConstraint(
            "scheduled_meal_item_id", name="uq_order_items_scheduled_item"
        ),
        UniqueConstraint("scheduled_meal_addon_id", name="uq_order_items_scheduled_addon"),
        UniqueConstraint("id", "order_id", name="uq_order_items_id_order"),
        UniqueConstraint("id", "order_id", "menu_item_id", name="uq_order_items_id_order_item"),
        UniqueConstraint(
            "id",
            "order_id",
            "scheduled_meal_id",
            "menu_item_id",
            name="uq_order_items_id_order_schedule_item",
        ),
        UniqueConstraint(
            "id",
            "order_id",
            "scheduled_meal_id",
            "menu_item_id",
            "scheduled_meal_item_id",
            name="uq_order_items_exact_scheduled_item",
        ),
        UniqueConstraint(
            "id",
            "order_id",
            "scheduled_meal_id",
            "menu_item_id",
            "scheduled_meal_addon_id",
            name="uq_order_items_exact_scheduled_addon",
        ),
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint(
            "unit_price_snapshot >= 0", name="ck_order_items_price_nonnegative"
        ),
        CheckConstraint(
            "line_total = quantity * unit_price_snapshot",
            name="ck_order_items_line_total_matches_snapshot",
        ),
        CheckConstraint("line_total >= 0", name="ck_order_items_total_nonnegative"),
        CheckConstraint(
            "(scheduled_meal_id IS NULL AND scheduled_meal_item_id IS NULL "
            "AND scheduled_meal_addon_id IS NULL) OR "
            "(scheduled_meal_id IS NOT NULL AND "
            "((scheduled_meal_item_id IS NOT NULL AND scheduled_meal_addon_id IS NULL) OR "
            "(scheduled_meal_item_id IS NULL AND scheduled_meal_addon_id IS NOT NULL)))",
            name="ck_order_items_schedule_source",
        ),
        CheckConstraint(
            "(scheduled_meal_id IS NULL AND item_kind = 'ONE_TIME') OR "
            "(scheduled_meal_item_id IS NOT NULL AND item_kind = 'INCLUDED') OR "
            "(scheduled_meal_addon_id IS NOT NULL AND item_kind = 'ADD_ON')",
            name="ck_order_items_kind_matches_source",
        ),
        Index("ix_order_items_order_id", "order_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    scheduled_meal_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    scheduled_meal_item_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    scheduled_meal_addon_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    item_kind: Mapped[OrderItemKind] = mapped_column(
        enum_column(OrderItemKind, "order_item_kind"), nullable=False
    )
    sku_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    item_name_snapshot: Mapped[str] = mapped_column(String(180), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    customization_snapshot: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False, default=list
    )

    order: Mapped[Order] = relationship(
        back_populates="items",
        primaryjoin="Order.id == foreign(OrderItem.order_id)",
    )
    menu_item: Mapped[MenuItem] = relationship(back_populates="order_items")
    scheduled_meal_item: Mapped[ScheduledMealItem | None] = relationship(
        primaryjoin="ScheduledMealItem.id == foreign(OrderItem.scheduled_meal_item_id)",
        viewonly=True,
    )
    scheduled_meal_addon: Mapped[ScheduledMealAddon | None] = relationship(
        primaryjoin="ScheduledMealAddon.id == foreign(OrderItem.scheduled_meal_addon_id)",
        viewonly=True,
    )
    inventory_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="order_item",
        primaryjoin="OrderItem.id == foreign(InventoryReservation.order_item_id)",
    )


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    __table_args__ = (Index("ix_order_status_history_order_created", "order_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    from_status: Mapped[OrderStatus | None] = mapped_column(
        enum_column(OrderStatus, "order_history_status")
    )
    to_status: Mapped[OrderStatus] = mapped_column(
        enum_column(OrderStatus, "order_history_status"), nullable=False
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    order: Mapped[Order] = relationship(back_populates="status_history")
