export interface ElectronAPI {
  getActivePet: () => Promise<any>;
  getPetList: () => Promise<any[]>;
  setActivePet: (slug: string) => Promise<void>;
  loadSpritesheet: (petSlug: string) => Promise<string>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: Record<string, any>) => Promise<void>;
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  moveWindow: (deltaX: number, deltaY: number) => void;
  resizeWindow: (width: number, height: number) => void;
  openSettings: () => void;
  onSettingsUpdate: (callback: (data: any) => void) => void;
  onNotification: (callback: (payload: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
