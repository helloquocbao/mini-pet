/**
 * Main process entry point.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { OverlayWindow } from './windows/overlay-window';
import { SystemTray } from './tray/system-tray';
import { registerIpcHandlers } from './ipc/ipc-handlers';
import { PetManager } from './pet/pet-manager';
import { SettingsWindow } from './windows/settings-window';
import { IPC_CHANNELS } from '../shared/types/ipc.types';
import started from 'electron-squirrel-startup';
import { PomodoroManager } from './pet/pomodoro-manager';

if (started) {
  app.quit();
}

let overlayWindow: OverlayWindow;
let settingsWindow: SettingsWindow;
let systemTray: SystemTray;
let petManager: PetManager;
let isQuitting = false;

app.whenReady().then(async () => {
  // Khởi tạo trình quản lý Pomodoro
  new PomodoroManager();

  // Ẩn Dock icon trên Mac để app chạy tinh tế hơn
  if (process.platform === 'darwin') {
    app.dock.hide();
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'icons', 'icon.png')
      : path.join(app.getAppPath(), 'src/assets/icons/icon.png');
    app.dock.setIcon(iconPath);
  }

  // 1. Init pet manager
  petManager = new PetManager();
  await petManager.init();

  const settings = await petManager.getSettings();

  // 2. Create windows
  overlayWindow = new OverlayWindow();
  overlayWindow.create(settings.lastX, settings.lastY);

  settingsWindow = new SettingsWindow();

  // 3. Create system tray
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
  systemTray.create(settings.language);

  // 4. Register IPC handlers
  registerIpcHandlers(petManager, systemTray);

  // Thêm handler riêng để mở cửa sổ settings
  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    settingsWindow.open();
  });
});

// macOS: re-create window khi click dock icon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && overlayWindow) {
    overlayWindow.create();
  }
});

// KHÔNG quit khi đóng tất cả windows (chạy trong tray)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      // Prevent default behavior to keep app running in tray
      // Note: In some versions of Electron, this might not be needed if tray exists
    } else {
      app.quit();
    }
  }
});
