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
  private walkingEnabled: boolean = true;
  private scale: number = 1.0;
  private direction: number = 1; // 1: Right, -1: Left

  // Tích lũy phần dư để di chuyển mượt ở tốc độ thấp
  private accumulatedX: number = 0;

  public onAnimationEnd?: (nextState: PetState) => void;

  constructor(renderer: SpriteRenderer) {
    this.renderer = renderer;
  }

  setWalkingEnabled(enabled: boolean): void {
    this.walkingEnabled = enabled;
  }

  /** Cập nhật scale từ bên ngoài */
  setScale(scale: number): void {
    this.scale = scale;
    this.draw(); // Vẽ lại ngay lập tức với scale mới
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
    
    let activeRow = this.currentConfig.row;
    let shouldFlip = this.direction === -1;

    // Hỗ trợ dùng dòng 2 và 3 cho hướng trái/phải (không dùng flip)
    // NGƯỢC LẠI: Dòng 3 (index 2) cho Left, Dòng 2 (index 1) cho Right
    if (activeRow === 1 || activeRow === 2) {
      activeRow = this.direction === -1 ? 2 : 1;
      shouldFlip = false; 
    }

    this.renderer.drawFrame(this.currentFrame, activeRow, this.scale, shouldFlip);
  }

  /** Internal animation loop */
  private loop = (): void => {
    if (!this.isPlaying || !this.currentConfig) return;

    const now = performance.now();
    const msPerFrame = 1000 / this.currentConfig.fps;

    if (now - this.lastFrameTime >= msPerFrame) {
      this.lastFrameTime = now;

      // 1. Logic di chuyển cửa sổ (nếu đang walk/run)
      const isMovementAnimation = this.currentConfig.canMove || [1, 2].includes(this.currentConfig.row);
      
      if (isMovementAnimation && this.isPlaying && this.walkingEnabled) {
        const speed = (this.currentConfig.speed || 0.9) * this.scale;
        
        if (window.electronAPI && window.electronAPI.moveWindow) {
          // KIỂM TRA BIÊN MÀN HÌNH ĐỂ QUAY ĐẦU
          const winX = window.screenX;
          const screenW = window.screen.availWidth;
          const winW = window.innerWidth;

          if ((this.direction === -1 && winX <= 0) || 
              (this.direction === 1 && winX + winW >= screenW)) {
            this.direction *= -1;
            this.accumulatedX = 0; // Reset tích lũy khi đổi chiều
          }

          // Tích lũy phần dư (speed * direction)
          this.accumulatedX += speed * this.direction;

          // Thực hiện di chuyển khi tích lũy đủ >= 1 pixel
          const actualMoveX = Math.trunc(this.accumulatedX);
          if (Math.abs(actualMoveX) >= 1) {
            window.electronAPI.moveWindow(actualMoveX, 0);
            this.accumulatedX -= actualMoveX;
            // Lưu vị trí để nhớ tọa độ
            window.electronAPI.savePosition(window.screenX, window.screenY);
          }
        }
      }

      // 2. Render
      this.draw();

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
