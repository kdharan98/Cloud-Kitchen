import unittest
from uuid import uuid4

import app.models
from app.database.base import Base
from app.models.enums import InventoryReservationType, OrderItemKind, OrderType
from app.models.inventory import InventoryReservation, prevent_reservation_type_change
from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint, inspect


def accepts_reservation(reservation, orders, order_items, scheduled_items, addons):
    reservation_type = reservation["reservation_type"]
    is_one_time = reservation_type == InventoryReservationType.ONE_TIME_ORDER.value
    has_order = reservation["order_id"] is not None
    has_order_item = reservation["order_item_id"] is not None
    has_schedule_source = (
        reservation["scheduled_meal_item_id"] is not None
        or reservation["scheduled_meal_addon_id"] is not None
    )

    if has_order != has_order_item:
        return False

    if is_one_time:
        if any(
            reservation[key] is not None
            for key in (
                "scheduled_meal_id",
                "scheduled_meal_item_id",
                "scheduled_meal_addon_id",
            )
        ) or not has_order:
            return False
    elif (
        reservation_type != InventoryReservationType.SUBSCRIPTION_MEAL.value
        or reservation["scheduled_meal_id"] is None
        or (reservation["scheduled_meal_item_id"] is None)
        == (reservation["scheduled_meal_addon_id"] is None)
    ):
        return False

    source_id = (
        reservation["scheduled_meal_item_id"]
        or reservation["scheduled_meal_addon_id"]
    )
    source_rows = scheduled_items if reservation["scheduled_meal_item_id"] else addons
    if has_schedule_source and not any(
        row["id"] == source_id
        and row["scheduled_meal_id"] == reservation["scheduled_meal_id"]
        and row["menu_item_id"] == reservation["menu_item_id"]
        for row in source_rows
    ):
        return False

    if not has_order:
        return not is_one_time

    order = orders.get(reservation["order_id"])
    item = order_items.get(reservation["order_item_id"])
    if (
        order is None
        or item is None
        or item["order_id"] != reservation["order_id"]
        or item["menu_item_id"] != reservation["menu_item_id"]
    ):
        return False

    if is_one_time:
        return (
            order["order_type"] == OrderType.ONE_TIME.value
            and item["item_kind"] == OrderItemKind.ONE_TIME.value
            and item["scheduled_meal_id"] is None
            and item["scheduled_meal_item_id"] is None
            and item["scheduled_meal_addon_id"] is None
        )

    return (
        order["order_type"] == OrderType.SUBSCRIPTION_MEAL.value
        and order["scheduled_meal_id"] == reservation["scheduled_meal_id"]
        and item["scheduled_meal_id"] == reservation["scheduled_meal_id"]
        and item["scheduled_meal_item_id"] == reservation["scheduled_meal_item_id"]
        and item["scheduled_meal_addon_id"] == reservation["scheduled_meal_addon_id"]
    )


class InventoryReservationConstraintTests(unittest.TestCase):
    def setUp(self):
        self.one_time_order_id = uuid4()
        self.subscription_order_id = uuid4()
        self.scheduled_meal_id = uuid4()
        self.menu_item_id = uuid4()
        self.scheduled_item_id = uuid4()
        self.addon_id = uuid4()
        self.one_time_order_item_id = uuid4()
        self.included_order_item_id = uuid4()
        self.addon_order_item_id = uuid4()

        self.orders = {
            self.one_time_order_id: {
                "order_type": OrderType.ONE_TIME.value,
                "scheduled_meal_id": None,
            },
            self.subscription_order_id: {
                "order_type": OrderType.SUBSCRIPTION_MEAL.value,
                "scheduled_meal_id": self.scheduled_meal_id,
            },
        }
        self.order_items = {
            self.one_time_order_item_id: {
                "order_id": self.one_time_order_id,
                "menu_item_id": self.menu_item_id,
                "item_kind": OrderItemKind.ONE_TIME.value,
                "scheduled_meal_id": None,
                "scheduled_meal_item_id": None,
                "scheduled_meal_addon_id": None,
            },
            self.included_order_item_id: {
                "order_id": self.subscription_order_id,
                "menu_item_id": self.menu_item_id,
                "item_kind": OrderItemKind.INCLUDED.value,
                "scheduled_meal_id": self.scheduled_meal_id,
                "scheduled_meal_item_id": self.scheduled_item_id,
                "scheduled_meal_addon_id": None,
            },
            self.addon_order_item_id: {
                "order_id": self.subscription_order_id,
                "menu_item_id": self.menu_item_id,
                "item_kind": OrderItemKind.ADD_ON.value,
                "scheduled_meal_id": self.scheduled_meal_id,
                "scheduled_meal_item_id": None,
                "scheduled_meal_addon_id": self.addon_id,
            },
        }
        self.scheduled_items = [
            {
                "id": self.scheduled_item_id,
                "scheduled_meal_id": self.scheduled_meal_id,
                "menu_item_id": self.menu_item_id,
            }
        ]
        self.addons = [
            {
                "id": self.addon_id,
                "scheduled_meal_id": self.scheduled_meal_id,
                "menu_item_id": self.menu_item_id,
            }
        ]

    def reservation(self, reservation_type, **overrides):
        row = {
            "reservation_type": reservation_type,
            "scheduled_meal_id": None,
            "scheduled_meal_item_id": None,
            "scheduled_meal_addon_id": None,
            "order_id": None,
            "order_item_id": None,
            "menu_item_id": self.menu_item_id,
        }
        row.update(overrides)
        return row

    def accepts(self, row, orders=None, order_items=None):
        return accepts_reservation(
            row,
            self.orders if orders is None else orders,
            self.order_items if order_items is None else order_items,
            self.scheduled_items,
            self.addons,
        )

    def test_valid_one_time_reservation(self):
        row = self.reservation(
            InventoryReservationType.ONE_TIME_ORDER.value,
            order_id=self.one_time_order_id,
            order_item_id=self.one_time_order_item_id,
        )
        self.assertTrue(self.accepts(row))

    def test_valid_subscription_reservation_before_order_generation(self):
        row = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=self.scheduled_meal_id,
            scheduled_meal_item_id=self.scheduled_item_id,
        )
        self.assertTrue(self.accepts(row))

    def test_valid_subscription_reservation_after_order_generation(self):
        row = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=self.scheduled_meal_id,
            scheduled_meal_addon_id=self.addon_id,
            order_id=self.subscription_order_id,
            order_item_id=self.addon_order_item_id,
        )
        self.assertTrue(self.accepts(row))

    def test_one_time_reservation_cannot_reference_subscription_order(self):
        row = self.reservation(
            InventoryReservationType.ONE_TIME_ORDER.value,
            order_id=self.subscription_order_id,
            order_item_id=self.included_order_item_id,
        )
        self.assertFalse(self.accepts(row))

    def test_subscription_reservation_cannot_reference_one_time_order(self):
        row = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=self.scheduled_meal_id,
            scheduled_meal_item_id=self.scheduled_item_id,
            order_id=self.one_time_order_id,
            order_item_id=self.one_time_order_item_id,
        )
        self.assertFalse(self.accepts(row))

    def test_mismatched_schedule_or_source_item_is_rejected(self):
        wrong_meal_id = uuid4()
        wrong_schedule = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=wrong_meal_id,
            scheduled_meal_item_id=self.scheduled_item_id,
            order_id=self.subscription_order_id,
            order_item_id=self.included_order_item_id,
        )
        wrong_order_line_source = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=self.scheduled_meal_id,
            scheduled_meal_item_id=self.scheduled_item_id,
            order_id=self.subscription_order_id,
            order_item_id=self.addon_order_item_id,
        )
        self.assertFalse(self.accepts(wrong_schedule))
        self.assertFalse(self.accepts(wrong_order_line_source))

    def test_missing_order_item_pair_is_rejected(self):
        missing_item = self.reservation(
            InventoryReservationType.ONE_TIME_ORDER.value,
            order_id=self.one_time_order_id,
        )
        missing_order = self.reservation(
            InventoryReservationType.SUBSCRIPTION_MEAL.value,
            scheduled_meal_id=self.scheduled_meal_id,
            scheduled_meal_item_id=self.scheduled_item_id,
            order_item_id=self.included_order_item_id,
        )
        self.assertFalse(self.accepts(missing_item))
        self.assertFalse(self.accepts(missing_order))

    def test_reservation_type_is_immutable_on_orm_update(self):
        reservation = InventoryReservation(
            reservation_type=InventoryReservationType.ONE_TIME_ORDER
        )
        reservation.reservation_type = InventoryReservationType.SUBSCRIPTION_MEAL
        self.assertTrue(inspect(reservation).attrs.reservation_type.history.has_changes())
        with self.assertRaisesRegex(ValueError, "immutable"):
            prevent_reservation_type_change(None, None, reservation)

    def test_metadata_declares_order_type_and_source_constraints(self):
        reservation_table = Base.metadata.tables["inventory_reservations"]
        order_table = Base.metadata.tables["orders"]

        classification_check = next(
            constraint
            for constraint in reservation_table.constraints
            if isinstance(constraint, CheckConstraint)
            and constraint.name == "ck_inventory_reservations_source_classification"
        )
        self.assertIn("ONE_TIME", str(classification_check.sqltext))
        self.assertIn("SUBSCRIPTION_MEAL", str(classification_check.sqltext))
        self.assertIn("order_item_id IS NOT NULL", str(classification_check.sqltext))

        order_type_fk = next(
            constraint
            for constraint in reservation_table.constraints
            if isinstance(constraint, ForeignKeyConstraint)
            and constraint.name == "fk_inventory_reservations_order_type"
        )
        self.assertEqual(
            [element.parent.name for element in order_type_fk.elements],
            ["order_id", "reservation_type"],
        )
        self.assertEqual(
            [element.target_fullname for element in order_type_fk.elements],
            ["orders.id", "orders.order_type"],
        )
        self.assertTrue(
            any(
                isinstance(constraint, UniqueConstraint)
                and list(constraint.columns.keys()) == ["id", "order_type"]
                for constraint in order_table.constraints
            )
        )

    def test_composite_foreign_keys_have_matching_unique_targets(self):
        metadata = Base.metadata
        reservation_table = metadata.tables["inventory_reservations"]
        expected = {
            "fk_inventory_reservations_availability_item": (
                ["availability_id", "menu_item_id"],
                "menu_item_availability",
                ["id", "menu_item_id"],
            ),
            "fk_inventory_reservations_scheduled_item": (
                ["scheduled_meal_item_id", "scheduled_meal_id", "menu_item_id"],
                "scheduled_meal_items",
                ["id", "scheduled_meal_id", "menu_item_id"],
            ),
            "fk_inventory_reservations_scheduled_addon": (
                ["scheduled_meal_addon_id", "scheduled_meal_id", "menu_item_id"],
                "scheduled_meal_addons",
                ["id", "scheduled_meal_id", "menu_item_id"],
            ),
            "fk_inventory_reservations_order_item_exact_scheduled_item": (
                [
                    "order_item_id",
                    "order_id",
                    "scheduled_meal_id",
                    "menu_item_id",
                    "scheduled_meal_item_id",
                ],
                "order_items",
                [
                    "id",
                    "order_id",
                    "scheduled_meal_id",
                    "menu_item_id",
                    "scheduled_meal_item_id",
                ],
            ),
            "fk_inventory_reservations_order_item_exact_addon": (
                [
                    "order_item_id",
                    "order_id",
                    "scheduled_meal_id",
                    "menu_item_id",
                    "scheduled_meal_addon_id",
                ],
                "order_items",
                [
                    "id",
                    "order_id",
                    "scheduled_meal_id",
                    "menu_item_id",
                    "scheduled_meal_addon_id",
                ],
            ),
        }

        for name, (local_columns, target_table_name, target_columns) in expected.items():
            with self.subTest(constraint=name):
                constraint = next(
                    constraint
                    for constraint in reservation_table.constraints
                    if isinstance(constraint, ForeignKeyConstraint)
                    and constraint.name == name
                )
                self.assertEqual(
                    [element.parent.name for element in constraint.elements],
                    local_columns,
                )
                self.assertEqual(
                    [element.target_fullname for element in constraint.elements],
                    [f"{target_table_name}.{column}" for column in target_columns],
                )
                target_table = metadata.tables[target_table_name]
                self.assertTrue(
                    tuple(column.name for column in target_table.primary_key.columns)
                    == tuple(target_columns)
                    or any(
                        isinstance(target_constraint, UniqueConstraint)
                        and tuple(column.name for column in target_constraint.columns)
                        == tuple(target_columns)
                        for target_constraint in target_table.constraints
                    )
                )
