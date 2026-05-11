import { PetListItem } from '../../shared/types/pet.types';
import { UserSettings } from '../../shared/types/settings.types';
import { translations, Language } from '../../shared/i18n/translations';
import { INTERACTION } from '../../shared/constants';

/**
 * Main initialization function for the settings UI.
 */
async function initSettings(): Promise<void> {
  const pets = await window.electronAPI.getPetList();
  const settings = await window.electronAPI.getSettings();

  applyTranslations(settings.language || 'en');
  await renderPetGallery(pets, settings);
  await renderActivePets(settings, pets);
  populateForm(settings);
  setupEventListeners(settings);
  setupPomodoro(settings.language || 'en');

  // Listen for settings updates from the main process
  window.electronAPI.onSettingsUpdate(async (data: any) => {
    const updatedSettings = data.settings;
    const updatedPets = await window.electronAPI.getPetList();
    await renderPetGallery(updatedPets, updatedSettings);
    await renderActivePets(updatedSettings, updatedPets);
    populateForm(updatedSettings);
  });
}

/**
 * Applies internationalization translations to elements with data-i18n attribute.
 */
function applyTranslations(lang: Language): void {
  const t = translations[lang];
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n') as string;
    if (t[key]) {
      el.textContent = t[key];
    }
  });
}

/**
 * Renders the list of currently active pet instances.
 */
async function renderActivePets(settings: UserSettings, pets: PetListItem[]): Promise<void> {
  const container = document.getElementById('active-pets-list')!;
  container.innerHTML = '';
  
  if (settings.activePets.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';
  
  for (const instance of settings.activePets) {
    const petType = pets.find(p => p.slug === instance.slug);
    if (!petType) continue;
    
    const lang = (settings.language || 'en') as Language;
    const t = translations[lang];
    const item = document.createElement('div');
    item.className = 'active-pet-item';
    
    const thumb = document.createElement('div');
    thumb.className = 'mini-thumb';
    thumb.style.backgroundImage = `url('${petType.thumbnailPath}')`;
    
    const name = document.createElement('span');
    name.className = 'instance-name';
    name.textContent = petType.displayName;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-instance-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = t.removePet;
    
    // Prevent removing the last remaining pet
    if (settings.activePets.length <= 1) {
      removeBtn.style.display = 'none';
    }
    
    removeBtn.addEventListener('click', async () => {
      await (window.electronAPI as any).removePet(instance.id);
    });
    
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }
}

/**
 * Renders the gallery of available pets for spawning.
 */
async function renderPetGallery(pets: PetListItem[], settings: UserSettings): Promise<void> {
  const gallery = document.getElementById('pet-gallery')!;
  gallery.innerHTML = '';

  const activeSlugs = settings.activePets.map(p => p.slug);

  for (const pet of pets) {
    const isSpawned = activeSlugs.includes(pet.slug);
    const card = document.createElement('div');
    card.className = `pet-card ${isSpawned ? 'active' : ''}`;
    
    const thumb = document.createElement('div');
    thumb.className = 'pet-thumb';
    thumb.style.backgroundImage = `url('${pet.thumbnailPath}')`;
    
    const name = document.createElement('div');
    name.className = 'pet-name';
    name.textContent = pet.displayName;
    
    card.appendChild(thumb);
    card.appendChild(name);

    // Add delete button for non-default (imported) pets
    if (!pet.isDefault) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-pet-btn';
      deleteBtn.innerHTML = '×';
      const t = translations[settings.language || 'en'];
      deleteBtn.title = t.deletePet;

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`${t.deletePet} ${pet.displayName}?`)) {
          await window.electronAPI.deletePet(pet.slug);
          const updatedPets = await window.electronAPI.getPetList();
          const currentSettings = await window.electronAPI.getSettings();
          renderPetGallery(updatedPets, currentSettings);
        }
      });
      card.appendChild(deleteBtn);
    }

    card.addEventListener('click', async () => {
      const s = await window.electronAPI.getSettings();
      if (s.activePets.length >= INTERACTION.MAX_ACTIVE_PETS) {
        const lang = (s.language || 'en') as Language;
        const t = translations[lang];
        alert(t.maxPetsReached);
        return;
      }
      await (window.electronAPI as any).spawnPet(pet.slug);
    });

    gallery.appendChild(card);
  }
}

/**
 * Populates the settings form with current values.
 */
function populateForm(settings: UserSettings): void {
  const langSelect = document.getElementById('language-select') as HTMLSelectElement;
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLElement;
  const walkingToggle = document.getElementById('walking-toggle') as HTMLInputElement;
  const startupToggle = document.getElementById('startup-toggle') as HTMLInputElement;

  if (langSelect) langSelect.value = settings.language || 'en';
  if (scaleRange) {
    scaleRange.value = (settings.scale || 1.0).toString();
    scaleValue.textContent = `${(settings.scale || 1.0).toFixed(1)}x`;
  }
  if (walkingToggle) walkingToggle.checked = settings.enableWalking !== false;
  
  if (startupToggle) {
    // Hide Launch at Startup on macOS as it's unsupported/problematic
    if (navigator.userAgent.indexOf('Mac') !== -1) {
      const item = startupToggle.closest('.setting-item') as HTMLElement;
      if (item) item.style.display = 'none';
    } else {
      startupToggle.checked = settings.launchAtStartup || false;
    }
  }
}

/**
 * Registers event listeners for settings controls.
 */
function setupEventListeners(settings: UserSettings): void {
  const langSelect = document.getElementById('language-select') as HTMLSelectElement;
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLElement;
  const walkingToggle = document.getElementById('walking-toggle') as HTMLInputElement;
  const startupToggle = document.getElementById('startup-toggle') as HTMLInputElement;
  const importBtn = document.getElementById('import-pet-btn') as HTMLButtonElement;

  langSelect?.addEventListener('change', () => {
    window.electronAPI.updateSettings({ language: langSelect.value });
    applyTranslations(langSelect.value as Language);
  });

  scaleRange?.addEventListener('input', () => {
    const val = parseFloat(scaleRange.value);
    scaleValue.textContent = `${val.toFixed(1)}x`;
    window.electronAPI.updateSettings({ scale: val });
  });

  walkingToggle?.addEventListener('change', () => {
    window.electronAPI.updateSettings({ enableWalking: walkingToggle.checked });
  });

  startupToggle?.addEventListener('change', () => {
    window.electronAPI.updateSettings({ launchAtStartup: startupToggle.checked });
  });

  importBtn?.addEventListener('click', async () => {
    await window.electronAPI.importPet();
    const pets = await window.electronAPI.getPetList();
    const currentSettings = await window.electronAPI.getSettings();
    renderPetGallery(pets, currentSettings);
  });

  const pingBtn = document.getElementById('ping-pet-btn');
  pingBtn?.addEventListener('click', () => {
    window.electronAPI.pingPet();
  });
}

/**
 * Initializes and manages the Pomodoro timer UI components.
 */
async function setupPomodoro(lang: Language): Promise<void> {
  const focusInput = document.getElementById('pomo-focus-time') as HTMLInputElement;
  const breakInput = document.getElementById('pomo-break-time') as HTMLInputElement;
  const display = document.getElementById('pomo-display')!;
  const status = document.getElementById('pomo-status')!;
  const startBtn = document.getElementById('pomo-start-btn')!;
  const pauseBtn = document.getElementById('pomo-pause-btn')!;
  const resetBtn = document.getElementById('pomo-reset-btn')!;
  const standardBtn = document.getElementById('pomo-standard-btn')!;

  const initialState = await window.electronAPI.getPomoState();
  updateUI(initialState);

  window.electronAPI.onPomoTick((state: any) => updateUI(state));

  function updateUI(state: any) {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    focusInput.value = state.focusMinutes.toString();
    breakInput.value = state.breakMinutes.toString();

    const t = translations[lang];
    if (state.status === 'idle') {
      status.textContent = t.statusIdle;
      status.classList.remove('active');
      startBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
      focusInput.disabled = false;
      breakInput.disabled = false;
    } else {
      status.textContent = state.status === 'focus' ? t.statusFocus : t.statusBreak;
      status.classList.add('active');
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
      focusInput.disabled = true;
      breakInput.disabled = true;
    }
  }

  startBtn.addEventListener('click', () => window.electronAPI.startPomo(parseInt(focusInput.value), parseInt(breakInput.value)));
  pauseBtn.addEventListener('click', () => window.electronAPI.pausePomo());
  resetBtn.addEventListener('click', () => window.electronAPI.resetPomo());
  standardBtn.addEventListener('click', () => window.electronAPI.updatePomoConfig(25, 5));
  focusInput.addEventListener('change', () => window.electronAPI.updatePomoConfig(parseInt(focusInput.value), parseInt(breakInput.value)));
  breakInput.addEventListener('change', () => window.electronAPI.updatePomoConfig(parseInt(focusInput.value), parseInt(breakInput.value)));
}

document.addEventListener('DOMContentLoaded', initSettings);
