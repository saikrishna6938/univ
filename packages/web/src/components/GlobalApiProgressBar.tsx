import { Box, LinearProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { subscribeToApiProgress } from '../lib/apiProgress';

export default function GlobalApiProgressBar() {
  const [activeCount, setActiveCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeToApiProgress(setActiveCount), []);

  useEffect(() => {
    if (activeCount > 0) {
      setVisible(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setVisible(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [activeCount]);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        pointerEvents: 'none'
      }}
    >
      <LinearProgress
        color="info"
        sx={{
          height: 3,
          backgroundColor: 'rgba(14, 165, 233, 0.14)',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)'
          }
        }}
      />
    </Box>
  );
}
