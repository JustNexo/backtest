import React, { useState, useEffect } from 'react';
import { colorToHex, isValidColor } from '../../utils/colorUtils';

interface ColorPickerInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  showAlpha?: boolean;
}

export const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  label,
  value,
  onChange,
}) => {
  const [textVal, setTextVal] = useState(value);

  useEffect(() => {
    setTextVal(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setTextVal(next);
    if (isValidColor(next)) {
      onChange(next);
    }
  };

  const hexValue = colorToHex(value);

  return (
    <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl gap-3">
      <span className="text-xs text-white font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        {/* Text input for HEX / RGB */}
        <input
          type="text"
          value={textVal}
          onChange={handleTextChange}
          placeholder="#089981 / rgb(...)"
          className="w-32 px-2 py-1 bg-[#1e222d] border border-[#363a45] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-tv-blue text-center"
        />

        {/* Swatch color input */}
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#363a45] shrink-0 cursor-pointer shadow-sm">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => {
              setTextVal(e.target.value);
              onChange(e.target.value);
            }}
            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};
