---
title: Authenticator validation stage
---

The Authenticator Validation stage validates an already enrolled authenticator device.

## Overview

This stage is used during authentication after a user has already enrolled one or more authenticators with a setup stage, such as:

- [Duo Authenticator Setup stage](../authenticator_duo/index.md)
- [Email Authenticator Setup stage](../authenticator_email/index.md)
- [SMS Authenticator Setup stage](../authenticator_sms/index.md)
- [Static Authenticator Setup stage](../authenticator_static/index.md)
- [TOTP Authenticator Setup stage](../authenticator_totp/index.md)
- [WebAuthn / FIDO2 / Passkeys Authenticator setup stage](../authenticator_webauthn/index.md)

## Configuration options

- **Not configured action**: control what happens when the user has no compatible device.
    - **Skip**: continue the flow without MFA.
    - **Deny**: deny access and end the flow.
    - **Configure**: inject one of the configured enrollment stages and continue after that stage succeeds.
- **Configuration stages**: stages that can be injected when **Not configured action** is set to **Configure**.
- **Device classes**: which enrolled authenticator types can be used at this step.
- **Last validation threshold**: skip validation if the user has successfully used a compatible device within the configured time window.
- **WebAuthn user verification**: user-verification requirement for WebAuthn authentication.
- **WebAuthn hints**: browser hints that influence which WebAuthn authenticator is preferred.
- **WebAuthn device type restrictions**: optionally limit which WebAuthn device types are allowed.

## Flow integration

This stage normally appears in authentication flows after [Identification](../identification/index.md) and [Password](../password/index.md), and before [User Login](../user_login/index.md).

If **Not configured action** is set to **Configure**, the stage can bootstrap enrollment by injecting one or more authenticator setup stages into the running flow.

## Notes

### Less-frequent validation

Set **Last validation threshold** to a non-zero value to avoid prompting on every login. Any compatible device within the allowed classes can satisfy that threshold.

For code-based devices such as TOTP, Static, and SMS, values below `seconds=30` are not useful because those devices do not store exact validation timestamps at sub-window precision.

### Passwordless authentication

:::caution
Firefox has known issues with some Touch ID and platform-authenticator flows. See Mozilla bug `1536482` for one longstanding example.
:::

Passwordless authentication in this stage currently relies on **WebAuthn** devices.

To build a dedicated passwordless flow:

1. Create an **Authentication** flow.
2. Add an Authenticator Validation stage that allows the **WebAuthn** device class.
3. Add any extra verification stages you still require.
4. End the flow with a [User Login stage](../user_login/index.md).

If you want users to choose a passkey directly from the browser's autofill UI on the identification screen, configure **Passkey autofill** in the [Identification stage](../identification/index.md#passkey-autofill-webauthn-conditional-ui).

Users can either access the passwordless flow directly or reach it through an Identification stage's **Passwordless flow** link.

### Automatic device selection

If the user has multiple compatible devices, authentik lets them choose one. After a successful validation, the last-used device is automatically preferred the next time this stage runs.

### WebAuthn device type restrictions

If you restrict allowed WebAuthn device types, those restrictions only apply to WebAuthn devices that authentik knows how to classify. This is useful when you need to limit authentication to specific hardware families or compliance profiles.

### Authentication logging

When passwordless authentication succeeds through this stage, authentik records the method as `auth_webauthn_pwl` in flow context and related events.

Example event context:

```json
{
    "auth_method": "auth_webauthn_pwl",
    "auth_method_args": {
        "device": {
            "pk": 1,
            "app": "authentik_stages_authenticator_webauthn",
            "name": "test device",
            "model_name": "webauthndevice"
        }
    }
}
```
