/**
 * AnimationController — Điều khiển playback animation.
 */
import { AnimationConfig, PetState } from '../../../shared/types/pet.types';
import { SpriteRenderer } from './sprite-renderer';

export class AnimationController {
  private renderer: SpriteRenderer;
  private instanceId: string;
  private currentConfig: AnimationConfig | null = null;
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private animationId: number = 0;
  private isPlaying: boolean = false;
  private walkingEnabled: boolean = true;
  private scale: number = 1.0;
  private direction: number = 1; // 1: Right, -1: Left

  // Multi-Pet: Target for chasing
  private targetX: number | null = null;
  private targetY: number | null = null;

  // Tích lũy phần dư để di chuyển mượt ở tốc độ thấp
  private accumulatedX: number = 0;

  public onAnimationEnd?: (nextState: PetState) => void;

  constructor(renderer: SpriteRenderer, instanceId: string) {
    this.renderer = renderer;
    this.instanceId = instanceId;
  }

  setWalkingEnabled(enabled: boolean): void {
    this.walkingEnabled = enabled;
  }

  /** Cập nhật scale từ bên ngoài */
  setScale(scale: number): void {
    this.scale = scale;
    this.draw(); 
  }

  /** Lấy vùng bao của pet trên màn hình */
  getRect() {
    return {
      x: window.screenX,
      y: window.screenY,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /** Đặt mục tiêu đuổi bắt */
  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /** Play animation cho state cụ thể */
  play(config: AnimationConfig, scale: number = 1.0): void {
    this.stop();
    this.currentConfig = config;
    this.currentFrame = 0;
    this.scale = scale;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();

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
          const winX = window.screenX;
          const screenW = window.screen.availWidth;
          const winW = window.innerWidth;

          // Multi-Pet: Đuổi theo mục tiêu nếu có
          if (this.targetX !== null) {
            const centerX = winX + winW / 2;
            if (this.targetX < centerX - 50) {
              this.direction = -1;
            } else if (this.targetX > centerX + 50) {
              this.direction = 1;
            } else {
              // Đã đến gần mục tiêu
              this.targetX = null;
            }
          } else {
            // Đi ngẫu nhiên: KIỂM TRA BIÊN MÀN HÌNH ĐỂ QUAY ĐẦU
            if ((this.direction === -1 && winX <= 0) || 
                (this.direction === 1 && winX + winW >= screenW)) {
              this.direction *= -1;
              this.accumulatedX = 0;
            }
          }

          // Tích lũy phần dư (speed * direction)
          this.accumulatedX += speed * this.direction;

          const actualMoveX = Math.trunc(this.accumulatedX);
          if (Math.abs(actualMoveX) >= 1) {
            window.electronAPI.moveWindow(actualMoveX, 0);
            this.accumulatedX -= actualMoveX;
            window.electronAPI.savePosition(this.instanceId, window.screenX, window.screenY);
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
