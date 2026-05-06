import { SpriteRenderer } from './engine/sprite-renderer';
import { AnimationController } from './engine/animation-controller';
import { PetStateMachine } from './engine/pet-state-machine';
import { PETDEX_SPRITE } from '../../shared/constants';
import { translations, Language } from '../../shared/i18n/translations';

let isAlarming = false;
let currentScale = 1.0;
let isSpeechVisible = false;
let speechTimeout: any = null;
let currentLanguage: Language = 'en';

async function init(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;

  // 1. Lấy active pet data từ main process
  const petData: any = await window.electronAPI.getActivePet();
  if (!petData) return;

  // 2. Khởi tạo renderer
  const renderer = new SpriteRenderer(
    canvas,
    PETDEX_SPRITE.FRAME_WIDTH,
    PETDEX_SPRITE.FRAME_HEIGHT
  );

  // 3. Load spritesheet
  if (petData?.spritesheetPath) {
    try {
      await renderer.loadSpritesheet(petData.spritesheetPath);
    } catch (err) {
      console.error('Renderer: Failed to load spritesheet:', err);
    }
  }

  // 4. Khởi tạo animation
  const savedSettings: any = await window.electronAPI.getSettings();
  const initialScale = Number(savedSettings?.scale) || 1.0;
  const isWalkingEnabled = savedSettings?.enableWalking !== false;
  currentLanguage = savedSettings?.language || 'en';

  const controller = new AnimationController(renderer);
  const stateMachine = new PetStateMachine(controller, initialScale, isWalkingEnabled);
  controller.setWalkingEnabled(isWalkingEnabled);
  stateMachine.start();

  currentScale = initialScale;

  // Khởi tạo kích thước cửa sổ
  syncWindowSize();

  // --- Events ---
  window.electronAPI.onPing(() => {
    stateMachine.notify();
    showSpeech(getRandomPingSpeech());
  });

  window.electronAPI.onStartAlarm(() => {
    isAlarming = true;
    stateMachine.startAlarm();
  });

  window.electronAPI.onStopAlarm(() => {
    isAlarming = false;
    stateMachine.stopAlarm();
  });

  window.electronAPI.onPomoTick((state: any) => {
    if (state.finished) {
      const t = translations[currentLanguage];
      showSpeech(state.isWorkSession ? t.pomoFinishedWork : t.pomoFinishedBreak, 30000);
    }
  });
  
  window.electronAPI.onPetSay((text: string) => {
    showSpeech(text);
  });

  setupRandomSpeech(stateMachine);

  // 5. Settings update
  let currentPetSlug = petData?.slug;

  window.electronAPI.onSettingsUpdate(async (data: any) => {
    const { settings, activePet } = data;

    currentScale = Number(settings.scale) || 1.0;
    currentLanguage = settings.language || 'en';
    stateMachine.setScale(currentScale);
    stateMachine.setWalkingEnabled(settings.enableWalking);
    controller.setWalkingEnabled(settings.enableWalking);

    // Cập nhật kích thước cửa sổ - Vì là Top-aligned nên cực kỳ mượt!
    syncWindowSize();

    if (settings.activePetSlug !== currentPetSlug && activePet) {
      try {
        await renderer.loadSpritesheet(activePet.spritesheetPath);
        currentPetSlug = settings.activePetSlug;
      } catch (err) {
        console.error('Failed to switch pet:', err);
      }
    }
  });

  setupMouseInteraction(canvas, stateMachine);
}

function setupMouseInteraction(canvas: HTMLCanvasElement, stateMachine: PetStateMachine): void {
  let isDragging = false;
  let wasDragged = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mouseenter', () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
      isDragging = true;
      wasDragged = false;
      startX = e.screenX;
      startY = e.screenY;
      stateMachine.forceState('drag');
    }
  });

  window.addEventListener('mousemove', e => {
    if (isDragging) {
      const deltaX = e.screenX - startX;
      const deltaY = e.screenY - startY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) wasDragged = true;
      startX = e.screenX;
      startY = e.screenY;
      window.electronAPI.moveWindow(deltaX, deltaY);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      stateMachine.transitionTo('idle');
      window.electronAPI.savePosition(window.screenX, window.screenY);
    }
  });

  let clickCount = 0;
  let clickTimer: any = null;

  canvas.addEventListener('click', () => {
    if (isAlarming) {
      window.electronAPI.stopAlarm();
      hideSpeech();
      return;
    }

    if (wasDragged) return;

    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    console.log(`Renderer: Click detected. Count: ${clickCount}`);

    const t = translations[currentLanguage];

    // Phản hồi tức thì cho từng số lần click (Quy ước: Click 1 -> Dòng 4, Click 2 -> Dòng 5, Click 3+ -> Dòng 8)
    if (clickCount === 1) {
      stateMachine.forceState('happy'); // Dòng 4 (Row 3)
      showSpeech(t.hello);
    } else if (clickCount === 2) {
      stateMachine.forceState('jump'); // Dòng 5 (Row 4)
      showSpeech(t.exercise);
    } else if (clickCount >= 3) {
      if (stateMachine.getWalkingEnabled()) {
        stateMachine.forceState('run'); // Dòng 8 (Row 7)
        showSpeech(t.run);
      } else {
        stateMachine.forceState('happy');
        showSpeech(t.movingDisabled);
      }
    }

    // Timer chỉ dùng để reset bộ đếm sau khi người dùng ngừng click
    clickTimer = setTimeout(() => {
      console.log(`Renderer: Click sequence finished. Final count: ${clickCount}`);
      clickCount = 0;
      clickTimer = null;
    }, 600);
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    window.electronAPI.openSettings();
  });
}

function showSpeech(text: string, duration: number = 4000): void {
  const bubble = document.getElementById('speech-bubble') as HTMLElement;
  if (!bubble) return;
  if (speechTimeout) clearTimeout(speechTimeout);

  const safeScale = Number(currentScale) || 1.0;
  const winWidth = Math.ceil(PETDEX_SPRITE.FRAME_WIDTH * safeScale) + 20;

  // Cập nhật style bong bóng linh hoạt theo Scale
  bubble.style.fontSize = `${Math.max(10, Math.ceil(14 * safeScale))}px`;
  bubble.style.padding = `${Math.ceil(6 * safeScale + 2)}px ${Math.ceil(12 * safeScale + 4)}px`;
  bubble.style.borderRadius = `${Math.ceil(12 * safeScale + 6)}px`;
  bubble.style.maxWidth = `${winWidth - 10}px`;
  
  // Tính toán để ghim sát cạnh trên của khung Pet (vùng màu vàng)
  const petHeight = Math.ceil(PETDEX_SPRITE.FRAME_HEIGHT * safeScale) + 20;
  bubble.style.bottom = `${petHeight + 20 + 2}px`; // Cách cạnh trên khung đúng 2px
  bubble.style.top = 'auto';
  
  // Đồng bộ kích thước đuôi tam giác
  bubble.style.setProperty('--tail-size', `${Math.max(4, Math.ceil(8 * safeScale))}px`);

  bubble.textContent = text;
  bubble.classList.add('visible');
  isSpeechVisible = true;
  syncWindowSize();

  speechTimeout = setTimeout(hideSpeech, duration);
}

function hideSpeech(): void {
  const bubble = document.getElementById('speech-bubble');
  if (bubble) bubble.classList.remove('visible');
  isSpeechVisible = false;
  syncWindowSize();
  if (speechTimeout) {
    clearTimeout(speechTimeout);
    speechTimeout = null;
  }
}

/** Đồng bộ kích thước cửa sổ dựa trên Scale và trạng thái lời thoại */
function syncWindowSize(): void {
  const safeScale = Number(currentScale) || 1.0;

  // Chiều rộng Pet thực tế (Vừa khít hơn với hình)
  const width = Math.ceil(PETDEX_SPRITE.FRAME_WIDTH * safeScale) + 60;

  // Chiều cao Pet thực tế (có padding 20px)
  const petHeight = Math.ceil(PETDEX_SPRITE.FRAME_HEIGHT * safeScale) + 20;

  // Khoảng trống phía trên cho bong bóng (Headroom) - Tăng thêm để message thoải mái
  const headroom = Math.max(100, Math.ceil(150 * safeScale) + 20);
  console.log(`SyncSize: Scale=${safeScale}, Headroom=${headroom}`);

  // Cập nhật vị trí Pet trong CSS
  const canvas = document.getElementById('pet-canvas');
  if (canvas) {
    canvas.style.top = `${headroom}px`;
  }

  // Vậy chiều cao cửa sổ cần là headroom + petHeight + margin đáy
  const totalHeight = headroom + petHeight + 20;

  window.electronAPI.resizeWindow(width, totalHeight);
}

function getRandomPingSpeech(): string {
  const responses = translations[currentLanguage].pingResponses;
  return responses[Math.floor(Math.random() * responses.length)];
}

function setupRandomSpeech(stateMachine: PetStateMachine): void {
  const scheduleNext = () => {
    setTimeout(() => {
      const speeches = translations[currentLanguage].randomSpeeches;
      showSpeech(speeches[Math.floor(Math.random() * speeches.length)]);
      scheduleNext();
    }, (Math.random() * 3 + 2) * 60 * 1000);
  };
  scheduleNext();
}

init().catch(console.error);
