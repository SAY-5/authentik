"""Enterprise tasks"""

from django.utils.translation import gettext_lazy as _
from dramatiq.actor import actor

from authentik.enterprise.license import LicenseKey


def _deactivate_agent_users():
    """Mark all active agent users inactive and remove their sessions when the enterprise
    license is not valid. Called after each license usage recording."""
    from authentik.core.models import (
        USER_ATTRIBUTE_IS_AGENT,
        Session,
        User,
        UserTypes,
    )

    agents = User.objects.filter(
        type=UserTypes.SERVICE_ACCOUNT,
        attributes__contains={USER_ATTRIBUTE_IS_AGENT: True},
        is_active=True,
    )
    for agent in agents:
        Session.objects.filter(authenticatedsession__user=agent).delete()
    agents.update(is_active=False)


@actor(description=_("Update enterprise license status."))
def enterprise_update_usage():
    usage = LicenseKey.get_total().record_usage()
    if not usage.status.is_valid:
        _deactivate_agent_users()
