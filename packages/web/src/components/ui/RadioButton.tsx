import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

type Option = { label: string; value: string };

type RadioButtonProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: Option[];
  row?: boolean;
};

export default function RadioButton({ label, value, onChange, options, row = false }: RadioButtonProps) {
  return (
    <FormControl>
      {label ? <FormLabel>{label}</FormLabel> : null}
      <RadioGroup row={row} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <FormControlLabel key={opt.value} value={opt.value} control={<Radio size="small" />} label={opt.label} />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
