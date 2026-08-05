export interface SearchDocument {
  id: string;
  title: string;
  /** Human-readable group used to label results, e.g. "Packages", "Examples", "Guides". */
  section: string;
  path: string;
  excerpt: string;
  headings: string[];
  keywords: string[];
}
