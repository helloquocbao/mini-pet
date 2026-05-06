/**
 * SystemTray — Quản lý tray icon và context menu.
 */

import { app, Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
import path from 'path';

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

  create(): void {
    // Determine icon path
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'icons', 'icon.png')
      : path.join(app.getAppPath(), 'src/assets/icons/icon.png');

    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon.resize({ width: 18, height: 18 }));
    this.tray.setToolTip('MiniPet Control Center');

    // 2. Build context menu với nhiều option hơn
    const template: MenuItemConstructorOptions[] = [
      { label: '🐾 MiniPet Control', enabled: false },
      { type: 'separator' },
      { label: 'Show/Hide Pet', click: this.callbacks.onTogglePet },
      { label: 'Settings...', click: this.callbacks.onShowSettings },
      { type: 'separator' },
      { type: 'separator' },
      { label: 'Quit MiniPet', accelerator: 'Command+Q', click: this.callbacks.onQuit },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
