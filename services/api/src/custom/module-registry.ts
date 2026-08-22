export interface CustomApiModuleRegistration {
  name: string;
  version: string;
  requiredScopes: string[];
}

export const customApiModules: CustomApiModuleRegistration[] = [];
