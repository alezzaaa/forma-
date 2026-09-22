import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose, className = '' }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => { const previous = document.activeElement as HTMLElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
        closeRef.current(); if (e.key === 'Tab') {
        const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]') ?? []).filter(el => el.offsetParent !== null);
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) {
            e.preventDefault();
            return;
        }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
            e.preventDefault();
            first.focus();
        }
    } }; document.addEventListener('keydown', key); return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); }; }, []);
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={20}/></button></div>{children}</div></div>;
}
