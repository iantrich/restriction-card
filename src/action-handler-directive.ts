import { ActionHandlerDetail, ActionHandlerOptions } from 'custom-card-helpers/dist/types';
import { directive, Directive, ElementPart, PartInfo } from 'lit/directive.js';
import { deepEqual, fireEvent, forwardHaptic } from 'custom-card-helpers';

const customFireEvent = <T extends keyof HASSDomEvents>(node: HTMLElement, type: T, detail: HASSDomEvents[T]): void => {
  fireEvent(node, type, detail);
};

const isTouch =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  ('msMaxTouchPoints' in navigator && (navigator as Navigator & { msMaxTouchPoints: number }).msMaxTouchPoints > 0);

interface ActionHandler extends HTMLElement {
  holdTime: number;
  cancelled: boolean;
  held: boolean;
  timer?: number;
  dblClickTimeout?: number;
  isRepeating: boolean;
  repeatTimeout?: number;
  bind(element: ActionHandlerElement, options?: ActionHandlerOptions): void;
  startAnimation(x: number, y: number): void;
  stopAnimation(): void;
}

interface ActionHandlerElement extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleTouchMove?: (ev: TouchEvent) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

declare global {
  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

// Helper functions for ActionHandler behavior
const setupActionHandlerMethods = (element: HTMLElement): ActionHandler => {
  const actionHandler = element as ActionHandler;

  // Add animation methods
  actionHandler.startAnimation = (x: number, y: number): void => {
    Object.assign(actionHandler.style, {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%) scale(1)',
    });
  };

  actionHandler.stopAnimation = (): void => {
    Object.assign(actionHandler.style, {
      left: '',
      top: '',
      transform: 'translate(-50%, -50%) scale(0)',
    });
  };

  // Add bind method
  actionHandler.bind = (element: ActionHandlerElement, options: ActionHandlerOptions = {}): void => {
    // Check if already bound with same options
    if (element.actionHandler && deepEqual(options, element.actionHandler.options)) {
      return;
    }

    // Remove existing event listeners if rebinding
    if (element.actionHandler) {
      element.removeEventListener('touchstart', element.actionHandler.start!);
      element.removeEventListener('touchend', element.actionHandler.end!);
      element.removeEventListener('touchcancel', element.actionHandler.end!);
      element.removeEventListener('mousedown', element.actionHandler.start!);
      element.removeEventListener('click', element.actionHandler.end!);
      element.removeEventListener('keydown', element.actionHandler.handleKeyDown!);
      if (element.actionHandler.handleTouchMove) {
        element.removeEventListener('touchmove', element.actionHandler.handleTouchMove);
      }
    } else {
      // Add context menu prevention only once
      element.addEventListener('contextmenu', (ev: Event) => {
        const e = ev || window.event;
        if (e.preventDefault) {
          e.preventDefault();
        }
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        e.cancelBubble = true;
        e.returnValue = false;
        return false;
      });
    }

    element.actionHandler = { options };

    if (options.disabled) {
      return;
    }

    element.actionHandler.start = (ev: Event) => {
      if ((ev as unknown as { detail?: { ignore?: boolean } }).detail?.ignore) {
        return;
      }
      actionHandler.cancelled = false;
      actionHandler.held = false;
      let x;
      let y;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].clientX;
        y = (ev as TouchEvent).touches[0].clientY;
      } else {
        x = (ev as MouseEvent).clientX;
        y = (ev as MouseEvent).clientY;
      }

      if (options.hasHold) {
        actionHandler.timer = window.setTimeout(() => {
          actionHandler.startAnimation(x, y);
          actionHandler.held = true;
          forwardHaptic('success');
          customFireEvent(element, 'action', { action: 'hold' });

          if (options.repeat && options.repeat > 0) {
            let repeatCount = 0;
            actionHandler.isRepeating = true;
            actionHandler.repeatTimeout = window.setInterval(() => {
              repeatCount++;
              customFireEvent(element, 'action', { action: 'hold' });
              if (options.repeatLimit && repeatCount >= options.repeatLimit) {
                window.clearInterval(actionHandler.repeatTimeout!);
                actionHandler.isRepeating = false;
              }
            }, options.repeat);
          }
        }, actionHandler.holdTime);
      }
    };

    element.actionHandler.end = (ev: Event) => {
      if ((ev as unknown as { detail?: { ignore?: boolean } }).detail?.ignore) {
        return;
      }

      if (ev.type === 'touchend' && ev.cancelable) {
        ev.preventDefault();
      }

      if (['touchend', 'touchcancel'].includes(ev.type) && actionHandler.cancelled) {
        if (actionHandler.isRepeating && actionHandler.repeatTimeout) {
          window.clearInterval(actionHandler.repeatTimeout);
          actionHandler.isRepeating = false;
        }
        if (options.isMomentary) {
          customFireEvent(element, 'action', { action: 'release' });
        }
        return;
      }

      if (ev.type === 'touchcancel') {
        return;
      }

      if (['touchend', 'touchcancel', 'mouseup'].includes(ev.type)) {
        actionHandler.stopAnimation();
      }

      if (actionHandler.isRepeating && actionHandler.repeatTimeout) {
        window.clearInterval(actionHandler.repeatTimeout);
        actionHandler.isRepeating = false;
      }

      if (actionHandler.timer) {
        clearTimeout(actionHandler.timer);
        actionHandler.timer = undefined;
      }

      if (actionHandler.held) {
        if (options.isMomentary) {
          customFireEvent(element, 'action', { action: 'release' });
        }
        return;
      }

      if (options.hasDoubleClick) {
        if ((ev.type === 'click' && (ev as MouseEvent).detail < 2) || !actionHandler.dblClickTimeout) {
          actionHandler.dblClickTimeout = window.setTimeout(() => {
            actionHandler.dblClickTimeout = undefined;
            customFireEvent(element, 'action', { action: 'tap' });
          }, 250);
        } else {
          clearTimeout(actionHandler.dblClickTimeout);
          actionHandler.dblClickTimeout = undefined;
          customFireEvent(element, 'action', { action: 'double_tap' });
        }
      } else {
        customFireEvent(element, 'action', { action: 'tap' });
      }

      if (options.isMomentary) {
        customFireEvent(element, 'action', { action: 'release' });
      }
    };

    if (!options.disableKbd) {
      element.actionHandler.handleKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          element.click();
        }
      };
    }

    const handleTouchMove = (ev: TouchEvent) => {
      if (!ev.touches) {
        return;
      }

      const touch = ev.touches[0];
      const rect = element.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        actionHandler.cancelled = true;
      }
    };

    element.actionHandler.handleTouchMove = handleTouchMove;

    element.addEventListener('touchstart', element.actionHandler.start, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', element.actionHandler.end);
    element.addEventListener('touchcancel', element.actionHandler.end);
    element.addEventListener('mousedown', element.actionHandler.start, { passive: true });
    element.addEventListener('click', element.actionHandler.end);

    if (!options.disableKbd) {
      element.addEventListener('keydown', element.actionHandler.handleKeyDown!);
    }
  };

  // Add global cancellation listeners
  ['touchcancel', 'mouseout', 'mouseup', 'touchmove', 'mousewheel', 'wheel', 'scroll'].forEach((ev) => {
    document.addEventListener(
      ev,
      () => {
        actionHandler.cancelled = true;
        if (actionHandler.timer) {
          actionHandler.stopAnimation();
          clearTimeout(actionHandler.timer);
          actionHandler.timer = undefined;
          if (actionHandler.isRepeating && actionHandler.repeatTimeout) {
            window.clearInterval(actionHandler.repeatTimeout);
            actionHandler.isRepeating = false;
          }
        }
      },
      { passive: true },
    );
  });

  return actionHandler;
};

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  const existing = body.querySelector('.action-handler-restriction-card');
  if (existing) {
    return existing as ActionHandler;
  }

  const div = document.createElement('div');
  div.className = 'action-handler-restriction-card';
  div.style.position = 'absolute';
  div.style.width = isTouch ? '100px' : '50px';
  div.style.height = isTouch ? '100px' : '50px';
  div.style.transform = 'translate(-50%, -50%) scale(0)';
  div.style.pointerEvents = 'none';
  div.style.zIndex = '999';
  div.style.transition = 'transform 0.1s ease-out';
  div.style.borderRadius = '50%';
  div.style.background = 'rgba(var(--rgb-primary-color), 0.3)';

  // Add ActionHandler properties
  const typedDiv = div as unknown as ActionHandler;
  typedDiv.holdTime = 500;
  typedDiv.cancelled = false;
  typedDiv.held = false;
  typedDiv.timer = undefined;
  typedDiv.dblClickTimeout = undefined;
  typedDiv.isRepeating = false;
  typedDiv.repeatTimeout = undefined;

  body.appendChild(div);

  // Setup methods and return as ActionHandler
  const actionHandler = setupActionHandlerMethods(div);

  return actionHandler;
};

export const actionHandlerBind = (element: ActionHandlerElement, options?: ActionHandlerOptions): void => {
  const actionhandler: ActionHandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};

class ActionHandlerDirective extends Directive {
  previousOptions?: ActionHandlerOptions;

  constructor(partInfo: PartInfo) {
    super(partInfo);
  }

  render(_options?: ActionHandlerOptions) {
    return undefined;
  }

  update(part: ElementPart, [options]: [ActionHandlerOptions?]) {
    if (!deepEqual(options, this.previousOptions)) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      this.previousOptions = options ? { ...options } : undefined;
    }
    return this.render(options);
  }
}

export const actionHandler = directive(ActionHandlerDirective);
