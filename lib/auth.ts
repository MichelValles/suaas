export const AUTH_COOKIE = "auth_usaas";
export const AUTH_VALUE = "ok";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getAccessPassword(): string {
  return process.env.ACCESS_PASSWORD ?? "michel101";
}
