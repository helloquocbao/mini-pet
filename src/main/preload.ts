/**
 * Preload script — Context Bridge.
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Pet
  getActivePet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_ACTIVE),
  getPetList: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_LIST),
  setActivePet: (slug: string) => ipcRenderer.invoke(IPC_CHANNELS.PET_SET_ACTIVE, slug),
  importPet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_IMPORT),
  deletePet: (slug: string) => ipcRenderer.invoke(IPC_CHANNELS.PET_DELETE, slug),
  eatFile: (paths: string[]) => ipcRenderer.invoke(IPC_CHANNELS.FILE_EAT, paths),
  
  // Multi-Pet
  getInstanceConfig: (id: string) => ipcRenderer.invoke('pet:get-instance-config', id),
  spawnPet: (slug: string) => ipcRenderer.invoke('pet:spawn', slug),
  removePet: (id: string) => ipcRenderer.invoke('pet:remove', id),
  onPositionsUpdate: (cb: (data: any) => void) => ipcRenderer.on('pets:positions-updated', (_event, data) => cb(data)),

  pingPet: () => ipcRenderer.send('pet:ping'),
  onPing: (cb: any) => ipcRenderer.on('pet:ping', () => cb()),
  startAlarm: () => ipcRenderer.send('pet:start-alarm'),
  stopAlarm: () => ipcRenderer.send('pet:stop-alarm'),
  onStartAlarm: (cb: any) => ipcRenderer.on('pet:start-alarm', () => cb()),
  onStopAlarm: (cb: any) => ipcRenderer.on('pet:stop-alarm', () => cb()),
  loadSpritesheet: (petSlug: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PET_LOAD_SPRITESHEET, petSlug),

  // --- Pomodoro ---
  startPomo: (focus: number, breakMin: number) => ipcRenderer.send('pomo:start', focus, breakMin),
  pausePomo: () => ipcRenderer.send('pomo:pause'),
  resetPomo: () => ipcRenderer.send('pomo:reset'),
  updatePomoConfig: (focus: number, breakMin: number) => ipcRenderer.send('pomo:update-config', focus, breakMin),
  getPomoState: () => ipcRenderer.invoke('pomo:get-state'),
  onPomoTick: (cb: (state: any) => void) => ipcRenderer.on('pomo:tick', (_event, state) => cb(state)),

  // --- Settings ---
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // Window control
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_IGNORE_MOUSE, ignore, options),
  moveWindow: (deltaX: number, deltaY: number) => ipcRenderer.send('window:move', deltaX, deltaY),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('window:resize', width, height),
  savePosition: (instanceId: string, x: number, y: number) => ipcRenderer.send('window:save-position', instanceId, x, y),
  openSettings: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_OPEN_SETTINGS),

  // Settings update (listen)
  onSettingsUpdate: (callback: (data: unknown) => void) =>
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATE, (_event, data) => callback(data)),

  // File utils
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Notifications (listen)
  onNotification: (callback: (payload: unknown) => void) =>
    ipcRenderer.on(IPC_CHANNELS.NOTIFICATION_NEW, (_event, payload) => callback(payload)),
});
