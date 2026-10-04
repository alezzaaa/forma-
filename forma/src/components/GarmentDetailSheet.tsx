import { useId, useState } from 'react';
import { Heart, MoreHorizontal, X } from 'lucide-react';
import type { Garment } from '../types';
import { useModalSheet } from '../lib/useModalSheet';
import GarmentArt from './GarmentArt';
import './wardrobe.css';

export default function GarmentDetailSheet({ garment, onClose, onCreate, onEdit, onFavorite, onDelete }: {
  garment: Garment;
  onClose: () => void;
  onCreate?: (garment: Garment) => void;
  onEdit?: (garment: Garment) => void;
  onFavorite?: (garment: Garment) => void;
  onDelete?: (garment: Garment) => void;
}) {
  const ref = useModalSheet(onClose);
  const titleId = useId();
  const menuId = useId();
  const [menu, setMenu] = useState(false);
  const leave = (action: (garment: Garment) => void) => { onClose(); action(garment); };
  return <div className="modal-backdrop wardrobe-sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className="modal wardrobe-sheet garment-detail-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="wardrobe-sheet-header"><h2 id={titleId}>{garment.name}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi dettaglio capo"><X size={20} /></button></header>
      <div className="wardrobe-sheet-scroll">
        <div className="garment-detail-art"><GarmentArt garment={garment} /></div>
        {garment.demo && <p className="garment-detail-demo">Capo di esempio</p>}
        <p className="garment-detail-description">{garment.category} · {garment.color}<br />{garment.seasons.join(' · ')}</p>
        <p className="garment-detail-usage">{garment.wearCount ? `${garment.wearCount} ${garment.wearCount === 1 ? 'utilizzo' : 'utilizzi'}` : 'Mai indossato'}{garment.lastWorn && <> · Ultimo utilizzo: {new Date(garment.lastWorn).toLocaleDateString('it-IT')}</>}</p>
        {onFavorite && <button className="button button-outline garment-detail-favorite" type="button" aria-pressed={garment.favorite} onClick={() => onFavorite(garment)}><Heart size={18} fill={garment.favorite ? 'currentColor' : 'none'} />{garment.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}</button>}
      </div>
      <footer className="wardrobe-sheet-footer">
        {onCreate && <button className="button button-primary garment-detail-create" type="button" onClick={() => leave(onCreate)}>Crea outfit da questo capo</button>}
        <div className="garment-detail-secondary">{onEdit && <button className="button button-outline" type="button" onClick={() => leave(onEdit)}>Modifica capo</button>}{onDelete && <button className="icon-button" type="button" aria-label="Altre azioni sul capo" aria-expanded={menu} aria-controls={menuId} onClick={() => setMenu(!menu)}><MoreHorizontal size={22} /></button>}</div>
        {menu && onDelete && <div id={menuId} className="garment-detail-menu"><button className="button button-ghost danger" type="button" onClick={() => leave(onDelete)}>Elimina capo</button></div>}
      </footer>
    </div>
  </div>;
}
