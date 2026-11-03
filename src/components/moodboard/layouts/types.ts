// Shared types for layout calculators

export interface ChunkCoords {
  cx: number;
  cy: number;
  cz: number;
}

export interface CardLayout {
  id: string;
  chunk?: ChunkCoords;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
  opacity: number;
  width: number;
  height: number;
}
