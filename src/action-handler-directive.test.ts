/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actionHandlerBind } from './action-handler-directive';

interface ActionEventDetail {
  action: string;
}

type ActionEvent = CustomEvent<ActionEventDetail>;

describe('action-handler-directive', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('does not duplicate touchend handlers after rebind', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    let actionCount = 0;
    element.addEventListener('action', () => {
      actionCount += 1;
    });

    actionHandlerBind(element, { hasHold: false });
    actionHandlerBind(element, { hasHold: true });

    const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
    element.dispatchEvent(touchEnd);

    expect(actionCount).toBe(1);
  });

  it('calls preventDefault for cancelable touchend', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    actionHandlerBind(element, { hasHold: false });

    const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(touchEnd, 'preventDefault');

    element.dispatchEvent(touchEnd);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call preventDefault for non-cancelable touchend', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    actionHandlerBind(element, { hasHold: false });

    const touchEnd = new Event('touchend', { bubbles: true, cancelable: false });
    const preventDefaultSpy = vi.spyOn(touchEnd, 'preventDefault');

    element.dispatchEvent(touchEnd);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('fires hold action and haptic feedback when hold threshold is reached', () => {
    vi.useFakeTimers();

    const element = document.createElement('div');
    document.body.appendChild(element);

    const actions: string[] = [];
    element.addEventListener('action', (ev) => {
      actions.push((ev as ActionEvent).detail.action);
    });

    const haptics: string[] = [];
    window.addEventListener('haptic', (ev) => {
      haptics.push((ev as CustomEvent<string>).detail);
    });

    actionHandlerBind(element, { hasHold: true });

    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 20 }));
    vi.advanceTimersByTime(500);

    expect(actions).toContain('hold');
    expect(haptics).toContain('success');
  });

  it('does not fire any action when disabled', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    let actionCount = 0;
    element.addEventListener('action', () => {
      actionCount += 1;
    });

    actionHandlerBind(element, { disabled: true });

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    element.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));

    expect(actionCount).toBe(0);
  });
});
