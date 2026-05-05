/**
 * Overlay entry point — renderer process.
 */

import { SpriteRenderer } from './engine/sprite-renderer';
import { AnimationController } from './engine/animation-controller';
import { PetStateMachine } from './engine/pet-state-machine';
import { PETDEX_SPRITE } from '../../shared/constants';

async function init(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;

  // 1. Lấy active pet data từ main process
  const petData: any = await window.electronAPI.getActivePet();
  console.log('Renderer: Active Pet Data received:', petData);

  if (!petData) {
    console.error('Renderer: No active pet data found!');
    return;
  }

  // 2. Khởi tạo renderer
  const renderer = new SpriteRenderer(
    canvas,
    PETDEX_SPRITE.FRAME_WIDTH,
    PETDEX_SPRITE.FRAME_HEIGHT
  );

  // 3. Load spritesheet
  if (petData?.spritesheetPath) {
    try {
      console.log('Renderer: Loading spritesheet from:', petData.spritesheetPath);
      await renderer.loadSpritesheet(petData.spritesheetPath);
      console.log('Renderer: Spritesheet loaded successfully!');
    } catch (err) {
      console.error('Renderer: Failed to load spritesheet:', err);
    }
  } else {
    console.warn('Renderer: No spritesheet path provided in petData');
  }

  // 4. Khởi tạo animation — dùng scale và walking đã lưu trong settings
  const savedSettings: any = await window.electronAPI.getSettings();
  const initialScale = savedSettings?.scale || 1.0;
  const isWalkingEnabled = savedSettings?.enableWalking !== false;

  const controller = new AnimationController(renderer);
  const stateMachine = new PetStateMachine(controller, initialScale, isWalkingEnabled);
  controller.setWalkingEnabled(isWalkingEnabled);
  stateMachine.start();

  // 5. Lắng nghe cập nhật cài đặt thời gian thực
  let currentPetSlug = petData?.slug;

  window.electronAPI.onSettingsUpdate(async (data: any) => {
    const { settings, activePet } = data;

    // 1. Cập nhật scale và walking cho cả não và bộ điều khiển
    stateMachine.setScale(settings.scale);
    stateMachine.setWalkingEnabled(settings.enableWalking);
    controller.setWalkingEnabled(settings.enableWalking);

    // 2. Chỉ nạp lại spritesheet nếu con Pet thực sự bị thay đổi (slug khác nhau)
    // HOẶC nếu ảnh hiện tại chưa được load thành công
    if (settings.activePetSlug !== currentPetSlug) {
      console.log('Renderer: Attempting to switch pet to', settings.activePetSlug);

      if (activePet) {
        try {
          await renderer.loadSpritesheet(activePet.spritesheetPath);
          console.log('Renderer: Successfully switched to pet', settings.activePetSlug);
          currentPetSlug = settings.activePetSlug; // Chỉ cập nhật slug khi load THÀNH CÔNG
        } catch (err) {
          console.error('Renderer: Failed to load spritesheet for', settings.activePetSlug, err);
          // Không cập nhật currentPetSlug để người dùng có thể bấm lại
        }
      }
    }
  });

  // 5. Mouse interaction cho click-through toggle
  setupMouseInteraction(canvas, stateMachine);
}

function setupMouseInteraction(canvas: HTMLCanvasElement, stateMachine: PetStateMachine): void {
  let isDragging = false;
  let wasDragged = false;
  let startX = 0;
  let startY = 0;

  // 1. Khi chuột đi vào vùng Canvas (là vùng Pet): Tắt xuyên thấu
  canvas.addEventListener('mouseenter', () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  });

  // 2. Xử lý Kéo thả
  canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
      isDragging = true;
      wasDragged = false;
      startX = e.screenX;
      startY = e.screenY;
      stateMachine.forceState('drag');
    }
  });

  // Window mousemove để xử lý di chuyển khi đang kéo
  window.addEventListener('mousemove', e => {
    if (isDragging) {
      const deltaX = e.screenX - startX;
      const deltaY = e.screenY - startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        wasDragged = true;
      }

      startX = e.screenX;
      startY = e.screenY;
      window.electronAPI.moveWindow(deltaX, deltaY);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      stateMachine.transitionTo('idle');
      // Thả ra thì cho xuyên thấu
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });

      // LƯU VỊ TRÍ SAU KHI KÉO
      window.electronAPI.savePosition(window.screenX, window.screenY);
    }
  });

  canvas.addEventListener('click', () => {
    if (!wasDragged) {
      // Chỉ cho đi bộ nếu tính năng này đang bật
      if (stateMachine.getWalkingEnabled()) {
        stateMachine.forceState('walk');
      } else {
        // Nếu tắt đi bộ, click vào chỉ làm nó vui vẻ (happy) rồi đứng im
        stateMachine.forceState('happy');
      }
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    window.electronAPI.openSettings();
  });
}

// Boot
init().catch(console.error);
