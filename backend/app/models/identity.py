from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import UserStatus, enum_column

if TYPE_CHECKING:
    from app.models.admin import AdminAuditLog
    from app.models.cart import Cart
    from app.models.delivery import DeliveryAssignment
    from app.models.order import Order
    from app.models.subscription import ScheduledMeal, Subscription


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="ck_users_email_normalized"),
        UniqueConstraint("phone", name="uq_users_phone"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[UserStatus] = mapped_column(
        enum_column(UserStatus, "user_status"),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE.value,
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    profile: Mapped[CustomerProfile | None] = relationship(
        back_populates="user", uselist=False
    )
    role_assignments: Mapped[list[UserRole]] = relationship(
        back_populates="user", foreign_keys="UserRole.user_id"
    )
    addresses: Mapped[list[Address]] = relationship(back_populates="customer")
    carts: Mapped[list[Cart]] = relationship(back_populates="customer")
    orders: Mapped[list[Order]] = relationship(
        back_populates="customer", foreign_keys="Order.customer_id"
    )
    subscriptions: Mapped[list[Subscription]] = relationship(
        back_populates="customer", foreign_keys="Subscription.customer_id"
    )
    delivery_assignments: Mapped[list[DeliveryAssignment]] = relationship(
        back_populates="assigned_user",
        foreign_keys="DeliveryAssignment.assigned_user_id",
    )
    assigned_delivery_tasks: Mapped[list[DeliveryAssignment]] = relationship(
        back_populates="assigned_by_user",
        foreign_keys="DeliveryAssignment.assigned_by_user_id",
    )
    admin_audit_logs: Mapped[list[AdminAuditLog]] = relationship(
        back_populates="actor", foreign_keys="AdminAuditLog.actor_user_id"
    )


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="profile")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    user_assignments: Mapped[list[UserRole]] = relationship(back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    assigned_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship(
        back_populates="role_assignments", foreign_keys=[user_id]
    )
    role: Mapped[Role] = relationship(back_populates="user_assignments")
    assigned_by: Mapped[User | None] = relationship(foreign_keys=[assigned_by_user_id])


class Address(Base):
    __tablename__ = "addresses"
    __table_args__ = (
        Index("ix_addresses_customer_active", "customer_id", "is_active"),
        Index(
            "uq_addresses_one_active_default_per_customer",
            "customer_id",
            unique=True,
            postgresql_where=text("is_default IS TRUE AND is_active IS TRUE"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(String(80))
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255))
    locality: Mapped[str] = mapped_column(String(120), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(16), nullable=False)
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
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

    customer: Mapped[User] = relationship(back_populates="addresses")
    scheduled_meals: Mapped[list[ScheduledMeal]] = relationship(
        back_populates="address", foreign_keys="ScheduledMeal.address_id"
    )
    orders: Mapped[list[Order]] = relationship(back_populates="address")
