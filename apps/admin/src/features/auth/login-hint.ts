export interface AdminLoginEnvironment {
  readonly MODE?: string;
  readonly PROD?: boolean;
  readonly VITE_APP_ENV?: string;
  readonly VITE_VERCEL_ENV?: string;
}

export interface AdminLoginHint {
  readonly description: string;
  readonly showLocalSeedAccount: boolean;
}

export function readAdminLoginHint(
  env: AdminLoginEnvironment = {},
): AdminLoginHint {
  if (isProductionAdminBuild(env)) {
    return {
      description: "Sign in with a tenant admin account to manage pages.",
      showLocalSeedAccount: false,
    };
  }

  return {
    description:
      "Local development can use the seeded tenant admin documented in the README. The API login endpoint only accepts POST.",
    showLocalSeedAccount: true,
  };
}

export function isProductionAdminBuild(
  env: AdminLoginEnvironment = {},
): boolean {
  if (env.PROD === true) {
    return true;
  }

  return [env.MODE, env.VITE_APP_ENV, env.VITE_VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}
