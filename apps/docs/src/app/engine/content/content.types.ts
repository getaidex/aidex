/** Generic renderable document. Product-specific fields belong in a content-source, not here. */
export interface DocPage {
  slug: string;
  title: string;
  description: string;
  markdown: string;
}

export interface RelatedLink {
  label: string;
  path: string;
  description?: string;
}

export interface Badge {
  label: string;
  tone: 'neutral' | 'positive' | 'info' | 'warning';
  title?: string;
}

export interface InstallCommands {
  packageName: string;
  extraPackages?: string[];
}
