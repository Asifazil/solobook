import React, { useState } from 'react';
import {
  Box, Typography, Button, Alert, Container, Zoom, Paper,
  Tab, Tabs, TextField, InputAdornment, IconButton, Divider
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from './AuthContext';
import SoloBooksLogo from './SoloBooksLogo';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const glassInput = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.8)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
  '& .MuiInputAdornment-root .MuiIconButton-root': { color: 'rgba(255,255,255,0.6)' },
  mb: 2,
};

const Login = () => {
  const { loginWithGoogle, loginAsStaff } = useAuth();
  const [tab, setTab] = useState('owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Staff fields
  const [businessCode, setBusinessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleTabChange = (_, v) => {
    setTab(v);
    setError('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleStaffLogin = async (e) => {
    e?.preventDefault();
    if (!businessCode.trim()) { setError('Business code is required.'); return; }
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    setError('');
    const result = await loginAsStaff(businessCode, username, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
          zIndex: 0,
        }
      }}
    >
      {/* Animated orbs */}
      <Box sx={{
        position: 'absolute', top: '20%', left: '20%',
        width: '30vw', height: '30vw',
        background: 'radial-gradient(circle, rgba(102,126,234,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 15s ease-in-out infinite',
        filter: 'blur(60px)', zIndex: 1,
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(-50px,50px)' },
        }
      }} />
      <Box sx={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(118,75,162,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'floatB 20s ease-in-out infinite',
        filter: 'blur(80px)', zIndex: 1,
        '@keyframes floatB': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(50px,-50px)' },
        }
      }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 10 }}>
        <Zoom in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 5,
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
            }}
          >
            {/* Logo */}
            <Box sx={{
              mb: 2.5,
              filter: 'drop-shadow(0 8px 24px rgba(79,70,229,0.5))',
            }}>
              <SoloBooksLogo size={72} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', mb: 0.5, letterSpacing: '0.05em' }}>
              SOLO BOOKS
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2.5 }}>
              Premium Business Accounting
            </Typography>

            {/* Tabs */}
            <Box sx={{ width: '100%', mb: 2.5 }}>
              <Tabs
                value={tab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderRadius: 2,
                  minHeight: 40,
                  '& .MuiTab-root': {
                    color: 'rgba(255,255,255,0.5)',
                    minHeight: 40,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&.Mui-selected': { color: 'white' },
                  },
                  '& .MuiTabs-indicator': { backgroundColor: 'rgba(255,255,255,0.8)', height: 2 },
                }}
              >
                <Tab value="owner" label="Owner / Admin" />
                <Tab value="staff" label="Staff / Auditor Login" />
              </Tabs>
            </Box>

            {error && (
              <Alert
                severity="error"
                variant="filled"
                sx={{ mb: 2, width: '100%', borderRadius: 2, bgcolor: 'rgba(211,47,47,0.8)', fontSize: '0.8rem' }}
              >
                {error}
              </Alert>
            )}

            {/* Owner: Google Sign-In */}
            {tab === 'owner' && (
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                fullWidth
                size="large"
                sx={{
                  py: 1.8,
                  bgcolor: 'white',
                  color: '#1B2735',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
                startIcon={!loading && <GoogleIcon />}
              >
                {loading ? 'Signing In…' : 'Sign In with Google'}
              </Button>
            )}

            {/* Staff: Business Code + Username + Password */}
            {tab === 'staff' && (
              <Box component="form" onSubmit={handleStaffLogin} sx={{ width: '100%' }}>
                <TextField
                  label="Business Code"
                  fullWidth
                  value={businessCode}
                  onChange={e => setBusinessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  inputProps={{ maxLength: 6, style: { letterSpacing: 4, fontWeight: 700, fontSize: '1.1rem', color: 'white' } }}
                  placeholder="e.g. ABC123"
                  sx={glassInput}
                />
                <TextField
                  label="Username"
                  fullWidth
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  sx={glassInput}
                />
                <TextField
                  label="Password"
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(v => !v)} edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ ...glassInput, mb: 3 }}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  fullWidth
                  size="large"
                  sx={{
                    py: 1.6,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(102,126,234,0.5)' },
                    '&:active': { transform: 'translateY(0)' },
                    '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  {loading ? 'Signing In…' : 'Sign In as Staff'}
                </Button>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', textAlign: 'center' }}>
                  Get your Business Code and credentials from your employer.
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1, opacity: 0.4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <Typography variant="caption" sx={{ color: 'white', letterSpacing: 1 }}>
                SECURE ACCESS
              </Typography>
            </Box>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default Login;
