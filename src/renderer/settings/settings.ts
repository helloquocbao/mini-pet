import { PetListItem } from '../../shared/types/pet.types';
import { UserSettings } from '../../shared/types/settings.types';
import { translations, Language } from '../../shared/i18n/translations';

async function initSettings(): Promise<void> {
  const pets = await window.electronAPI.getPetList();
  const settings = await window.electronAPI.getSettings();

  applyTranslations(settings.language || 'en');
  renderPetGallery(pets, settings.activePetSlug);
  populateForm(settings);
  setupEventListeners(settings);
  setupPomodoro(settings.language || 'en');
}

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

async function setupPomodoro(lang: Language): Promise<void> {
  const focusInput = document.getElementById('pomo-focus-time') as HTMLInputElement;
  const breakInput = document.getElementById('pomo-break-time') as HTMLInputElement;
  const display = document.getElementById('pomo-display')!;
  const status = document.getElementById('pomo-status')!;
  const startBtn = document.getElementById('pomo-start-btn')!;
  const pauseBtn = document.getElementById('pomo-pause-btn')!;
  const resetBtn = document.getElementById('pomo-reset-btn')!;
  const standardBtn = document.getElementById('pomo-standard-btn')!;

  // 1. Get initial state
  const initialState = await window.electronAPI.getPomoState();
  updateUI(initialState);

  // 2. Listen for ticks
  window.electronAPI.onPomoTick((state: any) => {
    updateUI(state);
  });

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

  startBtn.addEventListener('click', () => {
    window.electronAPI.startPomo(parseInt(focusInput.value), parseInt(breakInput.value));
  });

  pauseBtn.addEventListener('click', () => {
    window.electronAPI.pausePomo();
  });

  resetBtn.addEventListener('click', () => {
    window.electronAPI.resetPomo();
  });

  standardBtn.addEventListener('click', () => {
    window.electronAPI.updatePomoConfig(25, 5);
  });

  focusInput.addEventListener('change', () => {
    window.electronAPI.updatePomoConfig(parseInt(focusInput.value), parseInt(breakInput.value));
  });
  breakInput.addEventListener('change', () => {
    window.electronAPI.updatePomoConfig(parseInt(focusInput.value), parseInt(breakInput.value));
  });
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
  const walkingToggle = document.getElementById('walking-toggle') as HTMLInputElement;
  const startupToggle = document.getElementById('startup-toggle') as HTMLInputElement;
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

  scaleRange.value = settings.scale.toString();
  scaleValue.textContent = `${settings.scale.toFixed(1)}x`;
  walkingToggle.checked = settings.enableWalking;
  startupToggle.checked = settings.launchAtStartup || false;
  languageSelect.value = settings.language || 'en';
}

function setupEventListeners(settings: UserSettings): void {
  const scaleRange = document.getElementById('scale-range') as HTMLInputElement;
  const scaleValue = document.getElementById('scale-value') as HTMLSpanElement;
  const walkingToggle = document.getElementById('walking-toggle') as HTMLInputElement;
  const startupToggle = document.getElementById('startup-toggle') as HTMLInputElement;
  const pingBtn = document.getElementById('ping-pet-btn') as HTMLButtonElement;
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

  scaleRange.addEventListener('input', () => {
    const scale = parseFloat(scaleRange.value);
    scaleValue.textContent = `${scale.toFixed(1)}x`;
    window.electronAPI.updateSettings({ scale });
  });

  walkingToggle.addEventListener('change', () => {
    window.electronAPI.updateSettings({ enableWalking: walkingToggle.checked });
  });

  startupToggle.addEventListener('change', () => {
    window.electronAPI.updateSettings({ launchAtStartup: startupToggle.checked });
  });

  languageSelect.addEventListener('change', () => {
    const language = languageSelect.value as Language;
    window.electronAPI.updateSettings({ language });
    applyTranslations(language);
    // Re-run setupPomodoro to update its status text immediately if needed
    setupPomodoro(language);
  });

  pingBtn.addEventListener('click', () => {
    window.electronAPI.pingPet();
  });

  const importBtn = document.getElementById('import-pet-btn') as HTMLButtonElement;
  importBtn.addEventListener('click', async () => {
    const newList = await window.electronAPI.importPet();
    if (newList) {
      const settings = await window.electronAPI.getSettings();
      renderPetGallery(newList, settings.activePetSlug);
    }
  });
}

initSettings().catch(console.error);
