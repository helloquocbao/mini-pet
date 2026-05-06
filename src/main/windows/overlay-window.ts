import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { OVERLAY_WINDOW } from '../../shared/constants';

export class OverlayWindow {
  private windows: Map<string, BrowserWindow> = new Map();

  /** Tạo và hiển thị một overlay window mới cho một pet instance */
  create(instanceId: string, initialX?: number, initialY?: number): BrowserWindow {
    const { workArea } = screen.getPrimaryDisplay();

    // Vị trí mặc định ngẫu nhiên một chút để các pet không chồng khít lên nhau khi spawn
    const randomOffset = Math.floor(Math.random() * 100);
    const x = initialX !== undefined ? initialX : workArea.x + workArea.width - OVERLAY_WINDOW.WIDTH - 150 - randomOffset;
    const y = initialY !== undefined ? initialY : workArea.y + workArea.height - OVERLAY_WINDOW.HEIGHT - 150 - randomOffset;

    const win = new BrowserWindow({
      width: OVERLAY_WINDOW.WIDTH,
      height: OVERLAY_WINDOW.HEIGHT,
      x,
      y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      hasShadow: false,
      title: `MiniPet-${instanceId}`,
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'icons', `icon.${process.platform === 'win32' ? 'ico' : 'png'}`)
        : path.join(app.getAppPath(), `src/assets/icons/icon.${process.platform === 'win32' ? 'ico' : 'png'}`),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
    });

    // Click-through mặc định
    win.setIgnoreMouseEvents(true, { forward: true });

    // Load overlay HTML với instanceId trong query param để renderer biết mình là ai
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/renderer/overlay/index.html?id=${instanceId}`);
    } else {
      win.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/overlay/index.html`),
        { query: { id: instanceId } }
      );
    }

    this.windows.set(instanceId, win);

    win.on('closed', () => {
      this.windows.delete(instanceId);
    });

    return win;
  }

  /** Lấy cửa sổ theo ID */
  getWindow(instanceId: string): BrowserWindow | undefined {
    return this.windows.get(instanceId);
  }

  /** Lấy tất cả cửa sổ */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /** Xóa một pet instance cụ thể */
  destroy(instanceId: string): void {
    const win = this.windows.get(instanceId);
    if (win) {
      win.close();
      this.windows.delete(instanceId);
    }
  }

  /** Xóa tất cả pet instances */
  destroyAll(): void {
    this.windows.forEach((win) => win.close());
    this.windows.clear();
  }
}
