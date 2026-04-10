"""API Utilities"""

from typing import Any

from django.db import models
from django.db.models import Model
from drf_spectacular.extensions import OpenApiSerializerExtension, OpenApiSerializerFieldExtension
from drf_spectacular.plumbing import build_basic_type, build_object_type
from drf_spectacular.types import OpenApiTypes
from rest_framework.fields import (
    CharField,
    IntegerField,
    JSONField,
    SerializerMethodField,
)
from rest_framework.serializers import ModelSerializer as BaseModelSerializer
from rest_framework.serializers import (
    Serializer,
    ValidationError,
    model_meta,
    raise_errors_on_nested_writes,
)


def is_dict(value: Any):
    """Ensure a value is a dictionary, useful for JSONFields"""
    if isinstance(value, dict):
        return
    raise ValidationError("Value must be a dictionary, and not have any duplicate keys.")


class JSONDictField(JSONField):
    """JSON Field which only allows dictionaries"""

    default_validators = [is_dict]


class JSONExtension(OpenApiSerializerFieldExtension):
    """Generate API Schema for JSON fields as"""

    target_class = "authentik.core.api.utils.JSONDictField"

    def map_serializer_field(self, auto_schema, direction):
        return build_basic_type(OpenApiTypes.OBJECT)


class ModelSerializer(BaseModelSerializer):

    # By default, JSON fields we have are used to store dictionaries
    serializer_field_mapping = BaseModelSerializer.serializer_field_mapping.copy()
    serializer_field_mapping[models.JSONField] = JSONDictField

    def update(self, instance: Model, validated_data):
        raise_errors_on_nested_writes("update", self, validated_data)
        info = model_meta.get_field_info(instance)

        # Simply set each attribute on the instance, and then save it.
        # Note that unlike `.create()` we don't need to treat many-to-many
        # relationships as being a special case. During updates we already
        # have an instance pk for the relationships to be associated with.
        m2m_fields = []
        for attr, value in validated_data.items():
            if attr in info.relations and info.relations[attr].to_many:
                m2m_fields.append((attr, value))
            else:
                setattr(instance, attr, value)

        instance.save()

        # Note that many-to-many fields are set after updating instance.
        # Setting m2m fields triggers signals which could potentially change
        # updated instance and we do not want it to collide with .update()
        for attr, value in m2m_fields:
            field = getattr(instance, attr)
            # We can't check for inheritance here as m2m managers are generated dynamically
            if field.__class__.__name__ == "RelatedManager":
                field.set(value, bulk=False)
            else:
                field.set(value)

        return instance


class PassiveSerializer(Serializer):
    """Base serializer class which doesn't implement create/update methods"""

    def create(self, validated_data: dict) -> Model:  # pragma: no cover
        return Model()

    def update(self, instance: Model, validated_data: dict) -> Model:  # pragma: no cover
        return Model()


class PropertyMappingPreviewSerializer(PassiveSerializer):
    """Preview how the current user is mapped via the property mappings selected in a provider"""

    preview = JSONDictField(read_only=True)


class MetaNameSerializer(PassiveSerializer):
    """Add verbose names to response"""

    verbose_name = SerializerMethodField()
    verbose_name_plural = SerializerMethodField()
    meta_model_name = SerializerMethodField()

    def get_verbose_name(self, obj: Model) -> str:
        """Return object's verbose_name"""
        return obj._meta.verbose_name

    def get_verbose_name_plural(self, obj: Model) -> str:
        """Return object's plural verbose_name"""
        return obj._meta.verbose_name_plural

    def get_meta_model_name(self, obj: Model) -> str:
        """Return internal model name"""
        return f"{obj._meta.app_label}.{obj._meta.model_name}"


class CacheSerializer(PassiveSerializer):
    """Generic cache stats for an object"""

    count = IntegerField(read_only=True)


class LinkSerializer(PassiveSerializer):
    """Returns a single link"""

    link = CharField()


def _validate_dynamic_url_map(value: Any) -> dict[str, str | None]:
    if not isinstance(value, dict):
        raise ValidationError("Value must be a dictionary mapping variant names to URLs.")

    validated = {}
    for key, variant_url in value.items():
        if not isinstance(key, str):
            raise ValidationError("Dynamic URL variant names must be strings.")
        if variant_url is not None and not isinstance(variant_url, str):
            raise ValidationError(f'Value for "{key}" must be a string or null.')
        validated[key] = variant_url
    return validated


def _build_dynamic_url_schema(description: str) -> dict[str, Any]:
    url_schema = build_basic_type(OpenApiTypes.STR)
    url_schema["nullable"] = True
    return build_object_type(
        description=description,
        properties={
            "fallback": url_schema.copy(),
        },
        additionalProperties=url_schema,
    )


class DynamicURLSerializerExtension(OpenApiSerializerExtension):
    target_class = "authentik.core.api.utils.DynamicURLSerializer"

    def get_name(self, auto_schema, direction):
        return "DynamicURL"

    def map_serializer(self, auto_schema, direction):
        return _build_dynamic_url_schema(
            "Dynamic URL variants keyed by variant name. Includes a fallback URL."
        )


class DynamicURLSerializer(PassiveSerializer):
    """Dynamic URLs keyed by variant name with a generic fallback URL."""

    fallback = CharField(required=False, allow_null=True)

    def to_internal_value(self, data: Any) -> dict[str, str | None]:
        return _validate_dynamic_url_map(data)

    def to_representation(self, instance: Any) -> dict[str, str | None] | None:
        if instance is None:
            return None
        return _validate_dynamic_url_map(instance)


class ThemedUrlsSerializerExtension(OpenApiSerializerExtension):
    target_class = "authentik.core.api.utils.ThemedUrlsSerializer"

    def get_name(self, auto_schema, direction):
        return "ThemedUrls"

    def map_serializer(self, auto_schema, direction):
        return _build_dynamic_url_schema(
            "URL variants keyed by theme name. Includes a fallback URL."
        )


class ThemedUrlsSerializer(DynamicURLSerializer):
    """Backward-compatible alias for themed URL variants."""
