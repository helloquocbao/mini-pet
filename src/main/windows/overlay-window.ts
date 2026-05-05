import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { OVERLAY_WINDOW } from '../../shared/constants';

export class OverlayWindow {
  private window: BrowserWindow | null = null;

  /** Tạo và hiển thị overlay window */
  create(): void {
    const { workArea } = screen.getPrimaryDisplay();

    const x = workArea.x + workArea.width - OVERLAY_WINDOW.WIDTH - 100;
    const y = workArea.y + workArea.height - OVERLAY_WINDOW.HEIGHT - 100;

    this.window = new BrowserWindow({
      width: OVERLAY_WINDOW.WIDTH,
      height: OVERLAY_WINDOW.HEIGHT,
      x,
      y,
      transparent: true, // Bật lại trong suốt
      frame: false, // Ẩn khung
      alwaysOnTop: true,
      skipTaskbar: true, // Ẩn khỏi taskbar
      resizable: false,
      focusable: false,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
    });

    // Tôi tạm thời để lệnh mở DevTools này, bạn có thể đóng nó nếu Pet đã hiện đẹp
    // this.window.webContents.openDevTools({ mode: 'detach' });

    // Click-through với forward (nhận mouse move events)
    this.window.setIgnoreMouseEvents(true, { forward: true });

    // Load overlay HTML
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // In dev, Vite handles the path. Forge provides the env var.
      this.window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/renderer/overlay/index.html`);
    } else {
      this.window.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/overlay/index.html`)
      );
    }

    // IPC listener cho toggle click-through
    ipcMain.on('window:set-ignore-mouse-events', (_event, ignore, options) => {
      this.window?.setIgnoreMouseEvents(ignore, options);
    });
  }

  setPosition(position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'): void {
    if (!this.window) return;
    const { workArea } = screen.getPrimaryDisplay();
    let x, y;

    switch (position) {
      case 'bottom-left':
        x = workArea.x;
        y = workArea.y + workArea.height - OVERLAY_WINDOW.HEIGHT;
        break;
      case 'top-left':
        x = workArea.x;
        y = workArea.y;
        break;
      case 'top-right':
        x = workArea.x + workArea.width - OVERLAY_WINDOW.WIDTH;
        y = workArea.y;
        break;
      default: // bottom-right
        x = workArea.x + workArea.width - OVERLAY_WINDOW.WIDTH;
        y = workArea.y + workArea.height - OVERLAY_WINDOW.HEIGHT;
    }

    this.window.setPosition(x, y);
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  destroy(): void {
    this.window?.close();
    this.window = null;
  }
}
