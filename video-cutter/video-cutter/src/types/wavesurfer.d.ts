declare module "wavesurfer.js" {
  export interface WaveSurferOptions {
    container: HTMLElement;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    barWidth?: number;
    barGap?: number;
    height?: number;
    normalize?: boolean;
    interact?: boolean;
    hideScrollbar?: boolean;
  }

  export default class WaveSurfer {
    constructor(options: WaveSurferOptions);
    static create(options: WaveSurferOptions): WaveSurfer;

    load(url: string): void;
    playPause(): void;
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;

    getDuration(): number;
    getCurrentTime(): number;

    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
  }
}
