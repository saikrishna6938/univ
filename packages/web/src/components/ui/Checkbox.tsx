import MuiCheckbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

type CheckboxProps = {
  label?: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
};

export default function Checkbox({ label, checked = false, onChange }: CheckboxProps) {
  return (
    <FormControlLabel
      control={<MuiCheckbox checked={checked} onChange={(e) => onChange(e.target.checked)} size="small" />}
      label={label}
    />
  );
}
