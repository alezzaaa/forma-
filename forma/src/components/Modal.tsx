import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalSheet } from '../lib/useModalSheet';
export default function Modal({ title, children, onClose, className = '' }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    className?: string;
}) {
    const ref = useModalSheet(onClose);
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={20}/></button></div>{children}</div></div>;
}
