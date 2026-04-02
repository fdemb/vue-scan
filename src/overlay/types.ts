export interface OutlineData {
  id: number
  name: string
  count: number
  x: number
  y: number
  width: number
  height: number
}

export type InlineOutlineData = [
  id: number,
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
]

export interface ActiveOutline {
  id: number
  name: string
  count: number
  x: number
  y: number
  width: number
  height: number
  targetX: number
  targetY: number
  targetWidth: number
  targetHeight: number
  frame: number
}

export interface BlueprintOutline {
  name: string
  count: number
  elements: Element[]
}

export type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'scroll'; deltaX: number; deltaY: number }
  | { type: 'draw-outlines'; data: ArrayBuffer; names: string[] }
