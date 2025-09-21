// Application Error Boundary
// Provides graceful fallback for all application errors

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Check if it's specifically the useUndo hook error
      if (this.state.error?.message === 'useUndo must be used within an UndoProvider') {
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              <Typography variant="h6" gutterBottom>
                Configuration Error
              </Typography>
              <Typography variant="body2">
                The undo functionality requires proper initialization. Please refresh the page.
              </Typography>
            </Alert>
          </Box>
        );
      }

      // For other errors, show a generic fallback
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2">
              An unexpected error occurred. Please refresh the page to continue.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}