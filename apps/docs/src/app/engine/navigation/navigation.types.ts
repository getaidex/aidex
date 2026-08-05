/** Generic navigation contract. No knowledge of any specific product's page set. */

export interface NavLeaf {
  label: string;
  path: string;
  description?: string;
}

export interface NavSection {
  label: string;
  path?: string;
  children: NavLeaf[];
}

export interface NavTree {
  /** Sections rendered in the persistent sidebar. */
  sections: NavSection[];
}
