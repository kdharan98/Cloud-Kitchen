from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import DeliveryAssignmentStatus, enum_column

if TYPE_CHECKING:
    from app.models.identity import User
    from app.models.order import Order


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    __table_args__ = (
        Index(
            "uq_delivery_assignments_one_active_per_order",
            "order_id",
            unique=True,
            postgresql_where=text("status IN ('ASSIGNED', 'ACCEPTED')"),
        ),
        Index("ix_delivery_assignments_user_status", "assigned_user_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    assigned_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    status: Mapped[DeliveryAssignmentStatus] = mapped_column(
        enum_column(DeliveryAssignmentStatus, "delivery_assignment_status"),
        nullable=False,
        default=DeliveryAssignmentStatus.ASSIGNED,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    order: Mapped[Order] = relationship(back_populates="delivery_assignments")
    assigned_user: Mapped[User] = relationship(
        back_populates="delivery_assignments", foreign_keys=[assigned_user_id]
    )
    assigned_by_user: Mapped[User | None] = relationship(
        back_populates="assigned_delivery_tasks", foreign_keys=[assigned_by_user_id]
    )
