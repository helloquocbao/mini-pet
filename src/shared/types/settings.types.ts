export type PetPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export interface PetInstance {
  id: string;
  slug: string;
  x: number;
  y: number;
  scale: number;
}

export interface UserSettings {
  /** Danh sách các pet đang hiển thị (Multi-Pet) */
  activePets: PetInstance[];
  /** Slug của pet chính (để tương thích ngược) */
  activePetSlug: string | null;
  /** Vị trí pet mặc định */
  position: PetPosition;
  /** Scale factor mặc định (0.5 → 2.0) */
  scale: number;
  /** Cho phép pet di chuyển ngẫu nhiên */
  enableWalking: boolean;
  /** Auto-start cùng hệ thống */
  autoStart: boolean;
  /** Hiển thị notification qua pet */
  enableNotifications: boolean;
  /** Khởi chạy cùng hệ thống */
  launchAtStartup: boolean;
  lastX: number | null;
  lastY: number | null;
  language: 'en' | 'vi' | 'fr' | 'zh' | 'it';
}

export const DEFAULT_SETTINGS: UserSettings = {
  activePets: [],
  activePetSlug: null,
  position: 'bottom-right',
  scale: 1.0,
  enableWalking: true,
  autoStart: false,
  enableNotifications: true,
  launchAtStartup: false,
  lastX: null,
  lastY: null,
  language: 'en',
};
