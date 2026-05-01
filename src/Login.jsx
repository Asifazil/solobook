import React, { useState } from 'react';
import {
  Box, Typography, Button, Alert, Container, Fade, Zoom, Paper
} from '@mui/material';
import { useAuth } from './AuthContext';

const Login = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error);
    }
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
        // Premium Dark/Blue Gradient Background
        background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
          zIndex: 0,
        }
      }}
    >
      {/* Animated Background Orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          width: '30vw',
          height: '30vw',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 15s ease-in-out infinite',
          filter: 'blur(60px)',
          zIndex: 1,
          '@keyframes float': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(-50px, 50px)' },
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(118, 75, 162, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatB 20s ease-in-out infinite',
          filter: 'blur(80px)',
          zIndex: 1,
          '@keyframes floatB': {
            '0%, 100%': { transform: 'translate(0, 0)' },
            '50%': { transform: 'translate(50px, -50px)' },
          }
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 10 }}>
        <Zoom in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 5,
              // Glassmorphism
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            {/* Logo */}
            <Box 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'transparent', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223"/>
                <path d="M9 7H15"/>
                <path d="M9 11H15"/>
              </svg>
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 1, letterSpacing: '0.05em' }}>
              SOLO BOOKS
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 5, textAlign: 'center' }}>
              Premium Business Accounting
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                variant="filled" 
                sx={{ 
                  mb: 3, 
                  width: '100%', 
                  borderRadius: 2,
                  bgcolor: 'rgba(211, 47, 47, 0.8)'
                }}
              >
                {error}
              </Alert>
            )}

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
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                }
              }}
              startIcon={
                !loading && (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                )
              }
            >
              {loading ? 'Signing In...' : 'Sign In with Google'}
            </Button>

            <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5 }}>
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