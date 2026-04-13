---
title: WebAuthn / FIDO2 / Passkeys authenticator setup stage
---

The WebAuthn / FIDO2 / Passkeys Authenticator setup stage enrolls a WebAuthn device for the current user.

## Overview

This stage supports common WebAuthn device types, including:

- security keys such as YubiKey or Google Titan
- platform authenticators such as Windows Hello, Touch ID, or Face ID
- passkeys stored by operating systems or password managers

Enrolled devices can later be used with the [Authenticator Validation stage](../authenticator_validate/index.md).

## Configuration options

- **User verification**: require, prefer, or discourage built-in user verification during registration.
- **Resident key requirement**: control whether the authenticator should create a discoverable credential.
- **Authenticator attachment**: restrict enrollment to platform authenticators, cross-platform authenticators, or leave it unrestricted.
- **Prevent duplicate devices**: reject registration of the same authenticator more than once.
- **Hints**: browser hints that influence which authenticator is preferred during enrollment.
- **Device type restrictions**: limit enrollment to specific WebAuthn device types.
- **Maximum attempts**: maximum number of failed registration attempts before the stage denies access. A value of `0` disables the limit.
- **Authenticator type name**: optional friendly name shown to the user in self-service settings.
- **Configuration flow**: optional authenticated flow that lets users enroll this authenticator from user settings.

## Flow integration

Use this stage in an enrollment or user-settings flow where the user should register a passkey or hardware key.

To require those devices during login, add an [Authenticator Validation stage](../authenticator_validate/index.md) to the authentication flow and allow the **WebAuthn** device class.

If you want passkey autofill on the login form itself, configure the [Identification stage](../identification/index.md#passkey-autofill-webauthn-conditional-ui) to reference a WebAuthn-capable Authenticator Validation stage.

## Notes

### User verification

**User verification** controls whether authentik requires, prefers, or discourages user verification on the authenticator itself. On platform authenticators such as Windows Hello, that can determine whether a PIN or biometric check is required.

### Resident key requirement

For passkey-based passwordless login, set **Resident key requirement** to **Preferred** or **Required** so the created credential is discoverable.

### Authenticator attachment

Use **Authenticator attachment** when the flow should prefer either removable authenticators such as YubiKeys or built-in authenticators such as Touch ID, Windows Hello, or password-manager passkeys.

### Duplicate and restricted devices

**Prevent duplicate devices** can only be enforced when the authenticator exposes a unique attestation certificate.

If **Device type restrictions** are enabled, authentik can also allow the special built-in type `authentik: Unknown devices` for authenticators whose AAGUID is not otherwise known.
