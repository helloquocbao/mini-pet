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
  }

  // 1. Init managers
  petManager = new PetManager();
  overlayWindow = new OverlayWindow();
  settingsWindow = new SettingsWindow();

  // 2. Connect managers
  petManager.setWindowManagers(overlayWindow, settingsWindow);

  // 3. Init pet manager (loads settings)
  await petManager.init();

  // 4. Register IPC handlers
  registerIpcHandlers(petManager);

  // Thêm handler riêng để mở cửa sổ settings
  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    settingsWindow.open();
  });

  // 5. Spawn all active pets
  await petManager.spawnSavedPets();

  // 6. Create system tray
  systemTray = new SystemTray({
    onShowSettings: () => {
      settingsWindow.open();
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
    onTogglePet: () => {
      const windows = overlayWindow.getAllWindows();
      if (windows.length > 0) {
        const anyVisible = windows.some(win => win.isVisible());
        windows.forEach(win => {
          if (anyVisible) win.hide();
          else win.show();
        });
      }
    },
  });
  systemTray.create();
});

app.on('activate', () => {
  if (overlayWindow && overlayWindow.getAllWindows().length === 0) {
    petManager.spawnSavedPets();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      // Prevent default
    } else {
      app.quit();
    }
  }
});
