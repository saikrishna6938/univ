import SearchRounded from '@mui/icons-material/SearchRounded';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountry } from './CountryContext';

const StyledPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  paddingInline: theme.spacing(1),
  paddingBlock: 4,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 10,
  color: '#e2e8f0',
  minWidth: 260,
  height: 44,
}));

export default function SearchBar() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const { selectedCountryId } = useCountry();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCountryId) params.set('country', selectedCountryId);
    navigate({ pathname: '/find-course', search: params.toString() });
  };

  return (
    <form onSubmit={handleSubmit}>
      <StyledPaper elevation={0}>
        <SearchRounded fontSize="small" />
        <InputBase
          sx={{ ml: 1, flex: 1, color: 'inherit' }}
          placeholder="Search universities and programs"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputProps={{ 'aria-label': 'search programs' }}
        />
        <IconButton type="submit" size="small" aria-label="search" sx={{ color: 'inherit' }}>
          <SearchRounded fontSize="small" />
        </IconButton>
      </StyledPaper>
    </form>
  );
}
