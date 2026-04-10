"""authentik core dataclasses"""

from dataclasses import dataclass

from rest_framework.fields import CharField

from authentik.core.api.utils import DynamicURLSerializer, PassiveSerializer
from authentik.flows.challenge import Challenge


@dataclass(slots=True)
class UILoginButton:
    """Dataclass for Source's ui_login_button"""

    # Name, ran through i18n
    name: str

    # Challenge which is presented to the user when they click the button
    challenge: Challenge

    # Pre-resolved icon URLs keyed by variant name, with a fallback URL.
    icon_url: dict[str, str | None] | None = None

    # Whether this source should be displayed as a prominent button
    promoted: bool = False


class UserSettingSerializer(PassiveSerializer):
    """Serializer for User settings for stages and sources"""

    object_uid = CharField()
    component = CharField()
    title = CharField(required=True)
    configure_url = CharField(required=False)
    icon_url = DynamicURLSerializer(required=False, allow_null=True)
