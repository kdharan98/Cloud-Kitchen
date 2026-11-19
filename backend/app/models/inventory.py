from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy import event, inspect
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Mapped, Mapper, mapped_column, relationship

from app.database.base import Base
from app.models.enums import InventoryReservationType, ReservationStatus, enum_column

if TYPE_CHECKING:
    from app.models.catalog import MenuItemAvailability
    from app.models.order import Order, OrderItem
    from app.models.subscription import ScheduledMeal, ScheduledMealAddon, ScheduledMealItem


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["order_id", "reservation_type"],
            ["orders.id", "orders.order_type"],
            name="fk_inventory_reservations_order_type",
        ),
        ForeignKeyConstraint(
            ["availability_id", "menu_item_id"],
            ["menu_item_availability.id", "menu_item_availability.menu_item_id"],
            name="fk_inventory_reservations_availability_item",
        ),
        ForeignKeyConstraint(
            ["scheduled_meal_item_id", "scheduled_meal_id", "menu_item_id"],
            [
                "scheduled_meal_items.id",
                "scheduled_meal_items.scheduled_meal_id",
                "scheduled_meal_items.menu_item_id",
            ],
            name="fk_inventory_reservations_scheduled_item",
        ),
        ForeignKeyConstraint(
            ["scheduled_meal_addon_id", "scheduled_meal_id", "menu_item_id"],
            [
                "scheduled_meal_addons.id",
                "scheduled_meal_addons.scheduled_meal_id",
                "scheduled_meal_addons.menu_item_id",
            ],
            name="fk_inventory_reservations_scheduled_addon",
        ),
        ForeignKeyConstraint(
            ["order_item_id", "order_id", "menu_item_id"],
            ["order_items.id", "order_items.order_id", "order_items.menu_item_id"],
            name="fk_inventory_reservations_order_item",
        ),
        ForeignKeyConstraint(
            ["order_item_id", "order_id", "scheduled_meal_id", "menu_item_id"],
            [
                "order_items.id",
                "order_items.order_id",
                "order_items.scheduled_meal_id",
                "order_items.menu_item_id",
            ],
            name="fk_inventory_reservations_order_item_schedule",
        ),
        ForeignKeyConstraint(
            [
                "order_item_id",
                "order_id",
                "scheduled_meal_id",
                "menu_item_id",
                "scheduled_meal_item_id",
            ],
            [
                "order_items.id",
                "order_items.order_id",
                "order_items.scheduled_meal_id",
                "order_items.menu_item_id",
                "order_items.scheduled_meal_item_id",
            ],
            name="fk_inventory_reservations_order_item_exact_scheduled_item",
        ),
        ForeignKeyConstraint(
            [
                "order_item_id",
                "order_id",
                "scheduled_meal_id",
                "menu_item_id",
                "scheduled_meal_addon_id",
            ],
            [
                "order_items.id",
                "order_items.order_id",
                "order_items.scheduled_meal_id",
                "order_items.menu_item_id",
                "order_items.scheduled_meal_addon_id",
            ],
            name="fk_inventory_reservations_order_item_exact_addon",
        ),
        CheckConstraint("quantity > 0", name="ck_inventory_reservations_quantity_positive"),
        CheckConstraint(
            "(reservation_type = 'ONE_TIME' "
            "AND scheduled_meal_id IS NULL "
            "AND scheduled_meal_item_id IS NULL "
            "AND scheduled_meal_addon_id IS NULL "
            "AND order_id IS NOT NULL AND order_item_id IS NOT NULL) OR "
            "(reservation_type = 'SUBSCRIPTION_MEAL' "
            "AND scheduled_meal_id IS NOT NULL "
            "AND ((scheduled_meal_item_id IS NOT NULL AND scheduled_meal_addon_id IS NULL) OR "
            "(scheduled_meal_item_id IS NULL AND scheduled_meal_addon_id IS NOT NULL)) "
            "AND ((order_id IS NULL AND order_item_id IS NULL) OR "
            "(order_id IS NOT NULL AND order_item_id IS NOT NULL)))",
            name="ck_inventory_reservations_source_classification",
        ),
        CheckConstraint(
            "(order_item_id IS NOT NULL) OR "
            "(scheduled_meal_item_id IS NOT NULL OR scheduled_meal_addon_id IS NOT NULL)",
            name="ck_inventory_reservations_has_source",
        ),
        CheckConstraint(
            "(status = 'HELD' AND committed_at IS NULL AND released_at IS NULL "
            "AND fulfilled_at IS NULL) OR "
            "(status = 'COMMITTED' AND committed_at IS NOT NULL AND released_at IS NULL "
            "AND fulfilled_at IS NULL) OR "
            "(status = 'RELEASED' AND released_at IS NOT NULL AND fulfilled_at IS NULL) OR "
            "(status = 'FULFILLED' AND committed_at IS NOT NULL AND fulfilled_at IS NOT NULL "
            "AND released_at IS NULL)",
            name="ck_inventory_reservations_lifecycle_timestamps",
        ),
        CheckConstraint(
            "(status = 'RELEASED' AND release_idempotency_key IS NOT NULL) OR "
            "(status <> 'RELEASED' AND release_idempotency_key IS NULL)",
            name="ck_inventory_reservations_release_idempotency",
        ),
        CheckConstraint(
            "(status = 'FULFILLED' AND fulfillment_idempotency_key IS NOT NULL) OR "
            "(status <> 'FULFILLED' AND fulfillment_idempotency_key IS NULL)",
            name="ck_inventory_reservations_fulfillment_idempotency",
        ),
        CheckConstraint(
            "(recovered_from_reservation_id IS NULL AND recovery_idempotency_key IS NULL "
            "AND recovery_reason IS NULL) OR "
            "(recovered_from_reservation_id IS NOT NULL AND recovery_idempotency_key IS NOT NULL "
            "AND recovery_reason IS NOT NULL)",
            name="ck_inventory_reservations_recovery_details",
        ),
        UniqueConstraint("id", "order_id", name="uq_inventory_reservations_id_order"),
        Index(
            "uq_inventory_reservations_active_order_item",
            "order_item_id",
            unique=True,
            postgresql_where=text(
                "order_item_id IS NOT NULL AND status IN ('HELD', 'COMMITTED')"
            ),
        ),
        Index(
            "uq_inventory_reservations_active_scheduled_item",
            "scheduled_meal_item_id",
            unique=True,
            postgresql_where=text(
                "scheduled_meal_item_id IS NOT NULL AND status IN ('HELD', 'COMMITTED')"
            ),
        ),
        Index(
            "uq_inventory_reservations_active_scheduled_addon",
            "scheduled_meal_addon_id",
            unique=True,
            postgresql_where=text(
                "scheduled_meal_addon_id IS NOT NULL AND status IN ('HELD', 'COMMITTED')"
            ),
        ),
        Index("ix_inventory_reservations_availability_status", "availability_id", "status"),
        Index("ix_inventory_reservations_order", "order_id"),
        Index("ix_inventory_reservations_schedule", "scheduled_meal_id"),
        Index(
            "ix_inventory_reservations_order_source",
            "reservation_type",
            "order_item_id",
            "order_id",
            "scheduled_meal_id",
            "menu_item_id",
            "scheduled_meal_item_id",
            "scheduled_meal_addon_id",
        ),
        Index(
            "ix_inventory_reservations_recovered_from",
            "recovered_from_reservation_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    reservation_type: Mapped[InventoryReservationType] = mapped_column(
        enum_column(InventoryReservationType, "order_type"),
        nullable=False,
    )
    availability_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    menu_item_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    scheduled_meal_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("scheduled_meals.id", ondelete="RESTRICT")
    )
    scheduled_meal_item_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    scheduled_meal_addon_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    order_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT")
    )
    order_item_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        enum_column(ReservationStatus, "inventory_reservation_status"),
        nullable=False,
        default=ReservationStatus.HELD,
    )
    reservation_idempotency_key: Mapped[str] = mapped_column(
        String(160), nullable=False, unique=True
    )
    release_idempotency_key: Mapped[str | None] = mapped_column(
        String(160), unique=True
    )
    fulfillment_idempotency_key: Mapped[str | None] = mapped_column(
        String(160), unique=True
    )
    recovered_from_reservation_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("inventory_reservations.id", ondelete="RESTRICT"),
    )
    recovery_idempotency_key: Mapped[str | None] = mapped_column(
        String(160), unique=True
    )
    recovery_reason: Mapped[str | None] = mapped_column(String(500))
    release_reason: Mapped[str | None] = mapped_column(String(500))
    reserved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    committed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    availability: Mapped[MenuItemAvailability] = relationship(
        back_populates="reservations",
        foreign_keys=[availability_id, menu_item_id],
    )
    scheduled_meal: Mapped[ScheduledMeal | None] = relationship(
        back_populates="inventory_reservations",
        foreign_keys=[scheduled_meal_id],
    )
    scheduled_meal_item: Mapped[ScheduledMealItem | None] = relationship(
        back_populates="inventory_reservations",
        foreign_keys=[scheduled_meal_item_id],
    )
    scheduled_meal_addon: Mapped[ScheduledMealAddon | None] = relationship(
        back_populates="inventory_reservations",
        foreign_keys=[scheduled_meal_addon_id],
    )
    order: Mapped[Order | None] = relationship(
        back_populates="inventory_reservations", foreign_keys=[order_id]
    )
    order_item: Mapped[OrderItem | None] = relationship(
        back_populates="inventory_reservations",
        primaryjoin="OrderItem.id == foreign(InventoryReservation.order_item_id)",
    )
    recovered_from: Mapped[InventoryReservation | None] = relationship(
        back_populates="recovery_reservations",
        remote_side=[id],
        foreign_keys=[recovered_from_reservation_id],
    )
    recovery_reservations: Mapped[list[InventoryReservation]] = relationship(
        back_populates="recovered_from",
        foreign_keys=[recovered_from_reservation_id],
    )


@event.listens_for(InventoryReservation, "before_update")
def prevent_reservation_type_change(
    mapper: Mapper[InventoryReservation],
    connection: Connection,
    target: InventoryReservation,
) -> None:
    if inspect(target).attrs.reservation_type.history.has_changes():
        raise ValueError("Inventory reservation type is immutable")
