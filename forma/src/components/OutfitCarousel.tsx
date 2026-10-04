import { Children, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '../pages/create.css';

interface OutfitCarouselProps {
  children: ReactNode;
  resetKey?: number | string;
  disabled?: boolean;
  reduceMotion?: boolean;
  onMore?: () => void;
}

/** Native scrolling preserves vertical gestures. Focus and arrow buttons reveal the same real cards. */
export default function OutfitCarousel({ children, resetKey, disabled = false, reduceMotion = false, onMore }: OutfitCarouselProps) {
  const cards = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const track = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const count = cards.length;
  useEffect(() => {
    setIndex(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [resetKey]);
  useEffect(() => { setIndex(previous => Math.min(previous, Math.max(0, count - 1))); }, [count]);
  useEffect(() => () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); }, []);
  function visibleIndex() {
    const element = track.current;
    if (!element || !element.children.length) return 0;
    const start = element.getBoundingClientRect().left;
    return [...element.children].reduce((nearest, child, candidate) => Math.abs(child.getBoundingClientRect().left - start) < Math.abs(element.children[nearest].getBoundingClientRect().left - start) ? candidate : nearest, 0);
  }
  function settled() { const next = visibleIndex(); setIndex(next); setAnnouncement(count > 1 ? `Outfit ${next + 1} di ${count}` : ''); }
  function go(next: number) {
    const element = track.current;
    const card = element?.children[next] as HTMLElement | undefined;
    if (!element || !card || disabled) return;
    const motion = reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: card.offsetLeft - (element.children[0] as HTMLElement).offsetLeft, behavior: motion ? 'instant' : 'smooth' });
    setIndex(next);
  }
  return <section className="outfit-carousel" aria-roledescription="carosello" aria-label="Proposte outfit">
    {count > 1 && <p className="outfit-carousel-count">{index + 1} di {count}</p>}
    <div id={id} ref={track} className="create-outfits-grid" onScroll={() => { if (scrollTimer.current) clearTimeout(scrollTimer.current); scrollTimer.current = setTimeout(settled, 140); }}>
      {cards.map((card, cardIndex) => <div key={cardIndex} className="outfit-carousel-slide" role="group" aria-roledescription="diapositiva" aria-label={`Outfit ${cardIndex + 1} di ${count}`} onFocusCapture={() => {
        if (!window.matchMedia('(max-width: 760px)').matches) return;
        const element = track.current;
        const item = element?.children[cardIndex] as HTMLElement | undefined;
        if (element && item) { element.scrollLeft = item.offsetLeft - (element.children[0] as HTMLElement).offsetLeft; setIndex(cardIndex); }
      }}>{card}</div>)}
    </div>
    <div className="outfit-carousel-controls">{count > 1 && <><button type="button" className="button button-ghost" disabled={disabled || index === 0} aria-controls={id} onClick={() => go(index - 1)}>Precedente</button><button type="button" className="button button-ghost" disabled={disabled || index >= count - 1} aria-controls={id} onClick={() => go(index + 1)}>Successivo</button></>}{onMore && <button type="button" className="button button-ghost" disabled={disabled} onClick={onMore}>Altre proposte</button>}</div>
    <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
  </section>;
}
