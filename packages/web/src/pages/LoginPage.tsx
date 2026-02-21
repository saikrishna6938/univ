import LockOutlined from '@mui/icons-material/LockOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../layouts/AuthContext';

type Step = 'request' | 'verify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = useMemo(() => searchParams.get('redirect') || '/student/dashboard', [searchParams]);

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate(redirect, { replace: true });
    }
  }, [user, navigate, redirect]);

  async function sendOtp() {
    setError('');
    setMessage('');
    if (!email.trim() && !phone.trim()) {
      setError('Enter email or phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setStep('verify');
      setMessage('OTP sent successfully. Enter the code to continue.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setMessage('');
    if (!otp.trim()) {
      setError('Enter OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          code: otp.trim()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const authUser = await res.json();
      setUser({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        city: authUser.city
      });
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ py: { xs: 2, md: 5 } }}>
      <Paper
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid #dbe2ea',
          minHeight: { xs: 460, md: 560 }
        }}
      >
        <Box sx={{ p: { xs: 3, md: 5 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LockOutlined fontSize="small" sx={{ color: '#334155' }} />
                  <Typography variant="h5" fontWeight={800}>
                    {step === 'request' ? 'Sign In' : 'Verify OTP'}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {step === 'request'
                    ? 'Use email or phone to receive one-time OTP.'
                    : `Enter OTP sent to ${email || phone}.`}
                </Typography>
                <Divider />

                {step === 'request' ? (
                  <>
                    <TextField
                      size="small"
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                    />
                    <Typography variant="caption" textAlign="center" color="text.secondary">
                      OR
                    </Typography>
                    <TextField
                      size="small"
                      label="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      fullWidth
                    />
                    <Button variant="contained" onClick={sendOtp} disabled={loading}>
                      {loading ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <TextField
                      size="small"
                      label="OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputProps={{ maxLength: 6 }}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => setStep('request')} disabled={loading}>
                        Back
                      </Button>
                      <Button variant="contained" onClick={verifyOtp} disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify & Login'}
                      </Button>
                    </Stack>
                  </>
                )}

                {message ? <Alert severity="success">{message}</Alert> : null}
                {error ? <Alert severity="error">{error}</Alert> : null}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6,
            background: 'linear-gradient(140deg, #0f172a 0%, #1e293b 48%, #334155 100%)'
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
            <svg viewBox="0 0 960 540" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
              <g fill="none" stroke="white" strokeWidth="90">
                <circle r="234" cx="196" cy="23" />
                <circle r="234" cx="790" cy="491" />
              </g>
            </svg>
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
            <Typography sx={{ color: '#f8fafc', fontSize: 38, fontWeight: 900, lineHeight: 1.1 }}>
              Welcome to Gradwalk
            </Typography>
            <Typography sx={{ mt: 2, color: '#cbd5e1', fontSize: 15 }}>
              Track your applications, documents and student journey in one place with secure OTP login.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
