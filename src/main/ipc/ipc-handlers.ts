/**
 * IPC Handlers — Đăng ký tất cả ipcMain.handle và ipcMain.on.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { PetManager } from '../pet/pet-manager';
import { UserSettings } from '../../shared/types/settings.types';

export function registerIpcHandlers(petManager: PetManager): void {
  // --- Pet handlers ---

  ipcMain.handle('pet:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Pet Folder (must contain pet.json)',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return await petManager.importPet(result.filePaths[0]);
    }
    return null;
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_LIST, async () => {
    return petManager.getInstalledPets();
  });

  ipcMain.handle(IPC_CHANNELS.PET_DELETE, async (_event, slug: string) => {
    return petManager.deletePet(slug);
  });

  /** Lấy config cho 1 pet instance cụ thể */
  ipcMain.handle('pet:get-instance-config', async (_event, instanceId: string) => {
    return petManager.getPetInstanceConfig(instanceId);
  });

  /** Spawn thêm pet mới */
  ipcMain.handle('pet:spawn', async (_event, slug: string) => {
    return petManager.spawnPet(slug);
  });

  /** Xoá một pet instance */
  ipcMain.handle('pet:remove', async (_event, instanceId: string) => {
    return petManager.removePet(instanceId);
  });

  ipcMain.handle(IPC_CHANNELS.PET_SET_ACTIVE, async (_event, slug: string) => {
    // Trong Multi-pet, setActive sẽ là spawn thêm một con mới
    return petManager.spawnPet(slug);
  });

  ipcMain.handle(IPC_CHANNELS.PET_LOAD_SPRITESHEET, async (_event, petSlug: string) => {
    return petManager.getSpritesheetURL(petSlug);
  });

  // --- Settings handlers ---

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return petManager.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, newSettings: Partial<UserSettings>) => {
      await petManager.updateSettings(newSettings);
    }
  );

  // --- Window control handlers ---

  ipcMain.on(IPC_CHANNELS.WINDOW_SET_IGNORE_MOUSE, (_event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
  });

  ipcMain.on('window:move', (_event, deltaX: number, deltaY: number) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
    }
  });

  ipcMain.on('window:resize', (_event, width: number, height: number, anchorBottom: boolean = true) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      const [oldW, oldH] = win.getSize();
      const [oldX, oldY] = win.getPosition();
      
      const newWidth = Math.max(50, Math.round(width));
      const newHeight = Math.max(50, Math.round(height));
      
      if (newWidth === oldW && newHeight === oldH) return;
      
      if (anchorBottom) {
        // Điều chỉnh Y để giữ nguyên vị trí cạnh dưới
        const deltaH = newHeight - oldH;
        win.setBounds({
          x: Math.round(oldX - (newWidth - oldW) / 2),
          y: Math.round(oldY - deltaH),
          width: newWidth,
          height: newHeight
        });
      } else {
        win.setSize(newWidth, newHeight);
      }
    }
  });

  ipcMain.on('window:save-position', (_event, instanceId: string, x: number, y: number) => {
    petManager.updateInstancePosition(instanceId, x, y);
  });

  ipcMain.on('pet:ping', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:ping');
    });
  });

  ipcMain.on('pet:start-alarm', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:start-alarm');
    });
  });

  ipcMain.on('pet:stop-alarm', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:stop-alarm');
    });
  });

  ipcMain.handle(IPC_CHANNELS.FILE_EAT, async (_event, filePaths: string[]) => {
    console.log('IPC: Received file:eat request for:', filePaths);
    return petManager.eatFiles(filePaths);
  });
}
