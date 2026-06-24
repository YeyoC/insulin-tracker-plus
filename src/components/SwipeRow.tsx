import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  children: ReactNode;
  onDelete: () => void;
};

const REVEAL = 88;

export function SwipeRow({ children, onDelete }: Props) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);

  const onStart = (x: number) => {
    startX.current = x;
  };
  const onMove = (x: number) => {
    if (startX.current === null) return;
    const dx = x - startX.current;
    const base = open ? -REVEAL : 0;
    const next = Math.max(-REVEAL, Math.min(0, base + dx));
    setOffset(next);
  };
  const onEnd = () => {
    if (offset < -REVEAL / 2) {
      setOffset(-REVEAL);
      setOpen(true);
    } else {
      setOffset(0);
      setOpen(false);
    }
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-danger text-danger-foreground"
      >
        <Trash2 className="size-5" />
      </button>
      <div
        style={{ transform: `translateX(${offset}px)`, transition: startX.current === null ? "transform 0.18s ease" : "none" }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={(e) => onStart(e.clientX)}
        onMouseMove={(e) => {
          if (startX.current !== null) onMove(e.clientX);
        }}
        onMouseUp={onEnd}
        onMouseLeave={() => {
          if (startX.current !== null) onEnd();
        }}
        className="relative bg-card"
      >
        {children}
      </div>
    </div>
  );
}
