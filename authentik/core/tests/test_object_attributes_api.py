"""Test object attributes API"""

from django.urls import reverse
from rest_framework.test import APITestCase

from authentik.core.api.object_attributes import ContentType
from authentik.core.models import ObjectAttribute, User
from authentik.core.tests.utils import create_test_admin_user
from authentik.lib.generators import generate_id


class TestObjectAttributesAPI(APITestCase):
    """Test object attributes API"""

    def setUp(self) -> None:
        super().setUp()
        self.user = create_test_admin_user()
        self.client.force_login(self.user)

    def test_create(self):
        res = self.client.post(
            reverse("authentik_api:objectattribute-list"),
            data={
                "object_type": "authentik_core.user",
                "enabled": False,
                "key": "employeeNumber",
                "label": "Employee Number",
                "type": "text",
                "group": "Employee",
                "flag_unique": False,
                "flag_required": False,
            },
        )
        self.assertEqual(res.status_code, 201)
        attr = ObjectAttribute.objects.filter(key="employeeNumber").first()
        self.assertIsNotNone(attr)

    def test_create_invalid(self):
        res = self.client.post(
            reverse("authentik_api:objectattribute-list"),
            data={
                "object_type": "authentik_core.objectattribute",
                "enabled": False,
                "key": "employeeNumber",
                "label": "Employee Number",
                "type": "text",
                "group": "Employee",
                "flag_unique": False,
                "flag_required": False,
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertJSONEqual(res.content, {"object_type": ["Invalid object type"]})

    def test_update(self):
        attr = ObjectAttribute.objects.create(
            object_type=ContentType.objects.get_for_model(User),
            label="foo",
            key=generate_id(),
            type=ObjectAttribute.AttributeType.TEXT,
        )
        res = self.client.put(
            reverse("authentik_api:objectattribute-detail", kwargs={"pk": attr.pk}),
            data={
                "object_type": "authentik_core.user",
                "enabled": False,
                "key": attr.key,
                "label": "Employee Number",
                "type": "text",
                "group": "Employee",
                "flag_unique": False,
                "flag_required": False,
            },
        )
        self.assertEqual(res.status_code, 200)
        attr.refresh_from_db()
        self.assertEqual(attr.label, "Employee Number")
