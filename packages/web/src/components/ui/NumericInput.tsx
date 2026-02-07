import TextField from '@mui/material/TextField';
import { type ChangeEvent } from 'react';

type NumericInputProps = {
  label?: string;
  value?: number | string;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  fullWidth?: boolean;
};

export default function NumericInput({
  label,
  value = '',
  onChange,
  min,
  max,
  step,
  fullWidth = true,
}: NumericInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      onChange(Number(val));
    }
  };

  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      onChange={handleChange}
      inputProps={{ min, max, step }}
      fullWidth={fullWidth}
    />
  );
}
