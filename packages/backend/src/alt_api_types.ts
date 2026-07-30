import { type Node } from "./api_types";

export type AltNode = Node & {
  [key: string]: any;
  styledTextSegments: Array<
    Pick<StyledTextSegment, any | "characters" | "start" | "end">
  >;
  cumulativeRotation: number;
  uniqueName: string;
  width: number;
  height: number;
  x: number;
  y: number;
};
