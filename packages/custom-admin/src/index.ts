export interface CustomAdminRoute {
  path: string;
  label: string;
  requiredScopes: string[];
}

export const customAdminRoutes: CustomAdminRoute[] = [];
