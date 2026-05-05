/**
 * Preload script — Context Bridge.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types/ipc.types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Pet
  getActivePet: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_ACTIVE),
  getPetList: () => ipcRenderer.invoke(IPC_CHANNELS.PET_GET_LIST),
  setActivePet: (slug: string) => ipcRenderer.invoke(IPC_CHANNELS.PET_SET_ACTIVE, slug),
  loadSpritesheet: (petSlug: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.PET_LOAD_SPRITESHEET, petSlug),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),

  // Window control
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_IGNORE_MOUSE, ignore, options),
  moveWindow: (deltaX: number, deltaY: number) => ipcRenderer.send('window:move', deltaX, deltaY),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('window:resize', width, height),
  openSettings: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_OPEN_SETTINGS),

  // Settings update (listen)
  onSettingsUpdate: (callback: (data: unknown) => void) =>
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_UPDATE, (_event, data) => callback(data)),

  // Notifications (listen)
  onNotification: (callback: (payload: unknown) => void) =>
    ipcRenderer.on(IPC_CHANNELS.NOTIFICATION_NEW, (_event, payload) => callback(payload)),
});
