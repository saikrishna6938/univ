import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import Button from '@mui/material/Button';
import { useRef } from 'react';

type UploadButtonProps = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: FileList) => void;
  variant?: 'text' | 'outlined' | 'contained';
};

export default function UploadButton({
  label = 'Upload',
  accept,
  multiple = false,
  onFilesSelected,
  variant = 'outlined',
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onFilesSelected(e.target.files);
  };

  return (
    <>
      <Button variant={variant} startIcon={<CloudUploadRounded />} onClick={handleClick}>
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
    </>
  );
}
