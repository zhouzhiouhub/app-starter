export type MediaProductionEnvironment = {
  APP_ENV?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

export function isProductionMediaEnvironment(
  env: MediaProductionEnvironment = process.env,
): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}
