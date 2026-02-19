import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import LockOutlined from '@mui/icons-material/LockOutlined';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../lib/api';
import { useAdminAuth } from '../../layouts/AdminAuthContext';
import './admin.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setAdminUser } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length > 0 && !loading;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    try {
      const user = await adminLogin({ email: email.trim(), password });
      setAdminUser(user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="admin-login">
      <Box className="admin-login__showcase">
        <span className="admin-login__orb admin-login__orb--1" />
        <span className="admin-login__orb admin-login__orb--2" />

        <Chip icon={<AutoAwesomeRounded />} label="Theme-inspired control center" sx={{ bgcolor: 'rgba(14, 165, 233, 0.2)', color: '#e0f2fe' }} />
        <Typography className="admin-login__title" variant="h2" fontWeight={900}>
          Manage applications and country programs in one admin cockpit.
        </Typography>
        <Typography className="admin-login__lead" variant="body1">
          Review incoming applications, switch across countries, and edit program details with a modern dashboard workflow.
        </Typography>

        <Box className="admin-login__stats">
          <Box className="admin-login__stat">
            <b>Applications</b>
            <Typography variant="body2" color="inherit">
              Instant visibility on submitted student applications.
            </Typography>
          </Box>
          <Box className="admin-login__stat">
            <b>Countries</b>
            <Typography variant="body2" color="inherit">
              Dedicated country-wise program management.
            </Typography>
          </Box>
          <Box className="admin-login__stat">
            <b>Program Editor</b>
            <Typography variant="body2" color="inherit">
              Update tuition, intakes, deadlines, and core details quickly.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box className="admin-login__form-wrap">
        <Paper className="admin-login__glass" elevation={0}>
          <Stack spacing={2.5} sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ bgcolor: '#e0f2fe', borderRadius: 3, p: 1 }}>
                <LockOutlined sx={{ color: '#0369a1' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Admin Login
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in with your admin email and password.
                </Typography>
              </Box>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Box component="form" onSubmit={onSubmit} noValidate>
              <Stack spacing={1.8}>
                <TextField
                  label="Admin email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  fullWidth
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!canSubmit}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LoginRounded />}
                >
                  {loading ? 'Signing in...' : 'Open Admin Panel'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
