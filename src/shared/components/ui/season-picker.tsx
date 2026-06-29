'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/shared/components/ui/input';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SeasonPickerProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

export function SeasonPicker({
  value,
  min = 0,
  max = 999,
  onChange,
  label,
  className = '',
}: SeasonPickerProps) {
  const [inputValue, setInputValue] = useState<string>(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  }, []);

  const handleInputBlur = useCallback(() => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }, [inputValue, min, max, onChange, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleInputBlur();
      }
    },
    [handleInputBlur]
  );

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
    setInputValue(String(newValue));
  }, [value, max, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
    setInputValue(String(newValue));
  }, [value, min, onChange]);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <Input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className="h-8 w-12 focus:outline-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="flex flex-col -mt-px">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="h-4 flex items-start justify-center hover:bg-muted/50 rounded-t transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Increase season"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-4 flex items-end justify-center hover:bg-muted/50 rounded-b transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Decrease season"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
