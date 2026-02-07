import TextField from '@mui/material/TextField';
import { type ChangeEvent } from 'react';

type InputProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  type?: string;
  required?: boolean;
};

export default function Input({
  label,
  value = '',
  onChange,
  placeholder,
  fullWidth = true,
  type = 'text',
  required,
}: InputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      fullWidth={fullWidth}
      type={type}
      required={required}
    />
  );
}
