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
        const id = Math.random().toString(36).substring(2, 11);
        this.settings.activePets.push({
          id,
          slug,
          x: 200 + Math.random() * 200,
          y: 200 + Math.random() * 200,
          scale: this.settings.scale,
        });
        this.settings.activePetSlug = slug;
        await this.saveSettings();
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
    // Luôn giữ lại ít nhất 1 pet
    if (this.settings.activePets.length <= 1) {
      console.warn('PetManager: Cannot remove the last active pet.');
      return;
    }

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
    // Đảm bảo không cho phép xoá hết pet thông qua updateSettings
    if (newSettings.activePets !== undefined && newSettings.activePets.length === 0) {
      console.warn('PetManager: Attempted to clear all active pets. Blocking.');
      delete newSettings.activePets;
    }

    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Xử lý khởi động cùng hệ thống (Launch at Startup)
    if (newSettings.launchAtStartup !== undefined) {
      let shouldOpenAtLogin = newSettings.launchAtStartup;

      // Trên macOS dev mode, không hỗ trợ truyền args nên sẽ mở nhầm default Electron
      if (!app.isPackaged && process.platform === 'darwin') {
        if (shouldOpenAtLogin) {
          console.warn('PetManager: Launch at Startup is not supported in development on macOS.');
          shouldOpenAtLogin = false;
          this.settings.launchAtStartup = false;
          await this.saveSettings();
        }
      }

      const loginSettings: any = {
        openAtLogin: shouldOpenAtLogin,
        path: process.platform === 'win32' ? app.getPath('exe') : undefined,
      };

      if (process.platform === 'win32' && !app.isPackaged) {
        loginSettings.args = [app.getAppPath()];
      }

      app.setLoginItemSettings(loginSettings);
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

  /** Nhập thêm Pet mới từ thư mục hoặc file ZIP */
  async importPet(sourcePath: string): Promise<PetListItem[]> {
    let tempDir = '';
    const isZip = sourcePath.toLowerCase().endsWith('.zip');
    
    try {
      let extractPath = sourcePath;

      if (isZip) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(sourcePath);
        tempDir = path.join(app.getPath('temp'), `minipet-import-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        
        // Giải nén
        zip.extractAllTo(tempDir, true);
        
        // Tìm thư mục chứa pet.json bên trong ZIP
        const findPetJsonDir = async (dir: string): Promise<string | null> => {
           const entries = await fs.readdir(dir, { withFileTypes: true });
           if (entries.some(e => e.name === 'pet.json' && !e.isDirectory())) {
              return dir;
           }
           for (const entry of entries) {
              if (entry.isDirectory()) {
                 const found = await findPetJsonDir(path.join(dir, entry.name));
                 if (found) return found;
              }
           }
           return null;
        };

        const petJsonDir = await findPetJsonDir(tempDir);
        if (!petJsonDir) {
           throw new Error('pet.json not found in the ZIP archive.');
        }
        extractPath = petJsonDir;
      }

      const manifestPath = path.join(extractPath, 'pet.json');
      await fs.access(manifestPath);

      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestData);
      
      let slug = manifest.slug || path.basename(extractPath);
      
      // Đảm bảo tính duy nhất của slug (chống ghi đè khi vô tình trùng tên folder)
      const originalSlug = slug;
      let counter = 1;
      while (this.pets.some(p => p.manifest.slug === slug)) {
         slug = `${originalSlug}-${counter}`;
         counter++;
      }
      
      const targetPath = path.join(this.petsDir, slug);
      
      // Copy toàn bộ thư mục vào kho Pet của app
      await fs.cp(extractPath, targetPath, { recursive: true });
      console.log(`PetManager: Imported pet ${slug} to ${targetPath}`);

      // Scan lại danh sách Pet
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);
      return this.getInstalledPets();
    } catch (err) {
      console.error('PetManager: Import failed:', err);
      throw err;
    } finally {
      if (isZip && tempDir) {
        // Dọn dẹp thư mục tạm
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
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

      // Đảm bảo luôn còn ít nhất 1 pet sau khi xoá
      if (this.settings.activePets.length === 0 && this.pets.length > 0) {
        // Tìm pet đầu tiên không phải cái vừa xoá (scanPetsDirectory sẽ được gọi sau, nên dùng danh sách hiện tại)
        const remainingPets = this.pets.filter(p => p.manifest.slug !== slug);
        if (remainingPets.length > 0) {
          const nextSlug = remainingPets[0].manifest.slug;
          const id = Math.random().toString(36).substring(2, 11);
          this.settings.activePets.push({
            id,
            slug: nextSlug,
            x: 200 + Math.random() * 200,
            y: 200 + Math.random() * 200,
            scale: this.settings.scale,
          });
          this.settings.activePetSlug = nextSlug;
        }
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
