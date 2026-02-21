import './find-course.css';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchConcentrations,
  fetchLocations,
  fetchUniversities,
  type ConcentrationItem,
  type LocationItem,
  type UniversityItem
} from './api';

const fees = ['0 - 25K', '25 - 50K', '50 - 75K', '75K - 1L', '1 - 2L'];

type Props = {
  countryId?: string;
  selectedUniversity?: string;
  onSelectUniversity: (university?: string) => void;
  selectedConcentration?: string;
  onSelectConcentration: (concentration?: string) => void;
  selectedLocation?: string;
  onSelectLocation: (location?: string) => void;
};

export default function FiltersSidebar({
  countryId,
  selectedUniversity,
  onSelectUniversity,
  selectedConcentration,
  onSelectConcentration,
  selectedLocation,
  onSelectLocation
}: Props) {
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [universitiesError, setUniversitiesError] = useState<string | null>(null);
  const [universityQuery, setUniversityQuery] = useState('');
  const [showUniversityOptions, setShowUniversityOptions] = useState(false);
  const [concentrations, setConcentrations] = useState<ConcentrationItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [concentrationQuery, setConcentrationQuery] = useState('');
  const [showConcentrationOptions, setShowConcentrationOptions] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [showLocationOptions, setShowLocationOptions] = useState(false);

  useEffect(() => {
    let active = true;
    setUniversitiesLoading(true);
    setUniversitiesError(null);
    fetchUniversities(countryId)
      .then((items) => {
        if (!active) return;
        setUniversities(items);
      })
      .catch((err) => {
        if (!active) return;
        setUniversitiesError((err as Error).message || 'Failed to load universities');
      })
      .finally(() => {
        if (!active) return;
        setUniversitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [countryId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchConcentrations(countryId)
      .then((items) => {
        if (!active) return;
        setConcentrations(items);
      })
      .catch((err) => {
        if (!active) return;
        setError((err as Error).message || 'Failed to load concentrations');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [countryId]);

  useEffect(() => {
    let active = true;
    setLocationsLoading(true);
    setLocationsError(null);
    fetchLocations(countryId)
      .then((items) => {
        if (!active) return;
        setLocations(items);
      })
      .catch((err) => {
        if (!active) return;
        setLocationsError((err as Error).message || 'Failed to load locations');
      })
      .finally(() => {
        if (!active) return;
        setLocationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [countryId]);

  const visibleConcentrations = useMemo(
    () =>
      concentrations.filter(
        (c) =>
          (c.concentrationName && c.concentrationName.trim() !== '') ||
          (c.concentration && c.concentration.trim() !== '')
      ),
    [concentrations]
  );

  const visibleUniversities = useMemo(
    () => universities.filter((item) => item.universityName && item.universityName.trim() !== ''),
    [universities]
  );

  const filteredUniversities = useMemo(() => {
    const term = universityQuery.trim().toLowerCase();
    if (!term) return visibleUniversities;
    return visibleUniversities.filter((item) => item.universityName.toLowerCase().includes(term));
  }, [visibleUniversities, universityQuery]);

  const filteredConcentrations = useMemo(() => {
    const term = concentrationQuery.trim().toLowerCase();
    if (!term) return visibleConcentrations;
    return visibleConcentrations.filter((item) => {
      const name = (item.concentrationName || item.concentration || '').toLowerCase();
      return name.includes(term);
    });
  }, [visibleConcentrations, concentrationQuery]);

  const visibleLocations = useMemo(
    () => locations.filter((l) => l.locationName && l.locationName.trim() !== ''),
    [locations]
  );

  const filteredLocations = useMemo(() => {
    const term = locationQuery.trim().toLowerCase();
    if (!term) return visibleLocations;
    return visibleLocations.filter((item) => item.locationName.toLowerCase().includes(term));
  }, [visibleLocations, locationQuery]);

  useEffect(() => {
    setUniversityQuery(selectedUniversity || '');
  }, [selectedUniversity]);

  useEffect(() => {
    const selectedName = visibleConcentrations.find(
      (item) => (item.concentrationName || item.concentration || '') === selectedConcentration
    )?.concentrationName;
    setConcentrationQuery(selectedName || selectedConcentration || '');
  }, [selectedConcentration, visibleConcentrations]);

  useEffect(() => {
    const selectedName = visibleLocations.find((item) => item.location === selectedLocation)?.locationName;
    setLocationQuery(selectedName || selectedLocation || '');
  }, [selectedLocation, visibleLocations]);

  return (
    <div className="fc-sidebar">
      <div className="fc-sidebar__heading">Filter By</div>
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">University</div>
        <div className="fc-sidebar__list">
          <div className="fc-select-wrap">
            <input
              className="fc-select fc-select--editable"
              value={universityQuery}
              placeholder="Type to search university"
              onFocus={() => setShowUniversityOptions(true)}
              onChange={(e) => {
                const value = e.target.value;
                setUniversityQuery(value);
                setShowUniversityOptions(true);
                if (!value.trim()) onSelectUniversity(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const exact = visibleUniversities.find(
                  (item) => item.universityName.toLowerCase() === universityQuery.trim().toLowerCase()
                );
                onSelectUniversity(exact?.universityName);
                setUniversityQuery(exact?.universityName || universityQuery);
                setShowUniversityOptions(false);
              }}
              onBlur={() => {
                setTimeout(() => setShowUniversityOptions(false), 120);
              }}
            />
            {showUniversityOptions && (
              <div className="fc-select-options">
                <button
                  type="button"
                  className={`fc-select-option ${!selectedUniversity ? 'is-active' : ''}`}
                  onMouseDown={() => {
                    onSelectUniversity(undefined);
                    setUniversityQuery('');
                    setShowUniversityOptions(false);
                  }}
                >
                  All
                </button>
                {filteredUniversities.map((item) => (
                  <button
                    type="button"
                    key={item.universityName}
                    className={`fc-select-option ${selectedUniversity === item.universityName ? 'is-active' : ''}`}
                    onMouseDown={() => {
                      onSelectUniversity(item.universityName);
                      setUniversityQuery(item.universityName);
                      setShowUniversityOptions(false);
                    }}
                  >
                    {item.universityName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {universitiesLoading && <span className="fc-sidebar__note">Loading universities...</span>}
          {!universitiesLoading && !universitiesError && visibleUniversities.length === 0 && (
            <span className="fc-sidebar__note">No universities found</span>
          )}
          {universitiesError && <span className="fc-sidebar__note fc-sidebar__note--error">{universitiesError}</span>}
        </div>
      </div>
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">Concentration</div>
        <div className="fc-sidebar__list">
          <div className="fc-select-wrap">
            <input
              className="fc-select fc-select--editable"
              value={concentrationQuery}
              placeholder="Type to search concentration"
              onFocus={() => setShowConcentrationOptions(true)}
              onChange={(e) => {
                const value = e.target.value;
                setConcentrationQuery(value);
                setShowConcentrationOptions(true);
                if (!value.trim()) onSelectConcentration(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const exact = visibleConcentrations.find(
                  (item) =>
                    (item.concentrationName || item.concentration || '').toLowerCase() ===
                    concentrationQuery.trim().toLowerCase()
                );
                const name = exact?.concentrationName || exact?.concentration;
                onSelectConcentration(name);
                setConcentrationQuery(name || concentrationQuery);
                setShowConcentrationOptions(false);
              }}
              onBlur={() => {
                setTimeout(() => setShowConcentrationOptions(false), 120);
              }}
            />
            {showConcentrationOptions && (
              <div className="fc-select-options">
                <button
                  type="button"
                  className={`fc-select-option ${!selectedConcentration ? 'is-active' : ''}`}
                  onMouseDown={() => {
                    onSelectConcentration(undefined);
                    setConcentrationQuery('');
                    setShowConcentrationOptions(false);
                  }}
                >
                  All
                </button>
                {filteredConcentrations.map((item) => {
                  const name = item.concentrationName || item.concentration || '';
                  return (
                    <button
                      type="button"
                      key={`${item.concentrationId ?? name}`}
                      className={`fc-select-option ${selectedConcentration === name ? 'is-active' : ''}`}
                      onMouseDown={() => {
                        onSelectConcentration(name);
                        setConcentrationQuery(name);
                        setShowConcentrationOptions(false);
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {loading && <span className="fc-sidebar__note">Loading concentrations...</span>}
          {!loading && !error && visibleConcentrations.length === 0 && (
            <span className="fc-sidebar__note">No concentrations found</span>
          )}
          {error && <span className="fc-sidebar__note fc-sidebar__note--error">{error}</span>}
        </div>
      </div>
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">Location</div>
        <div className="fc-sidebar__list">
          <div className="fc-select-wrap">
            <input
              className="fc-select fc-select--editable"
              value={locationQuery}
              placeholder="Type to search location"
              onFocus={() => setShowLocationOptions(true)}
              onChange={(e) => {
                const value = e.target.value;
                setLocationQuery(value);
                setShowLocationOptions(true);
                if (!value.trim()) onSelectLocation(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const exact = visibleLocations.find(
                  (item) => item.locationName.toLowerCase() === locationQuery.trim().toLowerCase()
                );
                onSelectLocation(exact?.location);
                setLocationQuery(exact?.locationName || locationQuery);
                setShowLocationOptions(false);
              }}
              onBlur={() => {
                // Delay close so option click can fire first.
                setTimeout(() => setShowLocationOptions(false), 120);
              }}
            />
            {showLocationOptions && (
              <div className="fc-select-options">
                <button
                  type="button"
                  className={`fc-select-option ${!selectedLocation ? 'is-active' : ''}`}
                  onMouseDown={() => {
                    onSelectLocation(undefined);
                    setLocationQuery('');
                    setShowLocationOptions(false);
                  }}
                >
                  All
                </button>
                {filteredLocations.map((item) => (
                  <button
                    type="button"
                    key={item.location}
                    className={`fc-select-option ${selectedLocation === item.location ? 'is-active' : ''}`}
                    onMouseDown={() => {
                      onSelectLocation(item.location);
                      setLocationQuery(item.locationName);
                      setShowLocationOptions(false);
                    }}
                  >
                    {item.locationName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {locationsLoading && <span className="fc-sidebar__note">Loading locations...</span>}
          {!locationsLoading && !locationsError && visibleLocations.length === 0 && (
            <span className="fc-sidebar__note">No locations found</span>
          )}
          {locationsError && <span className="fc-sidebar__note fc-sidebar__note--error">{locationsError}</span>}
        </div>
      </div>
      <div className="fc-sidebar__section">
        <div className="fc-sidebar__title">Avg Fee Per Year</div>
        <div className="fc-sidebar__list">
          {fees.map((s) => (
            <label key={s} className="fc-checkbox">
              <input type="checkbox" />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
