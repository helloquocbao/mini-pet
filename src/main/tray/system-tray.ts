/**
 * SystemTray — Quản lý tray icon và context menu.
 */

import { Tray, Menu, nativeImage, MenuItemConstructorOptions } from 'electron';
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
    // 1. Tạo icon (Sử dụng emoji làm icon tạm thời cho rõ nét trên Mac)
    // Trên Mac, chúng ta nên dùng Template Image để nó tự đổi màu theo theme (Dark/Light)
    const icon = nativeImage.createFromNamedImage('NSStatusAvailable', [0, 0, 0]);
    // Hoặc dùng một icon PNG nếu có. Ở đây tôi dùng icon hệ thống cho chắc chắn hiện lên.

    this.tray = new Tray(icon.resize({ width: 18, height: 18 }));
    this.tray.setToolTip('MiniPet Control Center');

    // 2. Build context menu với nhiều option hơn
    const template: MenuItemConstructorOptions[] = [
      { label: '🐾 MiniPet Control', enabled: false },
      { type: 'separator' },
      { label: 'Show/Hide Pet', click: this.callbacks.onTogglePet },
      { label: 'Settings...', click: this.callbacks.onShowSettings },
      { type: 'separator' },
      {
        label: 'Quick Actions',
        submenu: [
          {
            label: 'Move to Corner',
            click: () => {
              /* Logic dời về góc */
            },
          },
          {
            label: 'Reset Scale',
            click: () => {
              /* Logic reset scale */
            },
          },
        ],
      },
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
