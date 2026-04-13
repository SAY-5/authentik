---
title: Password stage
---

The Password stage prompts the current `pending_user` for a password and validates it against one or more configured backends.

## Overview

Use this stage in authentication or password-change flows when a user should prove possession of a password.

The stage supports authentik's built-in password database, app passwords, LDAP-backed passwords, and Kerberos-backed passwords.

## Configuration options

- **Backends**: select one or more password backends to test in order.
    - **User database + standard password**
    - **User database + app passwords**
    - **User database + LDAP password**
    - **User database + Kerberos password**
- **Failed attempts before cancel**: how many failed password submissions are allowed before the flow is canceled.
- **Allow show password**: show a button that reveals the entered password.
- **Configuration flow**: optional authenticated flow that lets users configure or change their password from user settings.

## Flow integration

This stage is typically bound after [Identification](../identification/index.md) and before [Authenticator Validation](../authenticator_validate/index.md) or [User Login](../user_login/index.md).

If the [Identification stage](../identification/index.md) has its **Password stage** option set, the password prompt is rendered as part of the identification step and the Password stage should not also be bound separately in the same flow.

## Notes

:::tip
Service accounts have automatically generated app passwords. Those can be viewed from the service account's user settings or from the admin interface.
:::

### Passwordless patterns

There are two common ways to avoid prompting for a password:

- Use [Authenticator Validation](../authenticator_validate/index.md#passwordless-authentication) with WebAuthn for a dedicated passwordless flow.
- Conditionally skip the Password stage by binding a policy to its stage binding.

For example, to skip the Password stage when the user already has a confirmed WebAuthn device:

```python
from authentik.stages.authenticator_webauthn.models import WebAuthnDevice

return WebAuthnDevice.objects.filter(
    user=request.context["pending_user"],
    confirmed=True,
).exists()
```

Or for Duo:

```python
from authentik.stages.authenticator_duo.models import DuoDevice

return DuoDevice.objects.filter(
    user=request.context["pending_user"],
    confirmed=True,
).exists()
```

When using this pattern, keep **Evaluate when flow is planned** disabled and **Evaluate when stage is run** enabled on the stage binding.
