/**
 * Settings page entry point.
 */

import { PetListItem } from '../../shared/types/pet.types';
import { UserSettings } from '../../shared/types/settings.types';

async function initSettings(): Promise<void> {
  const pets = await window.electronAPI.getPetList();
  const settings = await window.electronAPI.getSettings();

  renderPetGallery(pets, settings.activePetSlug);
  populateForm(settings);
  setupEventListeners();
}

function renderPetGallery(pets: PetListItem[], activeSlug: string | null): void {
  const gallery = document.getElementById('pet-gallery')!;
  gallery.innerHTML = '';

  for (const pet of pets) {
    const card = document.createElement('div');
    card.className = `pet-card ${pet.slug === activeSlug ? 'active' : ''}`;
    card.innerHTML = `
      <div class="pet-thumb" style="background-image: url('${pet.thumbnailPath}')"></div>
      <div class="pet-name">${pet.displayName}</div>
    `;

    card.addEventListener('click', async () => {
      await window.electronAPI.setActivePet(pet.slug);
      const updatedPets = await window.electronAPI.getPetList();
      renderPetGallery(updatedPets, pet.slug);
    });

    gallery.appendChild(card);
  }
}

function populateForm(settings: UserSettings): void {
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLSpanElement;
  const walkToggle = document.getElementById('walk-toggle') as HTMLInputElement;

  scaleRange.value = settings.scale.toString();
  scaleValue.textContent = `${settings.scale.toFixed(1)}x`;
  walkToggle.checked = settings.enableWalking;
}

function setupEventListeners(): void {
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLSpanElement;
  const walkToggle = document.getElementById('walk-toggle') as HTMLInputElement;

  scaleRange.addEventListener('input', async () => {
    const val = parseFloat(scaleRange.value);
    scaleValue.textContent = `${val.toFixed(1)}x`;
    await window.electronAPI.updateSettings({ scale: val });
  });

  walkToggle.addEventListener('change', async () => {
    await window.electronAPI.updateSettings({ enableWalking: walkToggle.checked });
  });
}

initSettings().catch(console.error);
