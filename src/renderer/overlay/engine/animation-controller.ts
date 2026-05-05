/**
 * AnimationController — Điều khiển playback animation.
 */
import { AnimationConfig, PetState } from '../../../shared/types/pet.types';
import { SpriteRenderer } from './sprite-renderer';

export class AnimationController {
  private renderer: SpriteRenderer;
  private currentConfig: AnimationConfig | null = null;
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private animationId: number = 0;
  private isPlaying: boolean = false;
  private scale: number = 1.0;

  private posX: number = 0; // Không còn dùng nhưng giữ để tránh lỗi compile nếu có chỗ gọi
  private posY: number = 0; // Không còn dùng nhưng giữ để tránh lỗi compile nếu có chỗ gọi
  private direction: number = 1; // 1: Right, -1: Left
  private walkingEnabled: boolean = true;

  public onAnimationEnd?: (nextState: PetState) => void;

  constructor(renderer: SpriteRenderer) {
    this.renderer = renderer;
  }

  setWalkingEnabled(enabled: boolean): void {
    this.walkingEnabled = enabled;
  }

  /** Play animation cho state cụ thể */
  play(config: AnimationConfig, scale: number = 1.0): void {
    this.stop();
    this.currentConfig = config;
    this.currentFrame = 0;
    this.scale = scale;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();

    // Draw first frame immediately
    this.draw();

    this.loop();
  }

  /** Cập nhật scale và resize cửa sổ vừa khít */
  setScale(scale: number): void {
    this.scale = scale;
    const w = Math.round(192 * scale);
    const h = Math.round(208 * scale);

    if (window.electronAPI && window.electronAPI.resizeWindow) {
      window.electronAPI.resizeWindow(w, h);
    }
  }

  /** Reset position (không còn dùng vì di chuyển bằng window) */
  resetPosition(): void {}

  /** Stop animation */
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.isPlaying = false;
  }

  private draw(): void {
    if (!this.currentConfig) return;
    const activeRow = this.currentConfig.row;
    const shouldFlip = this.direction === -1;

    this.renderer.drawFrame(this.currentFrame, activeRow, this.scale, shouldFlip);
  }

  /** Lấy vùng bao quanh Pet (Vừa khít cửa sổ mới) */
  getRect(): { x: number; y: number; width: number; height: number } {
    const w = 192 * this.scale;
    const h = 208 * this.scale;
    // Vì cửa sổ đã được resize vừa khít, Pet luôn chiếm trọn 100% cửa sổ
    return {
      x: 0,
      y: 0,
      width: w,
      height: h,
    };
  }

  /** Internal animation loop */
  private loop = (): void => {
    if (!this.isPlaying || !this.currentConfig) return;

    const now = performance.now();
    const msPerFrame = 1000 / this.currentConfig.fps;

    if (now - this.lastFrameTime >= msPerFrame) {
      this.lastFrameTime = now;

      let activeRow = this.currentConfig.row;

      // 1. Update Window Movement
      const isMovementRow = [1, 2, 7].includes(this.currentConfig.row);
      // 1. Logic di chuyển cửa sổ (nếu đang walk)
      const isMovementAnimation = this.currentConfig.canMove || [1, 2, 7].includes(this.currentConfig.row);
      
      if (isMovementAnimation && this.isPlaying) {
        const speed = (this.currentConfig.speed || 1.5) * this.scale;
        
        // CHỈ DI CHUYỂN CỬA SỔ NẾU ENABLE WALKING ĐƯỢC BẬT
        if (this.walkingEnabled && window.electronAPI && window.electronAPI.moveWindow) {
          // KIỂM TRA BIÊN MÀN HÌNH ĐỂ QUAY ĐẦU
          const winX = window.screenX;
          const screenW = window.screen.availWidth;
          const winW = window.innerWidth;

          if ((this.direction === -1 && winX <= 0) || 
              (this.direction === 1 && winX + winW >= screenW)) {
            this.direction *= -1;
          }

          window.electronAPI.moveWindow(speed * this.direction, 0);
          
          // Luôn lưu vị trí để nhớ tọa độ
          window.electronAPI.savePosition(window.screenX, window.screenY);
        }
      }

      // 2. Render
      if (this.currentConfig) {
        const shouldFlip = this.direction === -1;
        this.renderer.drawFrame(this.currentFrame, activeRow, this.scale, shouldFlip);
      }

      // 3. Advance frame
      if (this.currentConfig.loop) {
        this.currentFrame = (this.currentFrame + 1) % this.currentConfig.frameCount;
      } else {
        this.currentFrame++;
        if (this.currentFrame >= this.currentConfig.frameCount) {
          this.isPlaying = false;
          if (this.onAnimationEnd) {
            this.onAnimationEnd(this.currentConfig.nextState || 'idle');
          }
          return;
        }
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  };
}
