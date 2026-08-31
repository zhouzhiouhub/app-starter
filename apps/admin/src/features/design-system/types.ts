export interface DesignSystemToken {
  name: string;
  value: string;
}

export interface DesignSystemTokenGroup {
  key: string;
  label: string;
  tokens: DesignSystemToken[];
}

export interface DesignSystemSummary {
  componentCount: number;
  componentIds: string[];
  cssVariableCount: number;
  cssVariableNames: string[];
  tokenCount: number;
  tokenGroups: DesignSystemTokenGroup[];
}
