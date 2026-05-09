/**
 * IPC Handlers — Registers all ipcMain.handle and ipcMain.on listeners.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { PetManager } from '../pet/pet-manager';
import { UserSettings } from '../../shared/types/settings.types';

/**
 * Registers all IPC handlers for the application.
 * @param petManager Centralized pet management instance.
 */
export function registerIpcHandlers(petManager: PetManager): void {
  // --- Pet Handlers ---

  /** Imports a new pet from a folder or ZIP file */
  ipcMain.handle('pet:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory'],
      filters: [
        { name: 'MiniPet Files', extensions: ['zip', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Select Pet ZIP file, pet.json, OR Pet Folder',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      // If a pet.json file is selected, use its parent directory
      if (filePath.toLowerCase().endsWith('.json')) {
        return await petManager.importPet(path.dirname(filePath));
      }
      // filePath can be a directory or a .zip file
      return await petManager.importPet(filePath);
    }
    return null;
  });

  /** Returns the list of installed pets */
  ipcMain.handle(IPC_CHANNELS.PET_GET_LIST, async () => {
    return petManager.getInstalledPets();
  });

  /** Deletes an installed pet by its slug */
  ipcMain.handle(IPC_CHANNELS.PET_DELETE, async (_event, slug: string) => {
    return petManager.deletePet(slug);
  });

  /** Fetches configuration for a specific pet instance */
  ipcMain.handle('pet:get-instance-config', async (_event, instanceId: string) => {
    return petManager.getPetInstanceConfig(instanceId);
  });

  /** Spawns a new pet instance by slug */
  ipcMain.handle('pet:spawn', async (_event, slug: string) => {
    return petManager.spawnPet(slug);
  });

  /** Removes a specific pet instance */
  ipcMain.handle('pet:remove', async (_event, instanceId: string) => {
    return petManager.removePet(instanceId);
  });

  /** Legacy support: Sets active pet (spawns a new instance in multi-pet mode) */
  ipcMain.handle(IPC_CHANNELS.PET_SET_ACTIVE, async (_event, slug: string) => {
    return petManager.spawnPet(slug);
  });

  /** Returns the URL for a pet's spritesheet */
  ipcMain.handle(IPC_CHANNELS.PET_LOAD_SPRITESHEET, async (_event, petSlug: string) => {
    return petManager.getSpritesheetURL(petSlug);
  });

  // --- Settings Handlers ---

  /** Fetches the current user settings */
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return petManager.getSettings();
  });

  /** Updates user settings */
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, newSettings: Partial<UserSettings>) => {
      await petManager.updateSettings(newSettings);
    }
  );

  // --- Window Control Handlers ---

  /** Toggles mouse event pass-through for a window */
  ipcMain.on(IPC_CHANNELS.WINDOW_SET_IGNORE_MOUSE, (_event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    win?.setIgnoreMouseEvents(ignore, options);
  });

  /** Enables drag-and-drop mode (disables mouse pass-through temporarily) */
  ipcMain.on('window:set-drag-mode', (_event, instanceId: string, enabled: boolean) => {
    petManager.setDragMode(instanceId, enabled);
  });

  /** Moves a window by a specific delta */
  ipcMain.on('window:move', (_event, deltaX: number, deltaY: number) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
    }
  });

  /** Resizes a window while optionally anchoring to the bottom center */
  ipcMain.on('window:resize', (_event, width: number, height: number, anchorBottom: boolean = true) => {
    const win = BrowserWindow.fromWebContents(_event.sender);
    if (win) {
      const [oldW, oldH] = win.getSize();
      const [oldX, oldY] = win.getPosition();
      
      const newWidth = Math.max(50, Math.round(width));
      const newHeight = Math.max(50, Math.round(height));
      
      if (newWidth === oldW && newHeight === oldH) return;
      
      if (anchorBottom) {
        // Adjust Y to keep the bottom edge fixed
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

  /** Saves the position of a specific pet instance */
  ipcMain.on('window:save-position', (_event, instanceId: string, x: number, y: number) => {
    petManager.updateInstancePosition(instanceId, x, y);
  });

  /** Pings all pets (triggers notification/happy animation) */
  ipcMain.on('pet:ping', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:ping');
    });
  });

  /** Triggers the alarm animation on all pets */
  ipcMain.on('pet:start-alarm', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:start-alarm');
    });
  });

  /** Stops the alarm animation on all pets */
  ipcMain.on('pet:stop-alarm', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:stop-alarm');
    });
  });

  /** Trashes specified files ("eating" them) */
  ipcMain.handle(IPC_CHANNELS.FILE_EAT, async (_event, filePaths: string[]) => {
    console.log('IPC: Received file:eat request for:', filePaths);
    return petManager.eatFiles(filePaths);
  });

  /** Synchronizes speech between multiple pet instances */
  ipcMain.on('pet:speaking', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:someone-speaking');
    });
  });

  /** Debug log from renderer */
  ipcMain.on('debug:log', (_event, message: string) => {
    console.log(`[RENDERER DEBUG] ${message}`);
  });
}
