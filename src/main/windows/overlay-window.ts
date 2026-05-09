import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { OVERLAY_WINDOW, APP_PATHS } from '../../shared/constants';

export class OverlayWindow {
  private windows: Map<string, BrowserWindow> = new Map();

  /**
   * Creates and displays a new overlay window for a pet instance.
   * @param instanceId Unique ID of the pet instance.
   * @param initialX Initial X coordinate.
   * @param initialY Initial Y coordinate.
   */
  create(instanceId: string, initialX?: number, initialY?: number): BrowserWindow {
    // If a window already exists for this instance, focus and show it
    const existing = this.windows.get(instanceId);
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      return existing;
    }

    const { workArea } = screen.getPrimaryDisplay();

    // Default position with a slight random offset to prevent stacking
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
        ? path.join(process.resourcesPath, APP_PATHS.ICONS_ASSETS, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`)
        : path.join(app.getAppPath(), `src/assets/${APP_PATHS.ICONS_ASSETS}/icon.${process.platform === 'win32' ? 'ico' : 'png'}`),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
    });

    // Ensure pet remains on top of all other windows, including full-screen apps
    win.setAlwaysOnTop(true, 'screen-saver');

    // Load overlay HTML with instanceId in query params
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

  /**
   * Returns the window instance by ID.
   */
  getWindow(instanceId: string): BrowserWindow | undefined {
    return this.windows.get(instanceId);
  }

  /**
   * Returns all active overlay windows.
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Closes and removes a specific pet instance window.
   */
  destroy(instanceId: string): void {
    const win = this.windows.get(instanceId);
    if (win) {
      win.close();
      this.windows.delete(instanceId);
    }
  }

  /**
   * Closes and removes all active pet instance windows.
   */
  destroyAll(): void {
    this.windows.forEach((win) => win.close());
    this.windows.clear();
  }
}
