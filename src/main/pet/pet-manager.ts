/**
 * PetManager — Central pet management.
 */

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { PetLoader } from './pet-loader';
import { UserSettings, DEFAULT_SETTINGS } from '../../shared/types/settings.types';
import { LoadedPet, PetListItem } from '../../shared/types/pet.types';
import { APP_PATHS } from '../../shared/constants';

export class PetManager {
  private loader: PetLoader;
  private pets: LoadedPet[] = [];
  private settings: UserSettings = { ...DEFAULT_SETTINGS };
  private petsDir: string;
  private settingsPath: string;

  private overlayWindow: any;
  private settingsWindow: any;

  constructor() {
    this.loader = new PetLoader();
    const userData = app.getPath('userData');
    this.petsDir = path.join(userData, APP_PATHS.PETS_DIR);
    this.settingsPath = path.join(userData, APP_PATHS.SETTINGS_FILE);
  }

  /** Init — load settings + scan pets */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.petsDir, { recursive: true });
      await this.loadSettings();

      // Luôn copy default pets để cập nhật pet mới
      await this.copyDefaultPets();

      // Scan pets
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);

      // Đảm bảo có activePetSlug
      if (this.pets.length > 0 && !this.settings.activePetSlug) {
        this.settings.activePetSlug = this.pets[0].manifest.slug;
        await this.saveSettings();
        console.log('Auto-selected first pet:', this.settings.activePetSlug);
      }

      console.log(
        `PetManager initialized. Loaded ${this.pets.length} pets. Active: ${this.settings.activePetSlug}`
      );
    } catch (err) {
      console.error('PetManager init failed:', err);
    }
  }

  getInstalledPets(): PetListItem[] {
    return this.pets.map(p => ({
      slug: p.manifest.slug,
      displayName: p.manifest.displayName,
      description: p.manifest.description,
      thumbnailPath: pathToFileURL(p.spritesheetPath).href, // Dùng spritesheet làm thumbnail
      isActive: p.manifest.slug === this.settings.activePetSlug,
    }));
  }

  getActivePet(): any {
    const pet = this.pets.find(p => p.manifest.slug === this.settings.activePetSlug);
    if (!pet) return null;

    return {
      ...pet.manifest,
      spritesheetPath: pathToFileURL(pet.spritesheetPath).href,
      scale: this.settings.scale,
    };
  }

  /** Đặt pet đang hoạt động */
  async setActivePet(slug: string): Promise<LoadedPet | null> {
    const pet = this.pets.find(p => p.manifest.slug === slug);
    if (pet) {
      this.settings.activePetSlug = slug;
      console.log('PetManager: Active pet changed to:', slug);
      await this.saveSettings();
      return this.getActivePet();
    }
    return null;
  }

  getSpritesheetURL(slug: string): string | null {
    const pet = this.pets.find(p => p.manifest.slug === slug);
    return pet ? pathToFileURL(pet.spritesheetPath).href : null;
  }

  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /** Cập nhật settings */
  async updateSettings(newSettings: Partial<any>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Xử lý khởi động cùng hệ thống
    if (newSettings.launchAtStartup !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: newSettings.launchAtStartup,
        path: app.getPath('exe'),
      });
      console.log('PetManager: Launch at startup set to:', newSettings.launchAtStartup);
    }
    
    // Notify all windows
    this.overlayWindow?.getWindow()?.webContents.send('settings:updated', {
      settings: this.settings,
      activePet: await this.getActivePet()
    });
    this.settingsWindow?.getWindow()?.webContents.send('settings:updated', {
      settings: this.settings,
      activePet: await this.getActivePet()
    });
  }

  /** Update current window position */
  async updatePosition(x: number, y: number): Promise<void> {
    this.settings.lastX = x;
    this.settings.lastY = y;
    await this.saveSettings();
  }

  /** Nhập thêm Pet mới từ thư mục bên ngoài */
  async importPet(sourcePath: string): Promise<PetListItem[]> {
    try {
      const manifestPath = path.join(sourcePath, 'pet.json');
      await fs.access(manifestPath);

      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      const slug = manifest.slug || path.basename(sourcePath);
      
      const targetPath = path.join(this.petsDir, slug);
      
      // Copy toàn bộ thư mục vào kho Pet của app
      await fs.cp(sourcePath, targetPath, { recursive: true });
      console.log(`PetManager: Imported pet ${slug} to ${targetPath}`);

      // Scan lại danh sách Pet
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);
      return this.getInstalledPets();
    } catch (err) {
      console.error('PetManager: Import failed:', err);
      throw err;
    }
  }

  // --- Private ---

  private async copyDefaultPets(): Promise<void> {
    try {
      // In development, we can copy from src/assets/default-pets
      // In production, Electron Forge puts them in the resources folder
      const isDev = !app.isPackaged;
      const sourceDir = isDev
        ? path.join(app.getAppPath(), 'src', 'assets', 'default-pets')
        : path.join(process.resourcesPath, 'default-pets');

      await fs.cp(sourceDir, this.petsDir, { recursive: true });
      console.log('Default pets copied to', this.petsDir);
    } catch (err) {
      console.error('Failed to copy default pets:', err);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
    }
  }

  /** Save settings to file */
  private async saveSettings(): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
      console.log('PetManager: Settings saved to disk successfully.');
    } catch (err) {
      console.error('PetManager: Failed to save settings:', err);
    }
  }
}
