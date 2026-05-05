/**
 * PetStateMachine — FSM cho pet behavior.
 */
import { PetState, AnimationConfig } from '../../../shared/types/pet.types';
import { DEFAULT_ANIMATIONS } from '../../../shared/constants';
import { AnimationController } from './animation-controller';

interface StateRule {
  minDuration: number;
  maxDuration: number;
  transitions: PetState[];
}

export class PetStateMachine {
  private currentState: PetState = 'idle';
  private controller: AnimationController;
  private animations: Record<string, AnimationConfig>;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private scale: number = 1.0;

  // State rules cho Pet "Lười"
  private rules: Partial<Record<PetState, StateRule>> = {
    idle: { minDuration: 15000, maxDuration: 40000, transitions: ['sleep', 'walk'] },
    walk: { minDuration: 5000, maxDuration: 20000, transitions: ['idle'] }, // Đi bộ lâu hơn (5-20 giây)
    sleep: { minDuration: 20000, maxDuration: 60000, transitions: ['idle'] },
  };

  private enableWalking: boolean = true;

  constructor(controller: AnimationController, scale: number = 1.0, enableWalking: boolean = true) {
    this.controller = controller;
    this.scale = scale;
    this.enableWalking = enableWalking;
    this.animations = { ...(DEFAULT_ANIMATIONS as any) };
    this.controller.onAnimationEnd = nextState => this.transitionTo(nextState);
  }

  setWalkingEnabled(enabled: boolean): void {
    this.enableWalking = enabled;
    this.controller.setWalkingEnabled(enabled);

    // Nếu đang đi mà bị tắt, chuyển ngay về đứng im
    if (!enabled && this.currentState === 'walk') {
      this.transitionTo('idle');
    }
  }

  getWalkingEnabled(): boolean {
    return this.enableWalking;
  }

  setScale(scale: number): void {
    this.scale = scale;
    this.controller.setScale(scale);
  }

  /** Start FSM */
  start(): void {
    this.transitionTo('idle');
  }

  /** Chuyển state */
  transitionTo(state: PetState): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.currentState = state;
    const config = this.animations[state];

    if (config) {
      this.controller.play(config, this.scale);
    }

    // Schedule next transition if rule exists and it's a looping state
    const rule = this.rules[state];
    if (rule && config?.loop) {
      this.scheduleTransition(rule);
    }
  }

  /** Force state */
  forceState(state: PetState): void {
    this.transitionTo(state);
  }

  /** Schedule next auto-transition */
  private scheduleTransition(rule: StateRule): void {
    const duration = Math.random() * (rule.maxDuration - rule.minDuration) + rule.minDuration;
    this.timerId = setTimeout(() => {
      let possibleTransitions = rule.transitions;

      // Lọc bỏ trạng thái 'walk' nếu không được phép
      if (!this.enableWalking) {
        possibleTransitions = possibleTransitions.filter(s => s !== 'walk');
      }

      // Nếu không còn trạng thái nào khả thi, về idle
      const nextState =
        possibleTransitions.length > 0
          ? possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)]
          : 'idle';

      this.transitionTo(nextState);
    }, duration);
  }

  getRect() {
    return this.controller.getRect();
  }

  /** Cleanup */
  destroy(): void {
    if (this.timerId) clearTimeout(this.timerId);
    this.controller.stop();
  }
}
