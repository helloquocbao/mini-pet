import { app, Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { translations, Language } from '../../shared/i18n/translations';
import { APP_PATHS } from '../../shared/constants';

interface TrayCallbacks {
  onShowSettings: () => void;
  onQuit: () => void;
  onTogglePet: () => void;
}

export class SystemTray {
  private tray: Tray | null = null;
  private callbacks: TrayCallbacks;

  constructor(callbacks: TrayCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Creates the system tray icon and menu.
   * @param lang Display language for the menu.
   */
  create(lang: Language = 'en'): void {
    const iconExt = process.platform === 'win32' ? 'ico' : 'png';
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, APP_PATHS.ICONS_ASSETS, `icon.${iconExt}`)
      : path.join(app.getAppPath(), `src/assets/${APP_PATHS.ICONS_ASSETS}/icon.${iconExt}`);

    const icon = nativeImage.createFromPath(iconPath);

    // Standard tray icon size is typically 18x18
    this.tray = new Tray(icon.resize({ width: 18, height: 18 }));
    this.tray.setToolTip('MiniPet Control Center');

    this.updateMenu(lang);
  }

  /**
   * Updates the tray context menu based on the current language.
   * @param lang Display language.
   */
  updateMenu(lang: Language): void {
    if (!this.tray) return;

    const t = translations[lang];

    const template: MenuItemConstructorOptions[] = [
      { label: t.trayControl, enabled: false },
      { type: 'separator' },
      { label: t.trayToggle, click: this.callbacks.onTogglePet },
      { label: t.traySettings, click: this.callbacks.onShowSettings },
      { type: 'separator' },
      { type: 'separator' },
      { label: t.trayQuit, accelerator: 'Command+Q', click: this.callbacks.onQuit },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Destroys the tray icon.
   */
  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
