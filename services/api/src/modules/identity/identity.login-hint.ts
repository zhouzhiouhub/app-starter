export const AUTH_LOGIN_PATH = "/api/v1/auth/login";
export const ADMIN_LOGIN_PAGE = "/login";

export function buildLoginGetHint() {
  return {
    data: {
      accepts: "POST",
      body: {
        email: "string",
        password: "string",
        tenantSlug: "optional, defaults to default",
      },
      loginPage: ADMIN_LOGIN_PAGE,
      message:
        "This is the login API, not the Admin page. Open /login on the Admin app (port 5173) and submit the form with POST. Do not open this URL in the browser address bar.",
      path: AUTH_LOGIN_PATH,
    },
  };
}
