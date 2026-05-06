/**
 * PetManager — Central pet management.
 */

import { app, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { PetLoader } from './pet-loader';
import { UserSettings, DEFAULT_SETTINGS, PetInstance } from '../../shared/types/settings.types';
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
  private defaultPetSlugs: string[] = [];

  constructor() {
    this.loader = new PetLoader();
    const userData = app.getPath('userData');
    this.petsDir = path.join(userData, APP_PATHS.PETS_DIR);
    this.settingsPath = path.join(userData, APP_PATHS.SETTINGS_FILE);
  }

  setWindowManagers(overlay: any, settings: any) {
    this.overlayWindow = overlay;
    this.settingsWindow = settings;
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

      // Đảm bảo có ít nhất 1 pet trong activePets nếu chưa có gì
      if (this.pets.length > 0 && this.settings.activePets.length === 0) {
        const slug = this.settings.activePetSlug || this.pets[0].manifest.slug;
        await this.spawnPet(slug);
      }

      console.log(
        `PetManager initialized. Loaded ${this.pets.length} pets. Active instances: ${this.settings.activePets.length}`
      );
    } catch (err) {
      console.error('PetManager init failed:', err);
    }
  }

  /** Spawn all saved pets (call this after window manager is ready) */
  async spawnSavedPets(): Promise<void> {
    for (const instance of this.settings.activePets) {
      this.overlayWindow.create(instance.id, instance.x, instance.y);
    }
  }

  getInstalledPets(): PetListItem[] {
    return this.pets.map(p => ({
      slug: p.manifest.slug,
      displayName: p.manifest.displayName,
      description: p.manifest.description,
      thumbnailPath: pathToFileURL(p.spritesheetPath).href,
      isActive: this.settings.activePets.some(inst => inst.slug === p.manifest.slug),
      isDefault: this.defaultPetSlugs.includes(p.manifest.slug),
    }));
  }

  /** Lấy config của một pet instance cụ thể */
  getPetInstanceConfig(instanceId: string): any {
    const instance = this.settings.activePets.find(inst => inst.id === instanceId);
    if (!instance) return null;

    const pet = this.pets.find(p => p.manifest.slug === instance.slug);
    if (!pet) return null;

    return {
      ...pet.manifest,
      instanceId: instance.id,
      spritesheetPath: pathToFileURL(pet.spritesheetPath).href,
      scale: instance.scale || this.settings.scale,
    };
  }

  /** Triệu hồi pet mới */
  async spawnPet(slug: string): Promise<PetInstance | null> {
    if (this.settings.activePets.length >= 5) {
      console.warn('PetManager: Maximum 5 pets allowed.');
      return null;
    }

    const pet = this.pets.find(p => p.manifest.slug === slug);
    if (!pet) return null;

    const id = Math.random().toString(36).substring(2, 11);
    const newInstance: PetInstance = {
      id,
      slug,
      x: 200 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      scale: this.settings.scale,
    };

    this.settings.activePets.push(newInstance);
    this.settings.activePetSlug = slug; // Keep for compatibility
    await this.saveSettings();

    if (this.overlayWindow) {
      this.overlayWindow.create(id, newInstance.x, newInstance.y);
    }

    this.notifySettingsUpdate();
    return newInstance;
  }

  /** Xoá một instance pet */
  async removePet(instanceId: string): Promise<void> {
    this.settings.activePets = this.settings.activePets.filter(inst => inst.id !== instanceId);
    await this.saveSettings();

    if (this.overlayWindow) {
      this.overlayWindow.destroy(instanceId);
    }

    this.notifySettingsUpdate();
  }

  getSpritesheetURL(slug: string): string | null {
    const pet = this.pets.find(p => p.manifest.slug === slug);
    return pet ? pathToFileURL(pet.spritesheetPath).href : null;
  }

  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /** Cập nhật settings */
  async updateSettings(newSettings: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Xử lý khởi động cùng hệ thống
    if (newSettings.launchAtStartup !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: newSettings.launchAtStartup,
        path: app.getPath('exe'),
      });
    }

    // Nếu thay đổi scale tổng thể, áp dụng cho tất cả pet đang hoạt động
    if (newSettings.scale !== undefined) {
      this.settings.activePets.forEach(p => {
        p.scale = newSettings.scale!;
      });
    }
    
    this.notifySettingsUpdate();
  }

  /** Gửi thông báo cập nhật tới tất cả các cửa sổ */
  private notifySettingsUpdate(): void {
    const data = { settings: this.settings };
    
    // Notify pets
    this.broadcastToPets('settings:update', data);
    
    // Notify settings window
    this.settingsWindow?.getWindow()?.webContents.send('settings:update', data);
  }

  /** Cập nhật vị trí của một pet instance */
  async updateInstancePosition(instanceId: string, x: number, y: number): Promise<void> {
    const instance = this.settings.activePets.find(inst => inst.id === instanceId);
    if (instance) {
      instance.x = x;
      instance.y = y;
      await this.saveSettings();
      
      // Broadcast vị trí mới cho các pet khác (để chúng đuổi nhau)
      this.broadcastToPets('pets:positions-updated', { 
        positions: this.settings.activePets.map(p => ({ id: p.id, x: p.x, y: p.y }))
      });
    }
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

  /** Xoá Pet đã nhập */
  async deletePet(slug: string): Promise<PetListItem[]> {
    try {
      if (this.defaultPetSlugs.includes(slug)) {
        throw new Error('Cannot delete default pet');
      }

      const targetPath = path.join(this.petsDir, slug);
      await fs.rm(targetPath, { recursive: true, force: true });
      console.log(`PetManager: Deleted pet ${slug} from ${targetPath}`);

      // Nếu pet đang xoá nằm trong danh sách active, loại bỏ nó
      this.settings.activePets = this.settings.activePets.filter(p => p.slug !== slug);
      if (this.settings.activePetSlug === slug) {
        this.settings.activePetSlug = this.pets.length > 0 ? this.pets[0].manifest.slug : null;
      }
      
      await this.saveSettings();

      // Scan lại danh sách Pet
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);
      
      // Đóng các cửa sổ liên quan
      if (this.overlayWindow) {
        const windows = this.overlayWindow.getAllWindows();
        // Giả sử có cách để biết window nào thuộc slug nào (thông qua config)
        // Hiện tại đơn giản nhất là refresh lại tất cả hoặc để user tự đóng.
        // Tốt nhất là spawn lại những con còn lại.
        this.overlayWindow.destroyAll();
        await this.spawnSavedPets();
      }

      this.notifySettingsUpdate();
      return this.getInstalledPets();
    } catch (err) {
      console.error('PetManager: Delete failed:', err);
      throw err;
    }
  }

  /** "Ăn" danh sách file (xoá vào thùng rác) */
  async eatFiles(filePaths: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      for (const filePath of filePaths) {
        await shell.trashItem(filePath);
        console.log(`PetManager: Eaten (trashed) file: ${filePath}`);
      }
      return { success: true };
    } catch (err: any) {
      console.error(`PetManager: Failed to eat files:`, err);
      return { success: false, error: err.message };
    }
  }

  /** Gửi tin nhắn tới tất cả pet windows */
  private broadcastToPets(channel: string, data: any) {
    if (this.overlayWindow) {
      this.overlayWindow.getAllWindows().forEach((win: any) => {
        win.webContents.send(channel, data);
      });
    }
  }

  // --- Private ---

  private async copyDefaultPets(): Promise<void> {
    try {
      const isDev = !app.isPackaged;
      const sourceDir = isDev
        ? path.join(app.getAppPath(), 'src', 'assets', 'default-pets')
        : path.join(process.resourcesPath, 'default-pets');

      // Danh sách các slug mặc định để đánh dấu isDefault
      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      this.defaultPetSlugs = entries.filter(e => e.isDirectory()).map(e => e.name);

      await fs.cp(sourceDir, this.petsDir, { recursive: true });
    } catch (err) {
      console.error('Failed to copy default pets:', err);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      
      // Đảm bảo activePets luôn là array
      if (!Array.isArray(this.settings.activePets)) {
        this.settings.activePets = [];
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('PetManager: Failed to save settings:', err);
    }
  }
}
