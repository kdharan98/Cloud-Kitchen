from enum import StrEnum
from typing import TypeVar

from sqlalchemy import Enum as SQLAlchemyEnum


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class CartStatus(StrEnum):
    ACTIVE = "ACTIVE"
    CHECKED_OUT = "CHECKED_OUT"
    ABANDONED = "ABANDONED"


class MealPeriodCode(StrEnum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"


class OrderType(StrEnum):
    ONE_TIME = "ONE_TIME"
    SUBSCRIPTION_MEAL = "SUBSCRIPTION_MEAL"


class OrderItemKind(StrEnum):
    ONE_TIME = "ONE_TIME"
    INCLUDED = "INCLUDED"
    ADD_ON = "ADD_ON"


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class SubscriptionStatus(StrEnum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class EntitlementStatus(StrEnum):
    AVAILABLE = "AVAILABLE"
    SCHEDULED = "SCHEDULED"
    CONSUMED = "CONSUMED"
    EXPIRED = "EXPIRED"


class PauseStatus(StrEnum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class ScheduledMealStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    PAUSED = "PAUSED"
    SKIPPED = "SKIPPED"
    PROCESSING = "PROCESSING"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"


class AddonStatus(StrEnum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    REMOVED = "REMOVED"
    FULFILLED = "FULFILLED"
    REFUNDED = "REFUNDED"
    REFUND_REQUIRED = "REFUND_REQUIRED"


class PaymentPurpose(StrEnum):
    ONE_TIME_ORDER = "ONE_TIME_ORDER"
    SUBSCRIPTION_UPFRONT = "SUBSCRIPTION_UPFRONT"
    SCHEDULED_MEAL_ADDON = "SCHEDULED_MEAL_ADDON"


class PaymentMethod(StrEnum):
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    WALLET = "WALLET"
    OTHER_ONLINE = "OTHER_ONLINE"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    REQUIRES_ACTION = "REQUIRES_ACTION"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    REFUNDED = "REFUNDED"


class PaymentTransactionType(StrEnum):
    CHARGE = "CHARGE"
    REFUND = "REFUND"


class PaymentTransactionStatus(StrEnum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class WebhookStatus(StrEnum):
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class ReservationStatus(StrEnum):
    HELD = "HELD"
    COMMITTED = "COMMITTED"
    RELEASED = "RELEASED"
    FULFILLED = "FULFILLED"


class InventoryReservationType(StrEnum):
    ONE_TIME_ORDER = "ONE_TIME"
    SUBSCRIPTION_MEAL = "SUBSCRIPTION_MEAL"


class DeliveryAssignmentStatus(StrEnum):
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


EnumType = TypeVar("EnumType", bound=StrEnum)


def enum_column(enum_class: type[EnumType], name: str) -> SQLAlchemyEnum:
    return SQLAlchemyEnum(
        enum_class,
        name=name,
        native_enum=True,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )
