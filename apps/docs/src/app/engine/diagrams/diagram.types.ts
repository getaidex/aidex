export interface DiagramLink {
  label: string;
  path: string;
}

export interface DiagramNode {
  id: string;
  label: string;
  description: string;
  relatedPackages?: DiagramLink[];
  relatedExamples?: DiagramLink[];
  relatedGuide?: DiagramLink;
}

export interface DiagramLayer {
  nodes: DiagramNode[];
}

export interface DiagramData {
  title: string;
  /** Layers render top-to-bottom (or left-to-right); a node is treated as
   * connected to every node in the immediately adjacent layer. */
  layers: DiagramLayer[];
}
