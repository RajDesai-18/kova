'use client';

import { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  currentEmoji: string | null;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
}

export function EmojiPicker({ currentEmoji, onSelect, onRemove }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-1 text-2xl hover:bg-muted"
        title="Set document icon"
      >
        {currentEmoji || '📄'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji.native);
              setOpen(false);
            }}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
          />
          {currentEmoji && (
            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full rounded-b-lg border border-t-0 border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
            >
              Remove icon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
