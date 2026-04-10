from django.contrib.contenttypes.models import ContentType
from rest_framework.exceptions import ValidationError
from rest_framework.fields import CharField, SerializerMethodField
from rest_framework.viewsets import ModelViewSet

from authentik.core.api.used_by import UsedByMixin
from authentik.core.api.utils import ModelSerializer
from authentik.core.models import AttributesMixin, ObjectAttribute


class ContentTypeSerializer(ModelSerializer):
    app_label = CharField(read_only=True)
    model = CharField(read_only=True)
    verbose_name_plural = SerializerMethodField()

    def get_verbose_name_plural(self, ct: ContentType) -> str:
        return ct.model_class()._meta.verbose_name_plural

    class Meta:
        model = ContentType
        fields = ("id", "app_label", "model", "verbose_name_plural")


class ObjectAttributeSerializer(ModelSerializer):

    content_type = ContentTypeSerializer(read_only=True)

    def validate_object_type(self, ct: ContentType) -> ContentType:
        if not issubclass(ct.model_class(), AttributesMixin):
            raise ValidationError("Invalid object type")
        return ct

    class Meta:
        model = ObjectAttribute
        fields = "__all__"


class ObjectAttributeViewSet(UsedByMixin, ModelViewSet):
    serializer_class = ObjectAttributeSerializer
    queryset = ObjectAttribute.objects.all()
    filterset_fields = ["object_type__model", "object_type__app_label"]
