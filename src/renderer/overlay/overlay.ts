import { SpriteRenderer } from './engine/sprite-renderer';
import { AnimationController } from './engine/animation-controller';
import { PetStateMachine } from './engine/pet-state-machine';
import { PETDEX_SPRITE, INTERACTION } from '../../shared/constants';
import { translations, Language } from '../../shared/i18n/translations';

let isAlarming = false;
let currentScale = 1.0;
let isSpeechVisible = false;
let speechTimeout: NodeJS.Timeout | null = null;
let currentLanguage: Language = 'en';
let instanceId: string | null = null;
let lastGlobalSpeechTime = 0;

/**
 * Initializes the overlay pet instance.
 */
async function init(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  instanceId = params.get('id');
  if (!instanceId) {
    console.error('Overlay: No instanceId provided.');
    return;
  }

  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;

  // 1. Fetch pet instance configuration
  const petData: any = await window.electronAPI.getInstanceConfig(instanceId);
  if (!petData) return;

  // 2. Initialize the sprite renderer
  const renderer = new SpriteRenderer(
    canvas,
    PETDEX_SPRITE.FRAME_WIDTH,
    PETDEX_SPRITE.FRAME_HEIGHT
  );

  // 3. Load the pet spritesheet
  if (petData?.spritesheetPath) {
    try {
      await renderer.loadSpritesheet(petData.spritesheetPath);
    } catch (err) {
      console.error('Renderer: Failed to load spritesheet:', err);
    }
  }

  // 4. Initialize animation controllers and state machine
  const savedSettings: any = await window.electronAPI.getSettings();
  const initialScale = Number(petData.scale || savedSettings?.scale) || 1.0;
  const isWalkingEnabled = savedSettings?.enableWalking !== false;
  currentLanguage = savedSettings?.language || 'en';

  const controller = new AnimationController(renderer, instanceId!);
  const stateMachine = new PetStateMachine(controller, initialScale, isWalkingEnabled);
  controller.setWalkingEnabled(isWalkingEnabled);
  stateMachine.start();

  currentScale = initialScale;

  // Sync window dimensions with pet scale
  syncWindowSize();

  // --- Multi-Pet: Chasing Logic ---
  window.electronAPI.onPositionsUpdate((data: any) => {
    const { positions } = data;
    // Identify other pet instances
    const otherPets = positions.filter((p: any) => p.id !== instanceId);
    if (otherPets.length > 0) {
      // Small chance (5%) for a pet to "chase" another when walking
      if (Math.random() < 0.05 && stateMachine.getState() === 'walk') {
        const target = otherPets[Math.floor(Math.random() * otherPets.length)];
        controller.setTarget(target.x, target.y);
      }
    }
  });

  // --- Global IPC Events ---
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
      // Note: main process toggles isWorkSession immediately upon expiry.
      // If state.isWorkSession is now false, it means a focus session just ended.
      showSpeech(!state.isWorkSession ? t.pomoFinishedWork : t.pomoFinishedBreak, INTERACTION.SPEECH_DURATION_LONG);
    }
  });

  setupRandomSpeech(stateMachine);

  // --- Settings Update Handling ---
  window.electronAPI.onSettingsUpdate(async (data: any) => {
    const { settings } = data;
    currentLanguage = settings.language || 'en';
    
    // Find this instance's specific configuration
    const myInstance = settings.activePets.find((p: any) => p.id === instanceId);
    if (myInstance) {
      currentScale = myInstance.scale || settings.scale;
      stateMachine.setScale(currentScale);
      stateMachine.setWalkingEnabled(settings.enableWalking);
      controller.setWalkingEnabled(settings.enableWalking);
      syncWindowSize();
    }
  });

  // --- Intelligence & Sync ---
  window.electronAPI.onPetSay((text: string) => {
    showSpeech(text);
  });

  window.electronAPI.onSomeoneSpeaking(() => {
    lastGlobalSpeechTime = Date.now();
  });

  setupMouseInteraction(canvas, stateMachine);
}

/**
 * Sets up mouse and drag-and-drop interactions.
 */
function setupMouseInteraction(canvas: HTMLCanvasElement, stateMachine: PetStateMachine): void {
  let isDragging = false;
  let wasDragged = false;
  let startX = 0;
  let startY = 0;

  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
      isDragging = true;
      wasDragged = false;
      startX = e.screenX;
      startY = e.screenY;
      stateMachine.forceState('drag');
    }
  });

  let lastIgnoreState = true;

  window.addEventListener('mousemove', e => {
    if (isDragging) {
      const deltaX = e.screenX - startX;
      const deltaY = e.screenY - startY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) wasDragged = true;
      startX = e.screenX;
      startY = e.screenY;
      window.electronAPI.moveWindow(deltaX, deltaY);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const isOverCanvas = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );

    if (isOverCanvas && lastIgnoreState) {
      window.electronAPI.setIgnoreMouseEvents(false);
      lastIgnoreState = false;
    } else if (!isOverCanvas && !lastIgnoreState) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      lastIgnoreState = true;
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
  let clickTimer: NodeJS.Timeout | null = null;

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

  /**
   * Drag-and-drop file eating handlers.
   * These work because mousemove (above) proactively disables ignore-mouse-events
   * when the cursor enters the canvas area, allowing dragover/drop to be received.
   */
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure window is interactive
    window.electronAPI.setIgnoreMouseEvents(false);
    stateMachine.forceState('jump');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use 'copy' effect to avoid showing the OS "move" icon with filename
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    // Proactively keep interactive mode
    window.electronAPI.setIgnoreMouseEvents(false);
  };

  const handleDragLeave = (e: DragEvent) => {
    // Restore click-through if cursor truly left the window
    if (e.clientX <= 0 || e.clientY <= 0 ||
        e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      stateMachine.transitionTo('idle');
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    
    // Restore click-through mode after drop
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });

    if (!files || files.length === 0) {
      stateMachine.transitionTo('idle');
      return;
    }

    const t = translations[currentLanguage];
    const pickRandom = (opt: string | string[]) => Array.isArray(opt) ? opt[Math.floor(Math.random() * opt.length)] : opt;

    stateMachine.forceState('eat');
    showSpeech(pickRandom(t.eating));

    const allPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let filePath = window.electronAPI.getPathForFile(file);
      if (!filePath && (file as any).path) {
        filePath = (file as any).path;
      }
      if (filePath) {
        allPaths.push(filePath);
      }
    }

    if (allPaths.length > 0) {
      await window.electronAPI.eatFile(allPaths);
    } else {
      stateMachine.transitionTo('idle');
    }
  };

  window.addEventListener('dragenter', handleDragEnter);
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('drop', handleDrop);
}

/**
 * Automatically adjusts the window size to prevent cropping, especially when speech bubbles are visible.
 */
function syncWindowSize(): void {
  const safeScale = Number(currentScale) || 1.0;
  
  // Add headroom only if speech is visible
  const baseHeadroom = 60;
  const headroom = isSpeechVisible ? Math.max(60, Math.ceil(baseHeadroom * safeScale)) : 0;
  
  const petWidth = Math.ceil(PETDEX_SPRITE.FRAME_WIDTH * safeScale);
  const petHeight = Math.ceil(PETDEX_SPRITE.FRAME_HEIGHT * safeScale);
  
  const totalHeight = headroom + petHeight;
  const totalWidth = isSpeechVisible ? Math.max(300, petWidth + 40) : petWidth;

  window.electronAPI.resizeWindow(totalWidth, totalHeight);
}

/**
 * Displays a speech bubble with the given text for a specific duration.
 */
function showSpeech(text: string, duration: number = INTERACTION.SPEECH_DURATION_DEFAULT): void {
  const bubble = document.getElementById('speech-bubble') as HTMLElement;
  if (!bubble) return;
  if (speechTimeout) clearTimeout(speechTimeout);

  isSpeechVisible = true;
  syncWindowSize();

  // Notify other pets to stay silent while this one is speaking
  window.electronAPI.notifySpeaking();

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

/**
 * Hides the speech bubble.
 */
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

/**
 * Returns a random speech text for ping responses.
 */
function getRandomPingSpeech(): string {
  const t = translations[currentLanguage];
  const options = t.pingResponses || [t.hello, '🐾', '❤️', '✨'];
  const pickRandom = (opt: string | string[]) => Array.isArray(opt) ? opt[Math.floor(Math.random() * opt.length)] : opt;
  return pickRandom(options);
}

/**
 * Sets up a background interval for occasional random speech.
 */
function setupRandomSpeech(stateMachine: PetStateMachine): void {
  setInterval(() => {
    // Only speak randomly if no one has spoken recently across all instances
    const timeSinceLastSpeech = Date.now() - lastGlobalSpeechTime;
    
    if (!isSpeechVisible && !isAlarming && timeSinceLastSpeech > INTERACTION.SPEECH_SYNC_COOLDOWN && Math.random() < INTERACTION.RANDOM_SPEECH_CHANCE) {
      const state = stateMachine.getState();
      const t = translations[currentLanguage];
      
      if (state === 'sleep') {
        showSpeech('Zzz...');
      } else {
        const choices = t.randomSpeeches || ['🐾', '❤️', '✨'];
        const speech = choices[Math.floor(Math.random() * choices.length)];
        showSpeech(speech);
      }
    }
  }, INTERACTION.RANDOM_SPEECH_INTERVAL);
}

init().catch(console.error);
