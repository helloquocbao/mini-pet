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
import { IntelligenceManager } from './pet/intelligence-manager';

// Handle squirrel startup events
if (started) {
  app.quit();
}

// Hide Dock icon on macOS immediately
if (process.platform === 'darwin') {
  app.dock?.hide();
}

let overlayWindow: OverlayWindow;
let settingsWindow: SettingsWindow;
let systemTray: SystemTray;
let petManager: PetManager;
let intelligenceManager: IntelligenceManager;
let isQuitting = false;

app.whenReady().then(async () => {
  // Initialize Pomodoro Manager
  new PomodoroManager();

  // 1. Initialize core managers
  petManager = new PetManager();
  overlayWindow = new OverlayWindow();
  settingsWindow = new SettingsWindow();

  // 2. Link managers
  petManager.setWindowManagers(overlayWindow, settingsWindow);

  // 3. Initialize Pet Manager (loads settings and default pets)
  await petManager.init();

  // 4. Initialize Intelligence Manager
  intelligenceManager = new IntelligenceManager(overlayWindow, petManager);
  intelligenceManager.start();

  // 5. Register IPC handlers
  registerIpcHandlers(petManager);

  // 6. Handle settings window toggle
  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_SETTINGS, () => {
    settingsWindow.open();
  });

  // 7. Spawn all active pets from last session
  await petManager.spawnSavedPets();

  // 8. Setup and create system tray
  systemTray = new SystemTray({
    onShowSettings: () => {
      settingsWindow.open();
    },
    onQuit: () => {
      isQuitting = true;
      settingsWindow.setForceQuit(true);
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
  // macOS: Re-spawn pets if windows were closed but app is still running
  if (overlayWindow && overlayWindow.getAllWindows().length === 0) {
    petManager.spawnSavedPets();
  }
});

// Handle window close behavior
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, only quit if the user explicitly chose to exit
    if (isQuitting) {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  settingsWindow?.setForceQuit(true);
});
