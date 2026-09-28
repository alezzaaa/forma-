import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const dialogs: symbol[] = [];
let unlockBody: (() => void) | undefined;

function lockBody() {
  const body = document.body;
  const saved = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
  const x = window.scrollX;
  const y = window.scrollY;
  // overflow:hidden alone still lets the page underneath a sheet move in Safari.
  Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, right: '0', width: '100%', overflow: 'hidden' });
  return () => {
    Object.assign(body.style, saved);
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
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'));
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
      if (!dialogs.length) { unlockBody?.(); unlockBody = undefined; }
      if (wasTop && previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [enabled]);
  return ref;
}
