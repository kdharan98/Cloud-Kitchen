from __future__ import annotations

from datetime import date, datetime
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
    Index,
    Integer,
    Numeric,
    String,
    Table,
    UniqueConstraint,
    Uuid,
    column,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint, JSONB
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.database.base import Base
from app.models.enums import (
    AddonStatus,
    EntitlementStatus,
    PauseStatus,
    ScheduledMealStatus,
    SubscriptionStatus,
    enum_column,
)

if TYPE_CHECKING:
    from app.models.cart import CartItem
    from app.models.catalog import DeliveryZone, MealPeriod, MenuItem
    from app.models.identity import Address, User
    from app.models.inventory import InventoryReservation
    from app.models.order import Order, OrderItem
    from app.models.payments import Payment

meal_plan_meal_periods = Table(
    "meal_plan_meal_periods",
    Base.metadata,
    Column(
        "meal_plan_id",
        Uuid(as_uuid=True),
        ForeignKey("meal_plans.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "meal_period_id",
        Uuid(as_uuid=True),
        ForeignKey("meal_periods.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)

meal_plan_menu_items = Table(
    "meal_plan_menu_items",
    Base.metadata,
    Column(
        "meal_plan_id",
        Uuid(as_uuid=True),
        ForeignKey("meal_plans.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "menu_item_id",
        Uuid(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class MealPlan(Base):
    __tablename__ = "meal_plans"
    __table_args__ = (
        CheckConstraint(
            "duration_unit IN ('WEEK', 'MONTH')", name="ck_meal_plans_duration_unit"
        ),
        CheckConstraint("duration_count > 0", name="ck_meal_plans_duration_count"),
        CheckConstraint("included_meals > 0", name="ck_meal_plans_included_meals"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    duration_unit: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_count: Mapped[int] = mapped_column(Integer, nullable=False)
    included_meals: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    prices: Mapped[list[MealPlanPrice]] = relationship(back_populates="meal_plan")
    meal_periods: Mapped[list[MealPeriod]] = relationship(
        secondary=meal_plan_meal_periods, back_populates="meal_plans"
    )
    selectable_items: Mapped[list[MenuItem]] = relationship(
        secondary=meal_plan_menu_items, back_populates="meal_plans"
    )
    subscriptions: Mapped[list[Subscription]] = relationship(back_populates="meal_plan")


class MealPlanPrice(Base):
    __tablename__ = "meal_plan_prices"
    __table_args__ = (
        UniqueConstraint("id", "meal_plan_id", name="uq_meal_plan_prices_id_plan"),
        CheckConstraint("amount > 0", name="ck_meal_plan_prices_amount_positive"),
        CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name="ck_meal_plan_prices_valid_period",
        ),
        ExcludeConstraint(
            ("meal_plan_id", "="),
            (func.tstzrange(column("valid_from"), column("valid_until"), "[)"), "&&"),
            using="gist",
            name="ex_meal_plan_prices_no_overlap",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    meal_plan_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_plans.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    meal_plan: Mapped[MealPlan] = relationship(back_populates="prices")
    subscriptions: Mapped[list[Subscription]] = relationship(
        back_populates="meal_plan_price",
        primaryjoin=(
            "and_(MealPlanPrice.id == foreign(Subscription.meal_plan_price_id), "
            "MealPlanPrice.meal_plan_id == Subscription.meal_plan_id)"
        ),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["meal_plan_price_id", "meal_plan_id"],
            ["meal_plan_prices.id", "meal_plan_prices.meal_plan_id"],
            name="fk_subscriptions_price_same_plan",
        ),
        UniqueConstraint("id", "customer_id", name="uq_subscriptions_id_customer"),
        CheckConstraint(
            "original_ends_on > original_starts_on",
            name="ck_subscriptions_original_term",
        ),
        CheckConstraint(
            "adjusted_ends_on >= original_ends_on",
            name="ck_subscriptions_adjusted_term",
        ),
        CheckConstraint(
            "included_meals_total_snapshot > 0",
            name="ck_subscriptions_entitlement_total",
        ),
        CheckConstraint("plan_price_snapshot > 0", name="ck_subscriptions_price_positive"),
        Index(
            "ix_subscriptions_meal_plan_price",
            "meal_plan_price_id",
            "meal_plan_id",
        ),
        Index("ix_subscriptions_customer_status", "customer_id", "status"),
        Index("ix_subscriptions_status_end", "status", "adjusted_ends_on"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    meal_plan_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_plans.id", ondelete="RESTRICT"), nullable=False
    )
    meal_plan_price_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        enum_column(SubscriptionStatus, "subscription_status"),
        nullable=False,
        default=SubscriptionStatus.PENDING_PAYMENT,
    )
    original_starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    original_ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    adjusted_ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    plan_name_snapshot: Mapped[str] = mapped_column(String(160), nullable=False)
    duration_unit_snapshot: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_count_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    included_meals_total_snapshot: Mapped[int] = mapped_column(Integer, nullable=False)
    plan_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[User] = relationship(
        back_populates="subscriptions", foreign_keys=[customer_id]
    )
    meal_plan: Mapped[MealPlan] = relationship(back_populates="subscriptions")
    meal_plan_price: Mapped[MealPlanPrice] = relationship(
        back_populates="subscriptions",
        primaryjoin=(
            "and_(MealPlanPrice.id == foreign(Subscription.meal_plan_price_id), "
            "MealPlanPrice.meal_plan_id == Subscription.meal_plan_id)"
        ),
    )
    entitlements: Mapped[list[SubscriptionEntitlement]] = relationship(
        back_populates="subscription"
    )
    pauses: Mapped[list[SubscriptionPause]] = relationship(back_populates="subscription")
    scheduled_meals: Mapped[list[ScheduledMeal]] = relationship(
        back_populates="subscription",
        primaryjoin=(
            "and_(Subscription.id == foreign(ScheduledMeal.subscription_id), "
            "Subscription.customer_id == ScheduledMeal.customer_id)"
        ),
    )
    payments: Mapped[list[Payment]] = relationship(
        back_populates="subscription", foreign_keys="Payment.subscription_id"
    )
    pause_extensions: Mapped[list[SubscriptionPauseExtension]] = relationship(
        back_populates="subscription"
    )


class SubscriptionEntitlement(Base):
    __tablename__ = "subscription_entitlements"
    __table_args__ = (
        UniqueConstraint(
            "subscription_id", "entitlement_number", name="uq_subscription_entitlement_number"
        ),
        UniqueConstraint("id", "subscription_id", name="uq_entitlement_id_subscription"),
        CheckConstraint("entitlement_number > 0", name="ck_entitlement_number_positive"),
        Index("ix_entitlements_subscription_state", "subscription_id", "state"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    subscription_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False
    )
    entitlement_number: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[EntitlementStatus] = mapped_column(
        enum_column(EntitlementStatus, "entitlement_status"),
        nullable=False,
        default=EntitlementStatus.AVAILABLE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    subscription: Mapped[Subscription] = relationship(back_populates="entitlements")
    scheduled_meal: Mapped[ScheduledMeal | None] = relationship(
        back_populates="entitlement",
        foreign_keys="ScheduledMeal.entitlement_id",
        uselist=False,
    )


class SubscriptionPause(Base):
    __tablename__ = "subscription_pauses"
    __table_args__ = (
        UniqueConstraint("id", "subscription_id", name="uq_pause_id_subscription"),
        CheckConstraint("resumes_on > starts_on", name="ck_pause_period_positive"),
        ExcludeConstraint(
            ("subscription_id", "="),
            (func.daterange(column("starts_on"), column("resumes_on"), "[)"), "&&"),
            using="gist",
            where=text("status IN ('APPROVED', 'COMPLETED')"),
            name="ex_subscription_pauses_no_overlap",
        ),
        Index("ix_subscription_pauses_subscription_status", "subscription_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    subscription_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    resumes_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[PauseStatus] = mapped_column(
        enum_column(PauseStatus, "subscription_pause_status"),
        nullable=False,
        default=PauseStatus.REQUESTED,
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    subscription: Mapped[Subscription] = relationship(back_populates="pauses")
    approved_by: Mapped[User | None] = relationship(foreign_keys=[approved_by_user_id])
    extension: Mapped[SubscriptionPauseExtension | None] = relationship(
        back_populates="pause",
        uselist=False,
        primaryjoin=(
            "and_(SubscriptionPause.id == "
            "foreign(SubscriptionPauseExtension.pause_id), "
            "SubscriptionPause.subscription_id == "
            "SubscriptionPauseExtension.subscription_id)"
        ),
    )
    held_meals: Mapped[list[ScheduledMeal]] = relationship(
        back_populates="held_by_pause",
        foreign_keys="ScheduledMeal.held_by_pause_id",
    )


class SubscriptionPauseExtension(Base):
    __tablename__ = "subscription_pause_extensions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["pause_id", "subscription_id"],
            ["subscription_pauses.id", "subscription_pauses.subscription_id"],
            name="fk_pause_extension_same_subscription",
        ),
        UniqueConstraint("pause_id", name="uq_pause_extension_pause"),
        CheckConstraint("extension_days > 0", name="ck_pause_extension_days_positive"),
        CheckConstraint(
            "new_adjusted_ends_on = old_adjusted_ends_on + extension_days",
            name="ck_pause_extension_end_date",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    pause_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    subscription_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False
    )
    extension_days: Mapped[int] = mapped_column(Integer, nullable=False)
    old_adjusted_ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    new_adjusted_ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    pause: Mapped[SubscriptionPause] = relationship(
        back_populates="extension",
        primaryjoin=(
            "and_(SubscriptionPause.id == "
            "foreign(SubscriptionPauseExtension.pause_id), "
            "SubscriptionPause.subscription_id == "
            "SubscriptionPauseExtension.subscription_id)"
        ),
    )
    subscription: Mapped[Subscription] = relationship(back_populates="pause_extensions")


class ScheduledMeal(Base):
    __tablename__ = "scheduled_meals"
    __table_args__ = (
        ForeignKeyConstraint(
            ["subscription_id", "customer_id"],
            ["subscriptions.id", "subscriptions.customer_id"],
            name="fk_scheduled_meals_subscription_customer",
        ),
        ForeignKeyConstraint(
            ["entitlement_id", "subscription_id"],
            ["subscription_entitlements.id", "subscription_entitlements.subscription_id"],
            name="fk_scheduled_meals_entitlement_same_subscription",
        ),
        ForeignKeyConstraint(
            ["held_by_pause_id", "subscription_id"],
            ["subscription_pauses.id", "subscription_pauses.subscription_id"],
            name="fk_scheduled_meals_pause_same_subscription",
        ),
        UniqueConstraint(
            "subscription_id", "service_date", "meal_period_id", name="uq_scheduled_meal_slot"
        ),
        UniqueConstraint("entitlement_id", name="uq_scheduled_meal_entitlement"),
        UniqueConstraint("id", "subscription_id", name="uq_scheduled_meal_id_subscription"),
        UniqueConstraint(
            "id",
            "customer_id",
            "delivery_zone_id",
            "service_date",
            "meal_period_id",
            "delivery_zone_code_snapshot",
            "delivery_zone_name_snapshot",
            name="uq_scheduled_meal_order_identity",
        ),
        CheckConstraint(
            "(status = 'PAUSED' AND held_by_pause_id IS NOT NULL) OR "
            "(status <> 'PAUSED' AND held_by_pause_id IS NULL)",
            name="ck_scheduled_meal_pause_reference",
        ),
        Index("ix_scheduled_meals_subscription_date", "subscription_id", "service_date"),
        Index(
            "ix_scheduled_meals_subscription_customer",
            "subscription_id",
            "customer_id",
        ),
        Index("ix_scheduled_meals_status_date", "status", "service_date"),
        Index("ix_scheduled_meals_delivery_zone_date", "delivery_zone_id", "service_date"),
        Index("ix_scheduled_meals_customer_id", "customer_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    subscription_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
    customer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    entitlement_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_period_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_periods.id", ondelete="RESTRICT"), nullable=False
    )
    delivery_zone_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("delivery_zones.id", ondelete="RESTRICT"), nullable=False
    )
    delivery_zone_code_snapshot: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_zone_name_snapshot: Mapped[str] = mapped_column(String(120), nullable=False)
    address_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("addresses.id", ondelete="RESTRICT"), nullable=False
    )
    delivery_address_snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    status: Mapped[ScheduledMealStatus] = mapped_column(
        enum_column(ScheduledMealStatus, "scheduled_meal_status"),
        nullable=False,
        default=ScheduledMealStatus.SCHEDULED,
    )
    skip_reason: Mapped[str | None] = mapped_column(String(500))
    held_by_pause_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    subscription: Mapped[Subscription] = relationship(
        back_populates="scheduled_meals",
        primaryjoin=(
            "and_(Subscription.id == foreign(ScheduledMeal.subscription_id), "
            "Subscription.customer_id == ScheduledMeal.customer_id)"
        ),
    )
    customer: Mapped[User] = relationship(foreign_keys=[customer_id])
    entitlement: Mapped[SubscriptionEntitlement] = relationship(
        back_populates="scheduled_meal", foreign_keys=[entitlement_id]
    )
    meal_period: Mapped[MealPeriod] = relationship(back_populates="scheduled_meals")
    delivery_zone: Mapped[DeliveryZone] = relationship(back_populates="scheduled_meals")
    address: Mapped[Address] = relationship(back_populates="scheduled_meals")
    held_by_pause: Mapped[SubscriptionPause | None] = relationship(
        back_populates="held_meals", foreign_keys=[held_by_pause_id]
    )
    included_items: Mapped[list[ScheduledMealItem]] = relationship(back_populates="scheduled_meal")
    customizations: Mapped[list[ScheduledMealCustomization]] = relationship(
        back_populates="scheduled_meal"
    )
    addons: Mapped[list[ScheduledMealAddon]] = relationship(back_populates="scheduled_meal")
    events: Mapped[list[ScheduledMealEvent]] = relationship(back_populates="scheduled_meal")
    order: Mapped[Order | None] = relationship(
        back_populates="scheduled_meal",
        primaryjoin="ScheduledMeal.id == foreign(Order.scheduled_meal_id)",
        uselist=False,
    )
    payments: Mapped[list[Payment]] = relationship(
        back_populates="scheduled_meal", foreign_keys="Payment.scheduled_meal_id"
    )
    inventory_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="scheduled_meal",
        foreign_keys="InventoryReservation.scheduled_meal_id",
    )


class ScheduledMealItem(Base):
    __tablename__ = "scheduled_meal_items"
    __table_args__ = (
        UniqueConstraint(
            "id", "scheduled_meal_id", "menu_item_id", name="uq_scheduled_item_id_meal_menu"
        ),
        CheckConstraint("quantity > 0", name="ck_scheduled_meal_items_quantity"),
        Index("ix_scheduled_meal_items_schedule", "scheduled_meal_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    scheduled_meal_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("scheduled_meals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    item_name_snapshot: Mapped[str] = mapped_column(String(180), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    scheduled_meal: Mapped[ScheduledMeal] = relationship(back_populates="included_items")
    menu_item: Mapped[MenuItem] = relationship(back_populates="scheduled_items")
    inventory_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="scheduled_meal_item",
        foreign_keys="InventoryReservation.scheduled_meal_item_id",
    )


class ScheduledMealCustomization(Base):
    __tablename__ = "scheduled_meal_customizations"
    __table_args__ = (
        Index("ix_scheduled_customizations_meal", "scheduled_meal_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    scheduled_meal_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("scheduled_meals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    menu_item_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT")
    )
    customization_key: Mapped[str] = mapped_column(String(80), nullable=False)
    selected_value_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500))

    scheduled_meal: Mapped[ScheduledMeal] = relationship(back_populates="customizations")
    menu_item: Mapped[MenuItem | None] = relationship()


class ScheduledMealAddon(Base):
    __tablename__ = "scheduled_meal_addons"
    __table_args__ = (
        ForeignKeyConstraint(
            ["payment_id", "scheduled_meal_id"],
            ["payments.id", "payments.scheduled_meal_id"],
            name="fk_scheduled_meal_addons_payment_same_meal",
        ),
        UniqueConstraint(
            "id", "scheduled_meal_id", "menu_item_id", name="uq_scheduled_addon_id_meal_menu"
        ),
        CheckConstraint("quantity > 0", name="ck_scheduled_meal_addons_quantity"),
        CheckConstraint("unit_price_snapshot > 0", name="ck_scheduled_meal_addons_price"),
        CheckConstraint(
            "(status IN ('PAID', 'FULFILLED', 'REFUNDED', 'REFUND_REQUIRED') "
            "AND payment_id IS NOT NULL) OR "
            "status = 'PENDING_PAYMENT' OR "
            "(status = 'REMOVED' AND payment_id IS NULL)",
            name="ck_scheduled_meal_addons_payment_status",
        ),
        Index("ix_scheduled_meal_addons_schedule_status", "scheduled_meal_id", "status"),
        Index("ix_scheduled_meal_addons_payment_id", "payment_id", "scheduled_meal_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    scheduled_meal_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("scheduled_meals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    payment_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    item_name_snapshot: Mapped[str] = mapped_column(String(180), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[AddonStatus] = mapped_column(
        enum_column(AddonStatus, "scheduled_meal_addon_status"),
        nullable=False,
        default=AddonStatus.PENDING_PAYMENT,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    scheduled_meal: Mapped[ScheduledMeal] = relationship(back_populates="addons")
    menu_item: Mapped[MenuItem] = relationship(back_populates="scheduled_addons")
    payment: Mapped[Payment | None] = relationship(
        foreign_keys=[payment_id], primaryjoin="Payment.id == foreign(ScheduledMealAddon.payment_id)"
    )
    order_items: Mapped[list[OrderItem]] = relationship(
        primaryjoin="ScheduledMealAddon.id == foreign(OrderItem.scheduled_meal_addon_id)",
        viewonly=True,
    )
    inventory_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="scheduled_meal_addon",
        foreign_keys="InventoryReservation.scheduled_meal_addon_id",
    )


class ScheduledMealEvent(Base):
    __tablename__ = "scheduled_meal_events"
    __table_args__ = (Index("ix_scheduled_meal_events_meal_created", "scheduled_meal_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    scheduled_meal_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("scheduled_meals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    from_service_date: Mapped[date | None] = mapped_column(Date)
    to_service_date: Mapped[date | None] = mapped_column(Date)
    from_meal_period_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_periods.id", ondelete="RESTRICT")
    )
    to_meal_period_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("meal_periods.id", ondelete="RESTRICT")
    )
    from_address_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("addresses.id", ondelete="RESTRICT")
    )
    to_address_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("addresses.id", ondelete="RESTRICT")
    )
    from_address_snapshot: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    to_address_snapshot: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    from_delivery_zone_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("delivery_zones.id", ondelete="RESTRICT")
    )
    to_delivery_zone_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("delivery_zones.id", ondelete="RESTRICT")
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    scheduled_meal: Mapped[ScheduledMeal] = relationship(back_populates="events")
    actor: Mapped[User | None] = relationship()
