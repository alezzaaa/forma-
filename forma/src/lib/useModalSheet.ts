import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const dialogs: symbol[] = [];
const dialogElements = new Map<symbol, HTMLElement>();
const isolated = new Map<HTMLElement, { inert: boolean; ariaHidden: string | null }>();

function isolateBackground() {
  for (const [element, saved] of isolated) {
    element.inert = saved.inert;
    if (saved.ariaHidden === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', saved.ariaHidden);
  }
  isolated.clear();
  let branch: HTMLElement | null = dialogElements.get(dialogs.at(-1)!) ?? null;
  while (branch?.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (!(sibling instanceof HTMLElement) || sibling === branch || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) continue;
      isolated.set(sibling, { inert: sibling.inert, ariaHidden: sibling.getAttribute('aria-hidden') });
      sibling.inert = true;
      sibling.setAttribute('aria-hidden', 'true');
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
}
let unlockBody: (() => void) | undefined;
let lockedScrollPosition: { x: number; y: number } | undefined;

/** A fixed body reports scrollY=0; navigation must remember the page below the sheet. */
export function readPageScrollPosition(): { x: number; y: number } {
  return lockedScrollPosition ?? { x: window.scrollX, y: window.scrollY };
}

function lockBody() {
  const body = document.body;
  const saved = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
  const x = window.scrollX;
  const y = window.scrollY;
  lockedScrollPosition = { x, y };
  // overflow:hidden alone still lets the page underneath a sheet move in Safari.
  Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, right: '0', width: '100%', overflow: 'hidden' });
  return () => {
    Object.assign(body.style, saved);
    lockedScrollPosition = undefined;
    const scrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(x, y);
    document.documentElement.style.scrollBehavior = scrollBehavior;
  };
}

/** Shared dialog behavior. Pass enabled=false while a conditional dialog is closed. */
export function useModalSheet(onClose: () => void, enabled = true): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!enabled) return;
    const dialog = ref.current;
    if (!dialog) return;
    const token = Symbol('dialog');
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialogs.length) unlockBody = lockBody();
    dialogs.push(token);
    dialogElements.set(token, dialog);
    // Move focus before hiding the trigger from assistive technologies.
    dialog.focus({ preventScroll: true });
    isolateBackground();
    const isTop = () => dialogs.at(-1) === token;
    const backdrop = dialog.parentElement;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      backdrop?.style.setProperty('--dialog-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      backdrop?.style.setProperty('--dialog-viewport-top', `${viewport?.offsetTop ?? 0}px`);
      backdrop?.toggleAttribute('data-keyboard-open', Boolean(viewport && window.innerHeight - viewport.height > 140));
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], summary, [tabindex]')].filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0 && !el.closest('[inert]'));
    // Focusing the sheet instead of an input avoids opening the iPhone keyboard.
    const frame = requestAnimationFrame(() => { if (isTop()) dialog.focus({ preventScroll: true }); });
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      const outside = document.activeElement === dialog || !dialog.contains(document.activeElement);
      if (event.shiftKey && (outside || document.activeElement === first)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (outside || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    const focusin = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusin);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusin);
      backdrop?.style.removeProperty('--dialog-viewport-height');
      backdrop?.style.removeProperty('--dialog-viewport-top');
      backdrop?.removeAttribute('data-keyboard-open');
      const index = dialogs.indexOf(token);
      const wasTop = isTop();
      if (index >= 0) dialogs.splice(index, 1);
      dialogElements.delete(token);
      isolateBackground();
      if (!dialogs.length) { unlockBody?.(); unlockBody = undefined; }
      if (wasTop) {
        const validTrigger = previous?.isConnected && previous.getClientRects().length && !previous.closest('[inert], [hidden]');
        const fallback = dialogElements.get(dialogs.at(-1)!) ?? document.querySelector<HTMLElement>('[data-page]:not([hidden]) h1') ?? document.getElementById('main');
        const target = validTrigger ? previous : fallback;
        if (target) { if (!target.matches('button, input, select, textarea, a[href], [tabindex]')) target.tabIndex = -1; target.focus({ preventScroll: true }); }
      }
    };
  }, [enabled]);
  return ref;
}
