from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import (
    PaymentMethod,
    PaymentPurpose,
    PaymentStatus,
    PaymentTransactionStatus,
    PaymentTransactionType,
    WebhookStatus,
    enum_column,
)

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.subscription import ScheduledMeal, ScheduledMealAddon, Subscription


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("id", "scheduled_meal_id", name="uq_payments_id_scheduled_meal"),
        CheckConstraint(
            "num_nonnulls(order_id, subscription_id, scheduled_meal_id) = 1",
            name="ck_payments_exactly_one_target",
        ),
        CheckConstraint(
            "(purpose = 'ONE_TIME_ORDER' AND order_id IS NOT NULL "
            "AND subscription_id IS NULL AND scheduled_meal_id IS NULL) OR "
            "(purpose = 'SUBSCRIPTION_UPFRONT' AND order_id IS NULL "
            "AND subscription_id IS NOT NULL AND scheduled_meal_id IS NULL) OR "
            "(purpose = 'SCHEDULED_MEAL_ADDON' AND order_id IS NULL "
            "AND subscription_id IS NULL AND scheduled_meal_id IS NOT NULL)",
            name="ck_payments_purpose_matches_target",
        ),
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        Index("ix_payments_order_status", "order_id", "status"),
        Index("ix_payments_subscription_status", "subscription_id", "status"),
        Index("ix_payments_scheduled_meal_status", "scheduled_meal_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT")
    )
    subscription_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT")
    )
    scheduled_meal_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("scheduled_meals.id", ondelete="RESTRICT")
    )
    purpose: Mapped[PaymentPurpose] = mapped_column(
        enum_column(PaymentPurpose, "payment_purpose"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    payment_method: Mapped[PaymentMethod] = mapped_column(
        enum_column(PaymentMethod, "payment_method"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        enum_column(PaymentStatus, "payment_status"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    order: Mapped[Order | None] = relationship(
        back_populates="payments", foreign_keys=[order_id]
    )
    subscription: Mapped[Subscription | None] = relationship(
        back_populates="payments", foreign_keys=[subscription_id]
    )
    scheduled_meal: Mapped[ScheduledMeal | None] = relationship(
        back_populates="payments", foreign_keys=[scheduled_meal_id]
    )
    transactions: Mapped[list[PaymentTransaction]] = relationship(
        back_populates="payment"
    )
    webhook_events: Mapped[list[PaymentWebhookEvent]] = relationship(
        back_populates="payment"
    )
    scheduled_addons: Mapped[list[ScheduledMealAddon]] = relationship(
        back_populates="payment",
        primaryjoin="Payment.id == foreign(ScheduledMealAddon.payment_id)",
        viewonly=True,
    )


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    __table_args__ = (
        UniqueConstraint(
            "provider", "provider_reference", name="uq_payment_transactions_provider_reference"
        ),
        CheckConstraint("amount > 0", name="ck_payment_transactions_amount_positive"),
        Index("ix_payment_transactions_payment_created", "payment_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    payment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    transaction_type: Mapped[PaymentTransactionType] = mapped_column(
        enum_column(PaymentTransactionType, "payment_transaction_type"), nullable=False
    )
    status: Mapped[PaymentTransactionStatus] = mapped_column(
        enum_column(PaymentTransactionStatus, "payment_transaction_status"),
        nullable=False,
        default=PaymentTransactionStatus.PENDING,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(String(200))
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    payment: Mapped[Payment] = relationship(back_populates="transactions")


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_payment_webhook_provider_event"),
        Index("ix_payment_webhook_events_payment_status", "payment_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(200), nullable=False)
    payment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[WebhookStatus] = mapped_column(
        enum_column(WebhookStatus, "payment_webhook_status"),
        nullable=False,
        default=WebhookStatus.RECEIVED,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    payment: Mapped[Payment] = relationship(back_populates="webhook_events")
