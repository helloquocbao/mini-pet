import { app, Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import { translations, Language } from '../../shared/i18n/translations';

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

  create(lang: Language = 'en'): void {
    // Determine icon path
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'icons', 'icon.png')
      : path.join(app.getAppPath(), 'src/assets/icons/icon.png');

    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip('MiniPet Control Center');

    this.updateMenu(lang);
  }

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

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
