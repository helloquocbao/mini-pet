/**
 * SpriteRenderer — Vẽ 1 frame từ spritesheet lên Canvas 2D.
 */
export class SpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private spritesheet: HTMLImageElement | null = null;
  private frameWidth: number;
  private frameHeight: number;

  constructor(canvas: HTMLCanvasElement, frameWidth: number, frameHeight: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    // Đặt Canvas bằng đúng kích thước cửa sổ mới (400x440)
    this.canvas.width = 400;
    this.canvas.height = 440;

    // Disable image smoothing for pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Load spritesheet image từ path/URL */
  async loadSpritesheet(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spritesheet = img;
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Vẽ 1 frame cụ thể lên canvas (luôn nằm giữa cửa sổ) */
  drawFrame(col: number, row: number, scale: number = 1.0, flip: boolean = false): void {
    if (!this.spritesheet) return;

    const destW = Math.round(this.frameWidth * scale);
    const destH = Math.round(this.frameHeight * scale);

    // Cập nhật kích thước canvas vừa khít với kích thước pet đã scale
    if (this.canvas.width !== destW || this.canvas.height !== destH) {
      this.canvas.width = destW;
      this.canvas.height = destH;
      this.ctx.imageSmoothingEnabled = false;
    }

    // Clear toàn bộ canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();

    if (flip) {
      this.ctx.translate(destW / 2, destH / 2);
      this.ctx.scale(-1, 1);
      this.ctx.translate(-(destW / 2), -(destH / 2));
    }

    this.ctx.drawImage(
      this.spritesheet,
      col * this.frameWidth,
      row * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      0,
      0,
      destW,
      destH
    );

    this.ctx.restore();
  }

  /** Clear canvas */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
