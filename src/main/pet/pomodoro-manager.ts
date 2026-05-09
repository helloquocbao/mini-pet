/**
 * PomodoroManager — Manages focus/break timer logic and coordinates pet animations.
 */

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

  /**
   * Sets up IPC listeners for Pomodoro control.
   */
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

  /**
   * Returns the current state of the Pomodoro timer.
   */
  private getState() {
    return {
      timeLeft: this.timeLeft,
      isWorkSession: this.isWorkSession,
      status: this.status,
      focusMinutes: this.focusMinutes,
      breakMinutes: this.breakMinutes
    };
  }

  /**
   * Starts or resumes the countdown timer.
   */
  private start() {
    if (this.timerId) return;

    if (this.status === 'idle') {
      this.timeLeft = this.isWorkSession ? this.focusMinutes * 60 : this.breakMinutes * 60;
    }
    
    this.status = this.isWorkSession ? 'focus' : 'break';
    this.broadcastState();

    this.timerId = setInterval(() => {
      this.timeLeft--;
      
      // Update all windows with the new time
      this.broadcastState();

      if (this.timeLeft <= 0) {
        this.handleEnd();
      }
    }, 1000);
  }

  /**
   * Pauses the countdown timer.
   */
  private pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.status = 'idle';
      this.broadcastState();
    }
  }

  /**
   * Resets the timer to the beginning of a focus session.
   */
  private reset() {
    this.pause();
    this.isWorkSession = true;
    this.timeLeft = this.focusMinutes * 60;
    this.status = 'idle';
    this.broadcastState();
  }

  /**
   * Handles the end of a session (focus or break).
   */
  private handleEnd() {
    this.pause();

    // 1. Notify all pet overlays to start the alarm/jump animation
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('pet:start-alarm');
    });

    // 2. Toggle session type
    this.isWorkSession = !this.isWorkSession;
    this.timeLeft = this.isWorkSession ? this.focusMinutes * 60 : this.breakMinutes * 60;
    
    // Broadcast "finished" event to trigger speech bubbles in overlays
    this.broadcastState({ finished: true });
  }

  /**
   * Broadcasts the timer state to all renderer windows.
   */
  private broadcastState(extra = {}) {
    const state = { ...this.getState(), ...extra };
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('pomo:tick', state);
      }
    });
  }
}
