import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import IconButton from '@mui/material/IconButton';
import { useEffect, useMemo, useState } from 'react';
import { useLayout } from './LayoutContext';
import { useCountry } from './CountryContext';

export default function SideNav() {
  const { drawerOpen, closeDrawer } = useLayout();
  const { countries, selectedCountryId, setSelectedCountryId } = useCountry();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'countries' | 'categories'>('countries');

  const categories = ['Courses', 'Colleges', 'Scholarship', 'Study Guide', 'Exams'];

  useEffect(() => {
    if (!drawerOpen) {
      setView('countries');
      setQuery('');
    }
  }, [drawerOpen]);

  const filteredCountries = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter((country) => country.name.toLowerCase().includes(term));
  }, [countries, query]);

  const drawer = (
    <div className="country-drawer">
      {view === 'countries' ? (
        <>
          <div className="country-drawer__header">
            <h2>Countries</h2>
            <IconButton size="small" onClick={closeDrawer} aria-label="Close countries drawer">
              <CloseRounded />
            </IconButton>
          </div>
          <Divider />
          <div className="country-drawer__search-wrap">
            <div className="country-drawer__search">
              <SearchRounded />
              <input
                type="text"
                placeholder="Search Countries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="country-drawer__list">
            {filteredCountries.map((country) => {
              const id = (country.id ?? country._id)?.toString();
              const selected = Boolean(id && id === selectedCountryId);
              return (
                <button
                  key={id || country.name}
                  type="button"
                  className={`country-row ${selected ? 'country-row--active' : ''}`}
                  onClick={() => {
                    setSelectedCountryId(id);
                    setView('categories');
                  }}
                >
                  <span>{country.name}</span>
                  <ChevronRightRounded />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="country-drawer__header">
            <div className="category-header">
              <IconButton size="small" onClick={() => setView('countries')} aria-label="Back to countries">
                <ArrowBackRounded />
              </IconButton>
              <h2>Category</h2>
            </div>
          </div>
          <Divider />
          <div className="country-drawer__list">
            {categories.map((category) => (
              <button key={category} type="button" className="country-row category-row" onClick={closeDrawer}>
                <span>{category}</span>
                <AddRounded />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Drawer
      variant="temporary"
      open={drawerOpen}
      onClose={closeDrawer}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: { xs: '100%', sm: 420 },
          maxWidth: '100vw'
        }
      }}
    >
      {drawer}
    </Drawer>
  );
}
