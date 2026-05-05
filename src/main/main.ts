/**
 * Main process entry point.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { OverlayWindow } from './windows/overlay-window';
import { SystemTray } from './tray/system-tray';
import { registerIpcHandlers } from './ipc/ipc-handlers';
import { PetManager } from './pet/pet-manager';
import { SettingsWindow } from './windows/settings-window';
import { IPC_CHANNELS } from '../shared/types/ipc.types';
import started from 'electron-squirrel-startup';

if (started) {
  app.quit();
}

let overlayWindow: OverlayWindow;
let settingsWindow: SettingsWindow;
let systemTray: SystemTray;
let petManager: PetManager;
let isQuitting = false;

app.whenReady().then(async () => {
  // Ẩn Dock icon trên Mac để app chạy tinh tế hơn
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  // 1. Init pet manager
  petManager = new PetManager();
  await petManager.init();

  // 2. Register IPC handlers
  registerIpcHandlers(petManager);

  // Thêm handler riêng để mở cửa sổ settings
  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    settingsWindow.open();
  });

  // 3. Create windows
  overlayWindow = new OverlayWindow();
  overlayWindow.create();

  settingsWindow = new SettingsWindow();

  // 4. Create system tray
  systemTray = new SystemTray({
    onShowSettings: () => {
      settingsWindow.open();
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
    onTogglePet: () => {
      const win = overlayWindow.getWindow();
      if (win) {
        if (win.isVisible()) win.hide();
        else win.show();
      }
    },
  });
  systemTray.create();
});

// macOS: re-create window khi click dock icon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && overlayWindow) {
    overlayWindow.create();
  }
});

// KHÔNG quit khi đóng tất cả windows (chạy trong tray)
app.on('window-all-closed', (e: Event) => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      // Prevent default behavior to keep app running in tray
      // Note: In some versions of Electron, this might not be needed if tray exists
    } else {
      app.quit();
    }
  }
});
