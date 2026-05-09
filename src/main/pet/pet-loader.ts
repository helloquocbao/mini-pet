/**
 * PetLoader — Handles reading and parsing pet.json manifests and validating spritesheets.
 */

import fs from 'fs/promises';
import path from 'path';
import { PetManifest, LoadedPet } from '../../shared/types/pet.types';
import { PETDEX_SPRITE } from '../../shared/constants';

export class PetLoader {
  /**
   * Loads a single pet from a given folder path.
   * @param petFolderPath Path to the directory containing pet.json.
   */
  async loadPet(petFolderPath: string): Promise<LoadedPet | null> {
    try {
      const manifestPath = path.join(petFolderPath, 'pet.json');
      const manifestData = await fs.readFile(manifestPath, 'utf8');
      const manifest: PetManifest = JSON.parse(manifestData);

      // Resolve spritesheet path (default to .webp, fallback to .png)
      let spritesheetName = manifest.spritesheetPath || 'spritesheet.webp';
      let spritesheetPath = path.join(petFolderPath, spritesheetName);

      try {
        await fs.access(spritesheetPath);
      } catch {
        // Attempt .png fallback if .webp is not found
        spritesheetName = 'spritesheet.png';
        spritesheetPath = path.join(petFolderPath, spritesheetName);
        await fs.access(spritesheetPath);
      }

      // Fill in default values if manifest is incomplete
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
      console.error(`PetLoader: Failed to load pet at ${petFolderPath}:`, err);
      return null;
    }
  }

  /**
   * Scans a directory for all valid pet subdirectories.
   * @param petsDir Root directory containing pet folders.
   */
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
      console.error(`PetLoader: Failed to scan pets directory ${petsDir}:`, err);
      return [];
    }
  }
}
