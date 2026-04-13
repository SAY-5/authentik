"""Tokens API Viewset"""

from datetime import timedelta
from typing import Any

from django.contrib.auth import login
from django.utils.timezone import now
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.fields import CharField
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from authentik.api.validation import validate
from authentik.blueprints.api import ManagedSerializer
from authentik.blueprints.v1.importer import SERIALIZER_CONTEXT_BLUEPRINT
from authentik.core.api.used_by import UsedByMixin
from authentik.core.api.users import UserSerializer
from authentik.core.api.utils import ModelSerializer, PassiveSerializer
from authentik.core.models import (
    USER_ATTRIBUTE_AGENT_OWNER_PK,
    USER_ATTRIBUTE_TOKEN_EXPIRING,
    USER_ATTRIBUTE_TOKEN_MAXIMUM_LIFETIME,
    Token,
    TokenIntents,
    User,
    UserTypes,
    default_token_duration,
    default_token_key,
)
from authentik.events.models import Event, EventAction
from authentik.events.utils import model_to_dict
from authentik.lib.utils.time import timedelta_from_string
from authentik.rbac.decorators import permission_required


class TokenSerializer(ManagedSerializer, ModelSerializer):
    """Token Serializer"""

    user_obj = UserSerializer(required=False, source="user", read_only=True)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if SERIALIZER_CONTEXT_BLUEPRINT in self.context:
            self.fields["key"] = CharField(required=False)

    def validate_user(self, user: User):
        """Ensure user of token cannot be changed"""
        if self.instance and self.instance.user_id:
            if user.pk != self.instance.user_id:
                raise ValidationError("User cannot be changed")
        return user

    def validate(self, attrs: dict[Any, str]) -> dict[Any, str]:
        """Ensure only API or App password tokens are created."""
        request: Request = self.context.get("request")
        if not request:
            if "user" not in attrs:
                raise ValidationError("Missing user")
            if "intent" not in attrs:
                raise ValidationError("Missing intent")
        else:
            attrs.setdefault("user", request.user)
        attrs.setdefault("intent", TokenIntents.INTENT_API)
        if attrs.get("intent") not in [TokenIntents.INTENT_API, TokenIntents.INTENT_APP_PASSWORD]:
            raise ValidationError({"intent": f"Invalid intent {attrs.get('intent')}"})

        if attrs.get("intent") == TokenIntents.INTENT_APP_PASSWORD:
            # user IS in attrs
            user: User = attrs.get("user")
            max_token_lifetime = user.group_attributes(request).get(
                USER_ATTRIBUTE_TOKEN_MAXIMUM_LIFETIME,
            )
            max_token_lifetime_dt = default_token_duration()
            if max_token_lifetime is not None:
                try:
                    max_token_lifetime_dt = now() + timedelta_from_string(max_token_lifetime)
                except ValueError:
                    pass

            expires = attrs.get("expires")
            if expires is not None and expires > max_token_lifetime_dt:
                raise ValidationError(
                    {
                        "expires": (
                            f"Token expires exceeds maximum lifetime ({max_token_lifetime_dt} UTC)."
                        )
                    }
                )
        elif attrs.get("intent") == TokenIntents.INTENT_API:
            # For API tokens, expires cannot be overridden
            attrs["expires"] = default_token_duration()

        return attrs

    class Meta:
        model = Token
        fields = [
            "pk",
            "managed",
            "identifier",
            "intent",
            "user",
            "user_obj",
            "description",
            "expires",
            "expiring",
        ]
        extra_kwargs = {
            "user": {"required": False},
        }


class TokenSetKeySerializer(PassiveSerializer):
    """Set token's key"""

    key = CharField()


class TokenViewSerializer(PassiveSerializer):
    """Show token's current key"""

    key = CharField(read_only=True)


class TokenViewSet(UsedByMixin, ModelViewSet):
    """Token Viewset"""

    lookup_field = "identifier"
    queryset = Token.objects.including_expired().all()
    serializer_class = TokenSerializer
    search_fields = [
        "identifier",
        "intent",
        "user__username",
        "description",
    ]
    filterset_fields = [
        "identifier",
        "intent",
        "user__username",
        "description",
        "expires",
        "expiring",
        "managed",
    ]
    ordering = ["identifier", "expires"]
    owner_field = "user"
    rbac_allow_create_without_perm = True

    def perform_create(self, serializer: TokenSerializer):
        if not self.request.user.is_superuser:
            instance = serializer.save(
                user=self.request.user,
                expiring=self.request.user.attributes.get(USER_ATTRIBUTE_TOKEN_EXPIRING, True),
            )
            self.request.user.assign_perms_to_managed_role(
                "authentik_core.view_token_key", instance
            )
            return instance
        return super().perform_create(serializer)

    @permission_required("authentik_core.view_token_key")
    @extend_schema(
        responses={
            200: TokenViewSerializer(many=False),
            404: OpenApiResponse(description="Token not found or expired"),
        }
    )
    @action(detail=True, pagination_class=None, filter_backends=[], methods=["GET"])
    def view_key(self, request: Request, identifier: str) -> Response:
        """Return token key and log access"""
        token: Token = self.get_object()
        Event.new(EventAction.SECRET_VIEW, secret=token).from_http(request)  # noqa # nosec
        return Response(TokenViewSerializer({"key": token.key}).data)

    @extend_schema(
        request=None,
        responses={
            200: TokenViewSerializer(many=False),
            403: OpenApiResponse(description="Not the token owner, agent owner, or superuser"),
        },
    )
    @action(detail=True, pagination_class=None, filter_backends=[], methods=["POST"])
    def rotate(self, request: Request, identifier: str) -> Response:
        """Rotate the token key and reset the expiry to 24 hours. Only callable by the token
        owner, the owning agent's human owner, or a superuser."""
        token: Token = self.get_object()

        if not request.user.is_superuser:
            is_token_owner = token.user_id == request.user.pk
            is_agent_owner = (
                token.user.type == UserTypes.AGENT
                and str(request.user.pk)
                == token.user.attributes.get(USER_ATTRIBUTE_AGENT_OWNER_PK)
            )
            if not is_token_owner and not is_agent_owner:
                return Response(status=403)

        token.key = default_token_key()
        token.expires = now() + timedelta(hours=24)
        token.save()
        Event.new(EventAction.SECRET_ROTATE, secret=token).from_http(request)  # noqa # nosec
        return Response(TokenViewSerializer({"key": token.key}).data)

    @extend_schema(
        request=TokenSetKeySerializer,
        responses={
            204: OpenApiResponse(description="Session created, session cookie set"),
            400: OpenApiResponse(description="Invalid token or not an agent user"),
            403: OpenApiResponse(description="Token expired or agent inactive"),
        },
    )
    @action(detail=False, pagination_class=None, filter_backends=[], methods=["POST"])
    @validate(TokenSetKeySerializer)
    def session(self, request: Request, body: TokenSetKeySerializer) -> Response:
        """Exchange an agent's API token for an authenticated session. Only valid for
        active agent users with non-expired INTENT_API tokens."""
        from authentik.core.models import AuthenticatedSession
        from authentik.stages.password import BACKEND_INBUILT

        key = body.validated_data.get("key")
        token = (
            Token.objects.filter(key=key, intent=TokenIntents.INTENT_API)
            .select_related("user")
            .first()
        )
        if not token:
            return Response(
                data={"non_field_errors": ["Invalid token."]},
                status=400,
            )
        if token.is_expired:
            return Response(
                data={"non_field_errors": ["Token has expired."]},
                status=403,
            )
        if token.user.type != UserTypes.AGENT:
            return Response(
                data={"non_field_errors": ["Token does not belong to an agent user."]},
                status=400,
            )
        if not token.user.is_active:
            return Response(
                data={"non_field_errors": ["Agent user is inactive."]},
                status=403,
            )
        login(request._request, token.user, backend=BACKEND_INBUILT)
        session = AuthenticatedSession.from_request(request._request, token.user)
        if session:
            session.save()
        return Response(status=204)

    @permission_required("authentik_core.set_token_key")
    @extend_schema(
        request=TokenSetKeySerializer(),
        responses={
            204: OpenApiResponse(description="Successfully changed key"),
            400: OpenApiResponse(description="Missing key"),
            404: OpenApiResponse(description="Token not found or expired"),
        },
    )
    @action(detail=True, pagination_class=None, filter_backends=[], methods=["POST"])
    @validate(TokenSetKeySerializer)
    def set_key(self, request: Request, identifier: str, body: TokenSetKeySerializer) -> Response:
        """Set token key. Action is logged as event. `authentik_core.set_token_key` permission
        is required."""
        token: Token = self.get_object()
        key = body.validated_data.get("key")
        if not key:
            return Response(status=400)
        token.key = key
        token.save()
        Event.new(EventAction.MODEL_UPDATED, model=model_to_dict(token)).from_http(
            request
        )  # noqa # nosec
        return Response(status=204)
