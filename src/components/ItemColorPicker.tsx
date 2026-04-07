import { useState, useRef, useEffect } from 'react';
import { COLORES_PRODUCTO } from '@/lib/crm-types';

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export default function ItemColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const colorDef = COLORES_PRODUCTO.find(c => c.value === value) || COLORES_PRODUCTO[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-none" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-7 h-7 rounded-full transition-all hover:scale-110 ring-1 ring-offset-1 ${value !== 'Negro' ? 'ring-amber-400' : 'ring-slate-300'} ${colorDef.border ? 'border-2 border-slate-300' : ''}`}
        style={{ backgroundColor: colorDef.hex }}
        title={colorDef.label}
      />
      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl p-2 shadow-lg flex flex-wrap gap-1.5 w-[180px]">
          {COLORES_PRODUCTO.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => { onChange(c.value); setOpen(false); }}
              className={`w-6 h-6 rounded-full transition-all ${value === c.value ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-105'} ${c.border ? 'border-2 border-slate-300' : ''}`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
