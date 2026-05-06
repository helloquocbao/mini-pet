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
let instanceId: string | null = null;

async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  instanceId = params.get('id');
  if (!instanceId) {
    console.error('Overlay: No instanceId provided.');
    return;
  }

  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;

  // 1. Lấy pet config theo ID
  const petData: any = await window.electronAPI.getInstanceConfig(instanceId);
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
  const initialScale = Number(petData.scale || savedSettings?.scale) || 1.0;
  const isWalkingEnabled = savedSettings?.enableWalking !== false;
  currentLanguage = savedSettings?.language || 'en';

  const controller = new AnimationController(renderer, instanceId!);
  const stateMachine = new PetStateMachine(controller, initialScale, isWalkingEnabled);
  controller.setWalkingEnabled(isWalkingEnabled);
  stateMachine.start();

  currentScale = initialScale;

  // Khởi tạo kích thước cửa sổ
  syncWindowSize();

  // --- Multi-Pet: Chasing Logic ---
  window.electronAPI.onPositionsUpdate((data: any) => {
    const { positions } = data;
    // Tìm các pet khác (loại trừ chính mình)
    const otherPets = positions.filter((p: any) => p.id !== instanceId);
    if (otherPets.length > 0) {
      // Có 5% cơ hội Pet sẽ muốn "đuổi theo" một bạn khác nếu đang đi bộ
      if (Math.random() < 0.05 && stateMachine.getState() === 'walk') {
        const target = otherPets[Math.floor(Math.random() * otherPets.length)];
        controller.setTarget(target.x, target.y);
      }
    }
  });

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

  setupRandomSpeech(stateMachine);

  // 5. Settings update
  window.electronAPI.onSettingsUpdate(async (data: any) => {
    const { settings } = data;
    currentLanguage = settings.language || 'en';
    
    // Tìm cấu hình instance của mình trong settings mới
    const myInstance = settings.activePets.find((p: any) => p.id === instanceId);
    if (myInstance) {
      currentScale = myInstance.scale || settings.scale;
      stateMachine.setScale(currentScale);
      stateMachine.setWalkingEnabled(settings.enableWalking);
      controller.setWalkingEnabled(settings.enableWalking);
      syncWindowSize();
    }
  });

  // --- Intelligence ---
  window.electronAPI.onPetSay((text: string) => {
    showSpeech(text);
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
      if (instanceId) {
        window.electronAPI.savePosition(instanceId, window.screenX, window.screenY);
      }
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

    const t = translations[currentLanguage];
    const pickRandom = (opt: string | string[]) => Array.isArray(opt) ? opt[Math.floor(Math.random() * opt.length)] : opt;

    if (clickCount === 1) {
      stateMachine.forceState('happy');
      showSpeech(pickRandom(t.hello));
    } else if (clickCount === 2) {
      stateMachine.forceState('jump');
      showSpeech(pickRandom(t.exercise));
    } else if (clickCount >= 3) {
      if (stateMachine.getWalkingEnabled()) {
        stateMachine.forceState('run');
        showSpeech(pickRandom(t.run));
      } else {
        stateMachine.forceState('happy');
        showSpeech(t.movingDisabled);
      }
    }

    clickTimer = setTimeout(() => {
      clickCount = 0;
      clickTimer = null;
    }, 600);
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    window.electronAPI.openSettings();
  });

  // --- File "Eating" (Drag & Drop) ---
  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    stateMachine.forceState('jump'); // Pet hào hứng khi thấy "đồ ăn"
  });

  canvas.addEventListener('dragleave', () => {
    stateMachine.transitionTo('idle');
  });

  canvas.addEventListener('drop', async e => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const t = translations[currentLanguage];
      const pickRandom = (opt: string | string[]) => Array.isArray(opt) ? opt[Math.floor(Math.random() * opt.length)] : opt;

      stateMachine.forceState('eat'); // Chuyển sang animation ăn
      showSpeech(pickRandom(t.eating));

      const allPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = window.electronAPI.getPathForFile(file);
        if (filePath) {
          allPaths.push(filePath);
        }
      }

      if (allPaths.length > 0) {
        console.log('Overlay: Eating files:', allPaths);
        const result = await window.electronAPI.eatFile(allPaths);
        console.log('Overlay: Eat files result:', result);
      }
    } else {
      stateMachine.transitionTo('idle');
    }
  });
}

/** Tự động cân chỉnh kích thước cửa sổ để không bị xén hình */
function syncWindowSize(): void {
  const safeScale = Number(currentScale) || 1.0;
  
  // Chỉ thêm headroom nếu đang hiện lời thoại
  const baseHeadroom = 60;
  const headroom = isSpeechVisible ? Math.max(60, Math.ceil(baseHeadroom * safeScale)) : 0;
  
  const petWidth = Math.ceil(PETDEX_SPRITE.FRAME_WIDTH * safeScale);
  const petHeight = Math.ceil(PETDEX_SPRITE.FRAME_HEIGHT * safeScale);
  
  // Chiều cao tổng = headroom + chiều cao pet
  const totalHeight = headroom + petHeight;
  
  // Chiều rộng: Nếu có lời thoại thì rộng hơn (300), nếu không thì khít petWidth
  const totalWidth = isSpeechVisible ? Math.max(300, petWidth + 40) : petWidth;

  window.electronAPI.resizeWindow(totalWidth, totalHeight);
}

function showSpeech(text: string, duration: number = 4000): void {
  const bubble = document.getElementById('speech-bubble') as HTMLElement;
  if (!bubble) return;
  if (speechTimeout) clearTimeout(speechTimeout);

  isSpeechVisible = true;
  syncWindowSize();

  const safeScale = Number(currentScale) || 1.0;
  const winWidth = Math.ceil(PETDEX_SPRITE.FRAME_WIDTH * safeScale);

  bubble.style.fontSize = `${Math.max(10, Math.ceil(14 * safeScale))}px`;
  bubble.style.padding = `${Math.ceil(4 * safeScale)}px ${Math.ceil(8 * safeScale)}px`;
  bubble.style.borderRadius = `${Math.ceil(12 * safeScale)}px`;
  bubble.style.maxWidth = `${winWidth}px`;
  bubble.style.top = '15px';
  bubble.style.bottom = 'auto';

  bubble.textContent = text;
  bubble.classList.add('visible');
  speechTimeout = setTimeout(hideSpeech, duration);
}

function hideSpeech(): void {
  const bubble = document.getElementById('speech-bubble');
  if (bubble) bubble.classList.remove('visible');
  isSpeechVisible = false;
  setTimeout(() => {
    if (!isSpeechVisible) syncWindowSize();
  }, 200);

  if (speechTimeout) {
    clearTimeout(speechTimeout);
    speechTimeout = null;
  }
}

function getRandomPingSpeech(): string {
  const t = translations[currentLanguage];
  const options = t.pingResponses || [t.hello, '🐾', '❤️', '✨'];
  return options[Math.floor(Math.random() * options.length)];
}

function setupRandomSpeech(stateMachine: PetStateMachine): void {
  setInterval(() => {
    if (!isSpeechVisible && !isAlarming && Math.random() < 0.1) {
      const state = stateMachine.getState();
      const t = translations[currentLanguage];
      
      if (state === 'sleep') {
        showSpeech('Zzz...');
      } else {
        // Sử dụng mảng randomSpeeches để đa dạng nội dung
        const choices = t.randomSpeeches || ['🐾', '❤️', '✨'];
        const speech = choices[Math.floor(Math.random() * choices.length)];
        showSpeech(speech);
      }
    }
  }, 15000);
}

init().catch(console.error);
