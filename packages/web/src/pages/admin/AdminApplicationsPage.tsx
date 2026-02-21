import { Alert, Box, Chip, Skeleton, TableCell, TableRow, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { AdminApplication } from '../../lib/api';
import { fetchAdminApplications } from '../../lib/api';
import AdminDataTable from '../../components/admin/AdminDataTable';
import './admin.css';

function statusColor(status: AdminApplication['status']): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'accepted') return 'success';
  if (status === 'reviewing') return 'warning';
  if (status === 'rejected') return 'error';
  return 'default';
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadApplications() {
      setLoadingApplications(true);
      try {
        const rows = await fetchAdminApplications();
        if (!mounted) return;
        setApplications(rows);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        if (mounted) setLoadingApplications(false);
      }
    }

    loadApplications();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box className="admin-dashboard">
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box className="admin-panel">
        <Box className="admin-panel__head">
          <Typography variant="h6" fontWeight={800}>
            Applications Manager
          </Typography>
          <Chip label={loadingApplications ? 'Loading...' : `${applications.length} total`} color="info" variant="outlined" />
        </Box>
        <Box className="admin-panel__body">
          <AdminDataTable
            tableMinWidth={900}
            maxBodyHeight={640}
            headerRow={
              <TableRow>
                <TableCell>Applicant</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            }
            bodyRows={
              loadingApplications
                ? Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`app-skeleton-${index}`}>
                      <TableCell colSpan={5}>
                        <Skeleton height={30} />
                      </TableCell>
                    </TableRow>
                  ))
                : applications.map((application) => (
                    <TableRow key={application.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {application.applicantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {application.countryOfResidence || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{application.email}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {application.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{application.programName ?? '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {application.universityName ?? '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={application.status} color={statusColor(application.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(application.createdAt).toLocaleDateString()}</Typography>
                      </TableCell>
                    </TableRow>
                  ))
            }
          />
        </Box>
      </Box>
    </Box>
  );
}
