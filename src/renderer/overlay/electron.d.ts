export interface ElectronAPI {
  getActivePet: () => Promise<any>;
  getPetList: () => Promise<any[]>;
  setActivePet: (slug: string) => Promise<void>;
  loadSpritesheet: (petSlug: string) => Promise<string>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: Partial<any>) => Promise<void>;
  importPet: () => Promise<any[]>;
  deletePet: (slug: string) => Promise<any[]>;
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  moveWindow: (deltaX: number, deltaY: number) => void;
  resizeWindow: (width: number, height: number, anchorBottom?: boolean) => void;
  openSettings: () => void;
  onSettingsUpdate: (callback: (data: any) => void) => void;
  onNotification: (callback: (payload: any) => void) => void;
  
  // --- New Methods ---
  pingPet: () => void;
  onPing: (cb: () => void) => void;
  startAlarm: () => void;
  stopAlarm: () => void;
  onStartAlarm: (cb: () => void) => void;
  onStopAlarm: (cb: () => void) => void;
  savePosition: (x: number, y: number) => void;
  
  // --- Pomodoro ---
  startPomo: (focus: number, breakMin: number) => void;
  pausePomo: () => void;
  resetPomo: () => void;
  updatePomoConfig: (focus: number, breakMin: number) => void;
  getPomoState: () => Promise<any>;
  onPomoTick: (cb: (state: any) => void) => void;
  onPetSay: (cb: (text: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
