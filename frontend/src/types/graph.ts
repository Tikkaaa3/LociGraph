export interface GraphNodeData {
  id: string;
  content: string;
  activation: number;
  edges: Record<string, number>;
  top_neighbors?: { id: string; weight: number }[];
}

export interface GraphLinkData {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNodeData[];
  links: GraphLinkData[];
}
