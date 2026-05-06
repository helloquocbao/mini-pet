import { app, BrowserWindow } from 'electron';
import path from 'path';
import { SETTINGS_WINDOW } from '../../shared/constants';

export class SettingsWindow {
  private window: BrowserWindow | null = null;
  private forceQuit: boolean = false;

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
        ? path.join(process.resourcesPath, 'icons', `icon.${process.platform === 'win32' ? 'icon.ico' : 'png'}`)
        : path.join(app.getAppPath(), `src/assets/icons/icon.${process.platform === 'win32' ? 'icon.ico' : 'png'}`),
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

    // Xử lý sự kiện đóng cửa sổ
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

  // Phương thức để thực sự đóng cửa sổ khi quit app
  setForceQuit(value: boolean): void {
    this.forceQuit = value;
  }

  close(): void {
    this.forceQuit = true;
    this.window?.close();
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }
}
