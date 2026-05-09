import { app, BrowserWindow } from 'electron';
import path from 'path';
import { SETTINGS_WINDOW, APP_PATHS } from '../../shared/constants';

export class SettingsWindow {
  private window: BrowserWindow | null = null;
  private forceQuit: boolean = false;

  /**
   * Opens the settings window or focuses it if already open.
   */
  open(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: SETTINGS_WINDOW.WIDTH,
      height: SETTINGS_WINDOW.HEIGHT,
      title: 'MiniPet Settings',
      icon: app.isPackaged
        ? path.join(process.resourcesPath, APP_PATHS.ICONS_ASSETS, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`)
        : path.join(app.getAppPath(), `src/assets/${APP_PATHS.ICONS_ASSETS}/icon.${process.platform === 'win32' ? 'ico' : 'png'}`),
      resizable: false,
      maximizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/renderer/settings/index.html`);
    } else {
      this.window.loadFile(
        path.join(
          __dirname,
          `../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/settings/index.html`
        )
      );
    }

    // Handle window close behavior: hide instead of destroy unless forced
    this.window.on('close', (e) => {
      if (!this.forceQuit) {
        e.preventDefault();
        this.window?.hide();
      }
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  /**
   * Sets whether the window should be allowed to close (true when quitting app).
   */
  setForceQuit(value: boolean): void {
    this.forceQuit = value;
  }

  /**
   * Force closes the settings window.
   */
  close(): void {
    this.forceQuit = true;
    this.window?.close();
  }

  /**
   * Returns the BrowserWindow instance.
   */
  getWindow(): BrowserWindow | null {
    return this.window;
  }
}
