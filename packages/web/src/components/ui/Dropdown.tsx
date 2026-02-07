import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';

type Option = { label: string; value: string | number };

type DropdownProps = {
  label?: string;
  value?: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  fullWidth?: boolean;
  placeholder?: string;
};

export default function Dropdown({ label, value = '', onChange, options, fullWidth = true, placeholder }: DropdownProps) {
  const handleChange = (e: SelectChangeEvent<string | number>) => {
    const val = e.target.value as string | number;
    onChange(val);
  };

  return (
    <FormControl fullWidth={fullWidth} size="small">
      {label ? <InputLabel>{label}</InputLabel> : null}
      <Select label={label} value={value} onChange={handleChange} displayEmpty>
        {placeholder ? (
          <MenuItem value="">
            <em>{placeholder}</em>
          </MenuItem>
        ) : null}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
