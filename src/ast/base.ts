import type { Locations } from "./common.js";

// internals
export interface BaseNode extends Locations {
  type: string;
}
