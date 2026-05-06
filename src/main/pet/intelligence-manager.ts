import { exec } from 'child_process';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { translations } from '../../shared/i18n/translations';
import { PetManager } from './pet-manager';
import { OverlayWindow } from '../windows/overlay-window';

export class IntelligenceManager {
  private interval: NodeJS.Timeout | null = null;
  private lastApp: string = '';
  private lastTabTitle: string = '';
  private overlay: OverlayWindow;
  private petManager: PetManager;

  constructor(overlay: OverlayWindow, petManager: PetManager) {
    this.overlay = overlay;
    this.petManager = petManager;
  }

  start() {
    this.stop();
    this.scheduleNextCheck();
  }

  private scheduleNextCheck() {
    // Ngẫu nhiên từ 30s (30000ms) đến 60s (60000ms)
    const delay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
    this.interval = setTimeout(() => {
      this.checkContext();
      this.scheduleNextCheck();
    }, delay);
  }

  stop() {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
  }

  private async checkContext() {
    if (process.platform === 'darwin') {
      this.checkActiveAppMac();
    }
    this.checkTime();
  }

  private checkActiveAppMac() {
    const script = `tell application "System Events" to get name of first process whose frontmost is true`;
    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) return;
      const currentApp = stdout.trim();
      
      const isBrowser = currentApp.includes('Chrome') || currentApp.includes('Safari') || currentApp.includes('Arc');

      // Luôn cho phép nhận xét nếu là App khác, hoặc nếu là Browser thì kiểm tra Tab
      if (currentApp !== this.lastApp && currentApp !== 'Electron' && currentApp !== 'MiniPet') {
        this.lastApp = currentApp;
        this.generateAppComment(currentApp);
      } else if (isBrowser) {
        this.checkBrowserTab(currentApp);
      } else if (currentApp === this.lastApp && currentApp !== 'Electron' && currentApp !== 'MiniPet') {
        // Nếu vẫn ở App cũ quá lâu, thỉnh thoảng (30%) vẫn nói gì đó cho đỡ chán
        if (Math.random() < 0.3) {
          this.generateAppComment(currentApp);
        }
      }
    });
  }

  private generateAppComment(appName: string) {
    const lang = this.petManager.getSettings().language || 'en';
    const t = translations[lang];
    let choices: string[] = [];
    
    if (appName.includes('Code') || appName.includes('Cursor') || appName.includes('Zed')) {
      choices = t.intelAppCode;
    } else if (appName.includes('Chrome') || appName.includes('Safari') || appName.includes('Arc')) {
      this.checkBrowserTab(appName);
      return;
    } else if (appName.includes('Spotify') || appName.includes('Music')) {
      choices = t.intelAppMusic;
    } else if (appName.includes('Slack') || appName.includes('Telegram') || appName.includes('Messenger')) {
      choices = t.intelAppChat;
    } else if (appName.includes('Terminal') || appName.includes('iTerm')) {
      choices = t.intelAppTerminal;
    } else if (appName.includes('Figma') || appName.includes('Photoshop') || appName.includes('Illustrator') || appName.includes('Canva')) {
      choices = t.intelAppDesign;
    } else if (appName.includes('Zoom') || appName.includes('Teams') || appName.includes('Meet') || appName.includes('Webex')) {
      choices = t.intelAppMeeting;
    } else if (appName.includes('Notion') || appName.includes('Obsidian') || appName.includes('Word') || appName.includes('Excel') || appName.includes('Notes')) {
      choices = t.intelAppProductivity;
    } else if (appName.includes('Finder')) {
      choices = t.intelAppFinder;
    } else {
      choices = t.intelAppDefault;
    }

    if (choices && choices.length > 0) {
      const comment = choices[Math.floor(Math.random() * choices.length)];
      this.say(comment);
    }
  }

  private checkBrowserTab(browserName: string) {
    let script = '';
    if (browserName.includes('Chrome')) {
      script = 'tell application "Google Chrome" to get title of active tab of front window';
    } else if (browserName.includes('Safari')) {
      script = 'tell application "Safari" to get name of current tab of front window';
    } else if (browserName.includes('Arc')) {
      script = 'tell application "Arc" to get title of active tab of front window';
    }

    if (!script) return;

    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) return;
      const title = stdout.trim();
      
      // Nếu tiêu đề khác, hoặc kể cả trùng tiêu đề nhưng ngẫu nhiên (40%) vẫn nói để đa dạng
      if (title && (title !== this.lastTabTitle || Math.random() < 0.4)) {
        this.lastTabTitle = title;
        this.generateBrowserComment(title);
      }
    });
  }

  private generateBrowserComment(title: string) {
    const lang = this.petManager.getSettings().language || 'en';
    const t = translations[lang];
    let choices: string[] = [];

    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('youtube')) {
      choices = t.intelWebYoutube;
    } else if (lowerTitle.includes('facebook') || lowerTitle.includes('tiktok') || lowerTitle.includes('twitter') || lowerTitle.includes('reddit')) {
      choices = t.intelWebSocial;
    } else if (lowerTitle.includes('github') || lowerTitle.includes('stackoverflow') || lowerTitle.includes('w3schools') || lowerTitle.includes('mdn')) {
      choices = t.intelWebDev;
    } else if (lowerTitle.includes('chatgpt') || lowerTitle.includes('claude') || lowerTitle.includes('gemini')) {
      choices = t.intelWebAI;
    } else if (lowerTitle.includes('figma') || lowerTitle.includes('canva')) {
      choices = t.intelWebDesign;
    } else {
      choices = t.intelAppWeb;
    }

    if (choices && (choices as string[]).length > 0) {
      const comment = choices[Math.floor(Math.random() * choices.length)];
      this.say(comment);
    }
  }

  private checkTime() {
    const lang = this.petManager.getSettings().language || 'en';
    const t = translations[lang];
    const hour = new Date().getHours();
    
    if (hour >= 23 || hour < 5) {
      if (Math.random() < 0.1) {
        const choices = t.intelTimeLate;
        if (choices) this.say(choices[Math.floor(Math.random() * choices.length)]);
      }
    } else if (hour === 12) {
      if (Math.random() < 0.1) {
        const choices = t.intelTimeLunch;
        if (choices) this.say(choices[Math.floor(Math.random() * choices.length)]);
      }
    }
  }

  private say(text: string) {
    this.overlay.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.PET_SAY, text);
      }
    });
  }
}
