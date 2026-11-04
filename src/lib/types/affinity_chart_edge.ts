export interface AffinityChartEdge {
  kind?: "structural";
  tieId?: number;
  tieType?: string;
  linkId: number;
  fromContactId: number;
  toContactId: number;
  weight: number;
  bridgeScore: number;
}
