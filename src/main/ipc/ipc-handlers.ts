/**
 * IPC Handlers — Đăng ký tất cả ipcMain.handle và ipcMain.on.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { PetManager } from '../pet/pet-manager';
import { UserSettings } from '../../shared/types/settings.types';

import { SystemTray } from '../tray/system-tray';

export function registerIpcHandlers(petManager: PetManager, systemTray: SystemTray): void {
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

  ipcMain.handle(IPC_CHANNELS.PET_DELETE, async (_event, slug: string) => {
    const result = await petManager.deletePet(slug);
    const settings = petManager.getSettings();
    const activePet = petManager.getActivePet();

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATE, { settings, activePet });
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_LIST, async () => {
    return petManager.getInstalledPets();
  });

  ipcMain.handle(IPC_CHANNELS.PET_GET_ACTIVE, async () => {
    return petManager.getActivePet();
  });

  ipcMain.handle(IPC_CHANNELS.PET_SET_ACTIVE, async (_event, slug: string) => {
    const result = await petManager.setActivePet(slug);
    const settings = petManager.getSettings();
    const activePet = petManager.getActivePet();

    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATE, { settings, activePet });
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.PET_LOAD_SPRITESHEET, async (_event, petSlug: string) => {
    return petManager.getSpritesheetURL(petSlug);
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

  // --- Settings handlers ---

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return petManager.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, newSettings: Partial<UserSettings>) => {
      await petManager.updateSettings(newSettings);
      const settings = petManager.getSettings();
      const activePet = petManager.getActivePet();

      if (newSettings.language) {
        systemTray.updateMenu(settings.language);
      }

      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send(IPC_CHANNELS.SETTINGS_UPDATE, { settings, activePet });
      });
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

  ipcMain.on('window:resize', (_event, width: number, height: number) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      const [oldW, oldH] = win.getSize();
      const newWidth = Math.max(50, Math.round(width));
      const newHeight = Math.max(50, Math.round(height));

      if (newWidth === oldW && newHeight === oldH) return;

      // Khi resize xuống dưới (Top-aligned), không cần chỉnh Y, rất mượt.
      win.setSize(newWidth, newHeight);
    }
  });

  ipcMain.on('window:save-position', (_event, x: number, y: number) => {
    petManager.updatePosition(x, y);
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    // To be handled by main.ts or separate handler in Task 8
  });
}
