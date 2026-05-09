/**
 * PetManager — Centralized management for all pet assets, instances, and settings.
 */

import { app, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { PetLoader } from './pet-loader';
import { UserSettings, DEFAULT_SETTINGS, PetInstance } from '../../shared/types/settings.types';
import { LoadedPet, PetListItem } from '../../shared/types/pet.types';
import { APP_PATHS, INTERACTION, OVERLAY_WINDOW } from '../../shared/constants';

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

  /**
   * Links window managers to the pet manager.
   */
  setWindowManagers(overlay: any, settings: any) {
    this.overlayWindow = overlay;
    this.settingsWindow = settings;
  }

  /**
   * Initializes the manager: loads settings and scans pet directory.
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.petsDir, { recursive: true });
      await this.loadSettings();

      // Always ensure default pets are up to date in the user data directory
      await this.copyDefaultPets();

      // Scan available pets
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);

      // Ensure at least one pet is active if none are saved
      if (this.pets.length > 0 && this.settings.activePets.length === 0) {
        const slug = this.settings.activePetSlug || this.pets[0].manifest.slug;
        const id = Math.random().toString(36).substring(2, 11);
        this.settings.activePets.push({
          id,
          slug,
          x: OVERLAY_WINDOW.DEFAULT_X + Math.random() * 200,
          y: OVERLAY_WINDOW.DEFAULT_Y + Math.random() * 200,
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

  /**
   * Spawns all saved pet instances. Call after window manager is ready.
   */
  async spawnSavedPets(): Promise<void> {
    for (const instance of this.settings.activePets) {
      this.overlayWindow.create(instance.id, instance.x, instance.y);
    }
  }

  /**
   * Returns a list of all installed pets for the UI.
   */
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

  /**
   * Fetches the configuration for a specific pet instance.
   */
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

  /**
   * Spawns a new pet instance.
   */
  async spawnPet(slug: string): Promise<PetInstance | null> {
    if (this.settings.activePets.length >= INTERACTION.MAX_ACTIVE_PETS) {
      console.warn(`PetManager: Maximum ${INTERACTION.MAX_ACTIVE_PETS} pets allowed.`);
      return null;
    }

    const pet = this.pets.find(p => p.manifest.slug === slug);
    if (!pet) return null;

    const id = Math.random().toString(36).substring(2, 11);
    const newInstance: PetInstance = {
      id,
      slug,
      x: OVERLAY_WINDOW.DEFAULT_X + Math.random() * 200,
      y: OVERLAY_WINDOW.DEFAULT_Y + Math.random() * 200,
      scale: this.settings.scale,
    };

    this.settings.activePets.push(newInstance);
    this.settings.activePetSlug = slug; // Legacy support
    await this.saveSettings();

    if (this.overlayWindow) {
      this.overlayWindow.create(id, newInstance.x, newInstance.y);
    }

    this.notifySettingsUpdate();
    return newInstance;
  }

  /**
   * Removes a specific pet instance.
   */
  async removePet(instanceId: string): Promise<void> {
    // Maintain at least one active pet
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

  /**
   * Returns the spritesheet URL for a given pet slug.
   */
  getSpritesheetURL(slug: string): string | null {
    const pet = this.pets.find(p => p.manifest.slug === slug);
    return pet ? pathToFileURL(pet.spritesheetPath).href : null;
  }

  /**
   * Returns the current user settings.
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * Updates and persists user settings.
   */
  async updateSettings(newSettings: Partial<UserSettings>): Promise<void> {
    // Prevent clearing all active pets via settings update
    if (newSettings.activePets !== undefined && newSettings.activePets.length === 0) {
      console.warn('PetManager: Attempted to clear all active pets. Blocking.');
      delete newSettings.activePets;
    }

    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Handle "Launch at Startup" logic
    if (newSettings.launchAtStartup !== undefined) {
      let shouldOpenAtLogin = newSettings.launchAtStartup;

      // macOS dev mode doesn't support passing arguments correctly for startup items
      if (!app.isPackaged && process.platform === 'darwin') {
        if (shouldOpenAtLogin) {
          console.warn('PetManager: Launch at Startup is not supported in development on macOS.');
          shouldOpenAtLogin = false;
          this.settings.launchAtStartup = false;
          await this.saveSettings();
        }
      }

      const loginSettings: Electron.Settings = {
        openAtLogin: shouldOpenAtLogin,
        path: process.platform === 'win32' ? app.getPath('exe') : undefined,
      };

      if (process.platform === 'win32' && !app.isPackaged) {
        loginSettings.args = [app.getAppPath()];
      }

      app.setLoginItemSettings(loginSettings);
    }

    // Apply global scale factor to all active instances
    if (newSettings.scale !== undefined) {
      this.settings.activePets.forEach(p => {
        p.scale = newSettings.scale!;
      });
    }
    
    this.notifySettingsUpdate();
  }

  /**
   * Notifies all windows about settings updates.
   */
  private notifySettingsUpdate(): void {
    const data = { settings: this.settings };
    
    // Notify all pet overlays
    this.broadcastToPets('settings:update', data);
    
    // Notify settings UI window
    this.settingsWindow?.getWindow()?.webContents.send('settings:update', data);
  }

  /**
   * Updates the coordinates of a specific pet instance.
   */
  async updateInstancePosition(instanceId: string, x: number, y: number): Promise<void> {
    const instance = this.settings.activePets.find(inst => inst.id === instanceId);
    if (instance) {
      instance.x = x;
      instance.y = y;
      await this.saveSettings();
      
      // Broadcast new positions to other pets (enables "chasing" behavior)
      this.broadcastToPets('pets:positions-updated', { 
        positions: this.settings.activePets.map(p => ({ id: p.id, x: p.x, y: p.y }))
      });
    }
  }

  /**
   * Imports a new pet from a folder or ZIP file.
   */
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
        
        // Extract archive contents
        zip.extractAllTo(tempDir, true);
        
        // Locate pet.json within the extracted content (handles nested folders)
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
      
      // Ensure slug uniqueness to prevent accidental overwrites
      const originalSlug = slug;
      let counter = 1;
      while (this.pets.some(p => p.manifest.slug === slug)) {
         slug = `${originalSlug}-${counter}`;
         counter++;
      }
      
      const targetPath = path.join(this.petsDir, slug);
      
      // Copy pet folder to application data store
      await fs.cp(extractPath, targetPath, { recursive: true });
      console.log(`PetManager: Imported pet ${slug} to ${targetPath}`);

      // Re-scan pet directory to include the new pet
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);
      return this.getInstalledPets();
    } catch (err) {
      console.error('PetManager: Import failed:', err);
      throw err;
    } finally {
      // Clean up temporary extraction directory
      if (isZip && tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  /**
   * Deletes an imported pet by slug.
   */
  async deletePet(slug: string): Promise<PetListItem[]> {
    try {
      if (this.defaultPetSlugs.includes(slug)) {
        throw new Error('Cannot delete default pet');
      }

      const targetPath = path.join(this.petsDir, slug);
      await fs.rm(targetPath, { recursive: true, force: true });
      console.log(`PetManager: Deleted pet ${slug} from ${targetPath}`);

      // Remove any active instances of the deleted pet
      this.settings.activePets = this.settings.activePets.filter(p => p.slug !== slug);
      if (this.settings.activePetSlug === slug) {
        this.settings.activePetSlug = this.pets.length > 0 ? this.pets[0].manifest.slug : null;
      }

      // Ensure at least one pet remains active
      if (this.settings.activePets.length === 0 && this.pets.length > 0) {
        const remainingPets = this.pets.filter(p => p.manifest.slug !== slug);
        if (remainingPets.length > 0) {
          const nextSlug = remainingPets[0].manifest.slug;
          const id = Math.random().toString(36).substring(2, 11);
          this.settings.activePets.push({
            id,
            slug: nextSlug,
            x: OVERLAY_WINDOW.DEFAULT_X + Math.random() * 200,
            y: OVERLAY_WINDOW.DEFAULT_Y + Math.random() * 200,
            scale: this.settings.scale,
          });
          this.settings.activePetSlug = nextSlug;
        }
      }
      
      await this.saveSettings();

      // Update the local pet list
      this.pets = await this.loader.scanPetsDirectory(this.petsDir);
      
      // Close and re-spawn pet windows to reflect changes
      if (this.overlayWindow) {
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

  /**
   * "Eats" (trashes) specified files.
   */
  async eatFiles(filePaths: string[]): Promise<{ success: boolean; error?: string }> {
    console.log('PetManager: eatFiles called with:', filePaths);
    try {
      if (!filePaths || filePaths.length === 0) {
        console.warn('PetManager: eatFiles called with empty paths');
        return { success: true };
      }
      for (const filePath of filePaths) {
        console.log(`PetManager: Attempting to trash: ${filePath}`);
        await shell.trashItem(filePath);
        console.log(`PetManager: Eaten (trashed) file: ${filePath}`);
      }
      return { success: true };
    } catch (err: any) {
      console.error(`PetManager: Failed to eat files:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Enables or disables drag-and-drop mode for a specific pet window.
   * During drag mode the window stops forwarding mouse events so it can receive drops.
   */
  setDragMode(instanceId: string, enabled: boolean): void {
    if (this.overlayWindow) {
      this.overlayWindow.setDragMode(instanceId, enabled);
    }
  }

  /**
   * Broadcasts an IPC message to all active pet windows.
   */
  private broadcastToPets(channel: string, data: any) {
    if (this.overlayWindow) {
      this.overlayWindow.getAllWindows().forEach((win: any) => {
        win.webContents.send(channel, data);
      });
    }
  }

  // --- Private Utilities ---

  /**
   * Copies default pets from the app bundle to the user's pets directory.
   */
  private async copyDefaultPets(): Promise<void> {
    try {
      const isDev = !app.isPackaged;
      const sourceDir = isDev
        ? path.join(app.getAppPath(), 'src', 'assets', APP_PATHS.DEFAULT_PETS_ASSETS)
        : path.join(process.resourcesPath, APP_PATHS.DEFAULT_PETS_ASSETS);

      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      this.defaultPetSlugs = entries.filter(e => e.isDirectory()).map(e => e.name);

      await fs.cp(sourceDir, this.petsDir, { recursive: true });
    } catch (err) {
      console.error('Failed to copy default pets:', err);
    }
  }

  /**
   * Loads user settings from the file system.
   */
  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      
      if (!Array.isArray(this.settings.activePets)) {
        this.settings.activePets = [];
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
    }
  }

  /**
   * Persists the current settings to the file system.
   */
  private async saveSettings(): Promise<void> {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (err) {
      console.error('PetManager: Failed to save settings:', err);
    }
  }
}
