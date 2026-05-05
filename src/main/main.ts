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
import http from 'http';
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
  const settings = await petManager.getSettings();
  overlayWindow = new OverlayWindow();
  overlayWindow.create(settings.lastX, settings.lastY);

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

  // 7. Khởi động Webhook Server (Cổng tiếp nhận thông báo ngoài)
  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/ping')) {
      // Gửi lệnh nhảy tới Pet
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('pet:ping');
      });
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Đã gọi Pet thành công! 🐾');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(3333, '127.0.0.1', () => {
    console.log('Webhook server đang chạy tại: http://localhost:3333');
  });
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
