/** PetDex spritesheet standard dimensions */
export const PETDEX_SPRITE = {
  FRAME_WIDTH: 192,
  FRAME_HEIGHT: 208,
  COLUMNS: 8,
  ROWS: 9,
  TOTAL_FRAMES: 72,
  SHEET_WIDTH: 1536, // 192 * 8
  SHEET_HEIGHT: 1872, // 208 * 9
} as const;

/** Default animation mapping cho Spritesheet mới của bạn */
export const DEFAULT_ANIMATIONS: Record<
  string,
  { row: number; frameCount: number; fps: number; loop: boolean }
> = {
  idle: { row: 0, frameCount: 6, fps: 4, loop: true },
  walk: { row: 1, frameCount: 8, fps: 8, loop: true }, // Dùng Run Right/Left tùy hướng
  run: { row: 7, frameCount: 6, fps: 10, loop: true },
  jump: { row: 4, frameCount: 5, fps: 6, loop: false },
  fall: { row: 4, frameCount: 5, fps: 6, loop: false }, // Dùng chung với Jump
  drag: { row: 5, frameCount: 8, fps: 4, loop: true },
  sleep: { row: 6, frameCount: 6, fps: 2, loop: true }, // Dùng Waiting làm Sleep
  notify: { row: 3, frameCount: 4, fps: 6, loop: false }, // Dùng Waving làm Notify
  happy: { row: 3, frameCount: 4, fps: 8, loop: false }, // Dùng Waving làm Happy
};

/** Overlay window dimensions (Vừa đủ cho Pet 2x: 384x416) */
export const OVERLAY_WINDOW = {
  WIDTH: 400,
  HEIGHT: 440,
} as const;

/** Settings window dimensions */
export const SETTINGS_WINDOW = {
  WIDTH: 600,
  HEIGHT: 500,
} as const;

/** Paths */
export const APP_PATHS = {
  PETS_DIR: 'pets',
  SETTINGS_FILE: 'settings.json',
} as const;
