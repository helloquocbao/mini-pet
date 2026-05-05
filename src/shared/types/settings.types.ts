export type PetPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export interface UserSettings {
  /** Slug của pet đang active */
  activePetSlug: string | null;
  /** Vị trí pet trên màn hình */
  position: PetPosition;
  /** Scale factor (0.5 → 2.0) */
  scale: number;
  /** Cho phép pet di chuyển ngẫu nhiên */
  enableWalking: boolean;
  /** Auto-start cùng hệ thống */
  autoStart: boolean;
  /** Hiển thị notification qua pet */
  enableNotifications: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  activePetSlug: null,
  position: 'bottom-right',
  scale: 1.0,
  enableWalking: true,
  autoStart: false,
  enableNotifications: true,
};
