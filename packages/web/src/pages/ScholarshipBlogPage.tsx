import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import PublicRounded from '@mui/icons-material/PublicRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { fetchScholarshipById, type AdminScholarship } from '../lib/api';

function formatDeadline(value?: string | null) {
  if (!value) return 'Not announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not announced';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDomain(url: string) {
  try {
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ScholarshipBlogPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<AdminScholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scholarshipId = Number(params.id);

  useEffect(() => {
    let mounted = true;

    if (!scholarshipId || Number.isNaN(scholarshipId)) {
      setError('Invalid scholarship id');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchScholarshipById(scholarshipId)
      .then((row) => {
        if (!mounted) return;
        setItem(row);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load scholarship details');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [scholarshipId]);

  const links = useMemo(() => {
    if (!item?.links) return [];
    return item.links
      .split(',')
      .map((link) => link.trim())
      .filter(Boolean)
      .map((link) => (link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`));
  }, [item?.links]);

  const summaryPoints = useMemo(
    () => [
      { label: 'Country', value: item?.countryName || 'Not available', icon: <PublicRounded sx={{ fontSize: 18 }} /> },
      { label: 'Duration', value: item?.duration || 'Not specified', icon: <AccessTimeRounded sx={{ fontSize: 18 }} /> },
      { label: 'Deadline', value: formatDeadline(item?.deadline), icon: <CalendarMonthRounded sx={{ fontSize: 18 }} /> }
    ],
    [item]
  );

  return (
    <Box sx={{ display: 'grid', gap: 2.25 }}>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Typography variant="body2" sx={{ color: '#64748b' }}>
        {`Home / Scholoarships / ${loading ? '...' : item?.countryName || '-'} / ${loading ? '...' : item?.name || '-'}`}
      </Typography>

      <Card sx={{ borderRadius: 1, border: '1px solid #d9e2ec', overflow: 'hidden' }}>
        <Box
          sx={{
            px: { xs: 2.5, md: 4 },
            py: { xs: 3.5, md: 4.5 },
            background:
              'radial-gradient(32rem 18rem at 0% 0%, rgba(56,189,248,0.14), transparent 68%), linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #334155 100%)'
          }}
        >
          {loading ? (
            <Skeleton height={58} width="72%" sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{ color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: { xs: 1.16, md: 1.08 } }}
            >
              {item?.name || 'Scholarship Details'}
            </Typography>
          )}

          <Typography variant="body1" sx={{ mt: 1.2, color: '#cbd5e1', maxWidth: 900 }}>
            Explore complete scholarship information, official references and decision timeline in one place.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            {summaryPoints.map((point) => (
              <Chip
                key={point.label}
                icon={point.icon}
                label={loading ? 'Loading...' : `${point.label}: ${point.value}`}
                variant="outlined"
                sx={{ color: '#e2e8f0', borderColor: 'rgba(226,232,240,0.35)', bgcolor: 'rgba(15,23,42,0.22)' }}
              />
            ))}
          </Stack>
        </Box>
      </Card>

      <Box sx={{ display: 'grid', gap: 2.25, gridTemplateColumns: { xs: '1fr', lg: '1.35fr 0.65fr' } }}>
        <Card sx={{ borderRadius: 1, border: '1px solid #d9e2ec' }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <DescriptionRounded sx={{ color: '#334155', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={800}>Scholarship Overview</Typography>
            </Stack>
            <Divider sx={{ my: 1.4 }} />
            {loading ? (
              <Stack spacing={1}>
                <Skeleton height={22} width="100%" />
                <Skeleton height={22} width="100%" />
                <Skeleton height={22} width="90%" />
                <Skeleton height={22} width="78%" />
              </Stack>
            ) : (
              <Typography variant="body1" sx={{ color: '#334155', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {item?.description || 'No description provided for this scholarship yet.'}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Stack spacing={2.25}>
          <Card sx={{ borderRadius: 1, border: '1px solid #d9e2ec' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.6 } }}>
              <Typography variant="h6" fontWeight={800}>Quick Facts</Typography>
              <Divider sx={{ my: 1.2 }} />
              <Stack spacing={1.15}>
                {summaryPoints.map((point) => (
                  <Box key={`fact-${point.label}`} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1, alignItems: 'start' }}>
                    <Box sx={{ color: '#0f172a', mt: 0.25 }}>{point.icon}</Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                        {point.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                        {loading ? 'Loading...' : point.value}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 1, border: '1px solid #d9e2ec' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.6 } }}>
              <Typography variant="h6" fontWeight={800}>Official References</Typography>
              <Divider sx={{ my: 1.2 }} />
              <Stack spacing={1}>
                {loading ? (
                  <>
                    <Skeleton height={30} width="100%" />
                    <Skeleton height={30} width="84%" />
                  </>
                ) : links.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No official links available.
                  </Typography>
                ) : (
                  links.map((link, index) => (
                    <Link
                      key={`${link}-${index}`}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      underline="none"
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 1,
                        px: 1.2,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#0369a1',
                        '&:hover': { bgcolor: '#f8fafc' }
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <LanguageRounded sx={{ fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getDomain(link)}
                        </Typography>
                      </Stack>
                      <ArrowOutwardRounded sx={{ fontSize: 16 }} />
                    </Link>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button variant="outlined" component={RouterLink} to="/" sx={{ borderRadius: 1, minWidth: 140 }}>
          Back Home
        </Button>
        <Button
          variant="contained"
          sx={{ borderRadius: 1, minWidth: 180 }}
          onClick={() => navigate(`/find-course?country=${item?.countryId || ''}`)}
          disabled={!item?.countryId}
        >
          Explore Programs
        </Button>
      </Stack>
    </Box>
  );
}
