declare module 'opentype.js' {
  export function load(
    url: string,
    callback?: (err: string | null, font?: Font) => void,
    opt?: { isUrl?: boolean }
  ): Promise<Font>;

  export interface Font {
    getPath(text: string, x: number, y: number, fontSize: number, options?: unknown): Path;
    getAdvanceWidth(text: string, fontSize: number, options?: unknown): number;
  }

  export interface Path {
    toPathData(decimalPlaces?: number): string;
  }
}
