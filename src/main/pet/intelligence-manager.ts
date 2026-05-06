import { exec } from 'child_process';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { translations } from '../../shared/i18n/translations';
import { PetManager } from './pet-manager';

export class IntelligenceManager {
  private interval: NodeJS.Timeout | null = null;
  private lastApp: string = '';
  private overlayWindow: BrowserWindow | null = null;
  private petManager: PetManager;

  constructor(overlayWindow: BrowserWindow, petManager: PetManager) {
    this.overlayWindow = overlayWindow;
    this.petManager = petManager;
  }

  start() {
    this.stop();
    this.interval = setInterval(() => {
      this.checkContext();
    }, 10000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
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
      
      if (currentApp !== this.lastApp && currentApp !== 'Electron' && currentApp !== 'MiniPet') {
        this.lastApp = currentApp;
        this.generateAppComment(currentApp);
      }
    });
  }

  private generateAppComment(appName: string) {
    const lang = this.petManager.getSettings().language || 'en';
    const t = translations[lang];
    let choices: string[] = [];
    
    if (appName.includes('Code') || appName.includes('Cursor') || appName.includes('Zed')) {
      choices = t.intelAppCode;
    } else if (appName.includes('Chrome') || appName.includes('Safari')) {
      // Nếu là trình duyệt, chạy tiếp AppleScript để lấy tiêu đề Tab
      this.checkBrowserTab(appName);
      return; // Sẽ xử lý trong hàm checkBrowserTab
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
    }

    if (!script) return;

    exec(`osascript -e '${script}'`, (error, stdout) => {
      if (error) return;
      const title = stdout.trim();
      this.generateBrowserComment(title);
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
      choices = t.intelAppWeb; // Quay lại câu nói chung chung cho web
    }

    if (choices && choices.length > 0) {
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
        this.say(choices[Math.floor(Math.random() * choices.length)]);
      }
    } else if (hour === 12) {
      if (Math.random() < 0.1) {
        const choices = t.intelTimeLunch;
        this.say(choices[Math.floor(Math.random() * choices.length)]);
      }
    }
  }

  private say(text: string) {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send(IPC_CHANNELS.PET_SAY, text);
    }
  }
}
