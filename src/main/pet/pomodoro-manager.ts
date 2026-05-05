import { BrowserWindow, ipcMain } from 'electron';

export class PomodoroManager {
  private timeLeft: number = 25 * 60;
  private timerId: NodeJS.Timeout | null = null;
  private isWorkSession: boolean = true;
  private focusMinutes: number = 25;
  private breakMinutes: number = 5;
  private status: 'idle' | 'focus' | 'break' = 'idle';

  constructor() {
    this.setupIpc();
  }

  private setupIpc() {
    ipcMain.handle('pomo:get-state', () => this.getState());
    ipcMain.on('pomo:start', (_event, focus: number, breakMin: number) => {
      this.focusMinutes = focus;
      this.breakMinutes = breakMin;
      this.start();
    });
    ipcMain.on('pomo:pause', () => this.pause());
    ipcMain.on('pomo:reset', () => this.reset());
    ipcMain.on('pomo:update-config', (_event, focus: number, breakMin: number) => {
      this.focusMinutes = focus;
      this.breakMinutes = breakMin;
      if (this.status === 'idle') {
        this.timeLeft = this.isWorkSession ? this.focusMinutes * 60 : this.breakMinutes * 60;
        this.broadcastState();
      }
    });
  }

  private getState() {
    return {
      timeLeft: this.timeLeft,
      isWorkSession: this.isWorkSession,
      status: this.status,
      focusMinutes: this.focusMinutes,
      breakMinutes: this.breakMinutes
    };
  }

  private start() {
    if (this.timerId) return;

    if (this.status === 'idle') {
      this.timeLeft = this.isWorkSession ? this.focusMinutes * 60 : this.breakMinutes * 60;
    }
    
    this.status = this.isWorkSession ? 'focus' : 'break';
    this.broadcastState();

    this.timerId = setInterval(() => {
      this.timeLeft--;
      
      // Gửi thời gian mới cho tất cả cửa sổ để hiển thị
      this.broadcastState();

      if (this.timeLeft <= 0) {
        this.handleEnd();
      }
    }, 1000);
  }

  private pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.status = 'idle';
      this.broadcastState();
    }
  }

  private reset() {
    this.pause();
    this.isWorkSession = true;
    this.timeLeft = this.focusMinutes * 60;
    this.status = 'idle';
    this.broadcastState();
  }

  private handleEnd() {
    this.pause();

    // 1. Ra lệnh cho Pet nhảy LIÊN TỤC (không có timeout)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:start-alarm');
    });

    // 2. Đổi phiên
    this.isWorkSession = !this.isWorkSession;
    this.timeLeft = this.isWorkSession ? this.focusMinutes * 60 : this.breakMinutes * 60;
    
    // Gửi thông báo kết thúc để Overlay hiện lời nhắn
    this.broadcastState({ finished: true });
  }

  private broadcastState(extra = {}) {
    const state = { ...this.getState(), ...extra };
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pomo:tick', state);
    });
  }
}
