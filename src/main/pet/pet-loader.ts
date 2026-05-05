/**
 * PetLoader — Đọc và parse pet.json + validate spritesheet.
 */

import fs from 'fs/promises';
import path from 'path';
import { PetManifest, LoadedPet } from '../../shared/types/pet.types';
import { PETDEX_SPRITE } from '../../shared/constants';

export class PetLoader {
  /** Load 1 pet từ folder path */
  async loadPet(petFolderPath: string): Promise<LoadedPet | null> {
    try {
      const manifestPath = path.join(petFolderPath, 'pet.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest: PetManifest = JSON.parse(manifestData);

      // Resolve spritesheet path
      let spritesheetName = manifest.spritesheetPath || 'spritesheet.webp';
      let spritesheetPath = path.join(petFolderPath, spritesheetName);

      try {
        await fs.access(spritesheetPath);
      } catch {
        // Try .png fallback
        spritesheetName = 'spritesheet.png';
        spritesheetPath = path.join(petFolderPath, spritesheetName);
        await fs.access(spritesheetPath);
      }

      // Fill defaults
      if (!manifest.frameSize) {
        manifest.frameSize = {
          width: PETDEX_SPRITE.FRAME_WIDTH,
          height: PETDEX_SPRITE.FRAME_HEIGHT,
        };
      }
      if (!manifest.columns) manifest.columns = PETDEX_SPRITE.COLUMNS;
      if (!manifest.rows) manifest.rows = PETDEX_SPRITE.ROWS;
      if (!manifest.slug) manifest.slug = path.basename(petFolderPath);

      return {
        manifest,
        basePath: petFolderPath,
        spritesheetPath,
      };
    } catch (err) {
      console.error(`Failed to load pet at ${petFolderPath}:`, err);
      return null;
    }
  }

  /** Scan tất cả pets trong 1 directory */
  async scanPetsDirectory(petsDir: string): Promise<LoadedPet[]> {
    try {
      const entries = await fs.readdir(petsDir, { withFileTypes: true });
      const petDirs = entries.filter(e => e.isDirectory());

      const pets: LoadedPet[] = [];
      for (const dir of petDirs) {
        const loaded = await this.loadPet(path.join(petsDir, dir.name));
        if (loaded) pets.push(loaded);
      }
      return pets;
    } catch (err) {
      console.error(`Failed to scan pets directory ${petsDir}:`, err);
      return [];
    }
  }
}
