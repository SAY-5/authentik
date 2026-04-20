import { DEFAULT_CONFIG } from "#common/api/config";
import { isResponseErrorLike } from "#common/errors/network";
import { globalAK } from "#common/global";
import { UIConfig, UserDisplay } from "#common/ui/config";

import { CoreApi, SessionUser, UserSelf } from "@goauthentik/api";

import { match } from "ts-pattern";

export interface ClientSessionPermissions {
    editApplications: boolean;
    accessAdmin: boolean;
}

export type UserLike = Pick<UserSelf, "username" | "name" | "email">;

/**
 * The display name of the current user, according to their UI config settings.
 */
export function formatUserDisplayName(user: UserLike | null, uiConfig?: UIConfig): string {
    if (!user) return "";

    const label = match(uiConfig?.navbar.userDisplay)
        .with(UserDisplay.username, () => user.username)
        .with(UserDisplay.name, () => user.name)
        .with(UserDisplay.email, () => user.email)
        .with(UserDisplay.none, () => null)
        .otherwise(() => user.name || user.username);

    return label || "";
}

/**
 * Whether the current session is an unauthenticated guest session.
 */
export function isGuest(user: UserSelf | null): boolean {
    return user?.pk === -1;
}

/**
 * Create a guest session for unauthenticated users.
 *
 * @see {@linkcode me} for the actual session retrieval.
 */
function createGuestSession(): SessionUser {
    const guest: SessionUser = {
        user: {
            pk: -1,
            isSuperuser: false,
            isActive: true,
            groups: [],
            roles: [],
            avatar: "",
            uid: "",
            username: "",
            name: "",
            settings: {},
            systemPermissions: [],
        },
    };

    return guest;
}

let pendingRedirect = false;

/**
 * Redirect to the default authentication flow, preserving the current URL as "next" parameter.
 *
 * @category Session
 */
export function redirectToAuthFlow(nextPathname?: string): void {
    if (pendingRedirect) {
        console.debug("authentik/users: Redirect already pending, ");
        return;
    }

    const { pathname, search, hash } = window.location;

    // When authentik is deployed behind AUTHENTIK_WEB__PATH, the flow URL
    // must include the configured prefix (e.g. /my-prefix/flows/...). The
    // backend already surfaces that prefix as globalAK().api.relBase, so
    // derive the default target from it rather than hardcoding "/flows/...".
    // Explicit callers passing a full path (already-prefixed) still win.
    const targetPath = nextPathname ?? `${globalAK().api.relBase}flows/-/default/authentication/`;

    const authFlowRedirectURL = new URL(targetPath, window.location.origin);

    authFlowRedirectURL.searchParams.set("next", `${pathname}${search}${hash}`);

    pendingRedirect = true;

    console.debug(
        `authentik/users: Redirecting to authentication flow at ${authFlowRedirectURL.href}`,
    );

    window.location.assign(authFlowRedirectURL);
}

/**
 * Retrieve the current user session.
 *
 * This is a memoized function, so it will only make one request per page load.
 *
 * @see {@linkcode refreshMe} to force a refresh.
 *
 * @category Session
 */
export async function me(requestInit?: RequestInit): Promise<SessionUser> {
    return new CoreApi(DEFAULT_CONFIG)
        .coreUsersMeRetrieve(requestInit)
        .catch(async (error: unknown) => {
            if (isResponseErrorLike(error)) {
                const { response } = error;

                if (response.status === 401 || response.status === 403) {
                    redirectToAuthFlow();
                }
            }

            console.debug("authentik/users: Failed to retrieve user session", error);

            return createGuestSession();
        });
}
