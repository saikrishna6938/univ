import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

type Option = { label: string; value: string };

type MultiSelectorProps = {
  label?: string;
  value: Option[];
  options: Option[];
  placeholder?: string;
  onChange: (value: Option[]) => void;
};

export default function MultiSelectorComponent({ label, value, options, onChange, placeholder }: MultiSelectorProps) {
  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      renderInput={(params) => (
        <TextField {...(params as any)} label={label} placeholder={placeholder} size="small" />
      )}
    />
  );
}
