import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Badge,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  DoneAll as DoneAllIcon,
  AddAlert as AddAlertIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification
} from './services/api';

// Create a custom dark premium theme matching Stage 6 styling
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f2fe', // Electric cyan
    },
    secondary: {
      main: '#4facfe', // Ice blue
    },
    background: {
      default: '#080d1a', // Deep cosmic midnight blue
      paper: 'rgba(16, 24, 48, 0.75)' // Glassmorphism dark background
    },
    text: {
      primary: '#f0f4f8',
      secondary: '#90a4ae'
    }
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.05em'
    },
    h6: {
      fontWeight: 600
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          background: 'rgba(22, 34, 64, 0.5)',
          borderRadius: '12px',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 24px rgba(0, 242, 254, 0.15)',
            borderColor: 'rgba(0, 242, 254, 0.3)'
          }
        }
      }
    }
  }
});

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Pagination States
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // WebSockets State
  const [socketConnected, setSocketConnected] = useState(false);

  // Admin New Announcement Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('Placement');

  // Real-time toast states
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);

  // 1. Initialize API Fetch
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass standard expanded query parameters to backend
      const data = await fetchNotifications({
        limit,
        page,
        type: category || undefined
      });
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
        setTotalItems(data.data.totalItems || 0);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load notifications from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [category, limit, page]);

  // 2. Setup WebSockets connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Handle incoming real-time updates broadcasted by backend
    socketRef.current.on('new-notification', (newNotification) => {
      // Trigger toast message
      setToastMessage(newNotification);
      setToastOpen(true);

      // Prepend to current notification list
      setNotifications(prev => {
        const merged = [newNotification, ...prev];
        // Sort the list applying the priority rules (Placement > Result > Event)
        const weightMap = { placement: 3, result: 2, event: 1 };
        merged.sort((a, b) => {
          const wA = weightMap[a.type.toLowerCase()] || 0;
          const wB = weightMap[b.type.toLowerCase()] || 0;
          if (wB !== wA) return wB - wA;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        return merged.slice(0, limit);
      });

      // Increment badge count
      setUnreadCount(prev => prev + 1);
      setTotalItems(prev => prev + 1);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [limit]);

  // 3. Mark Single as Read
  const handleMarkAsRead = async (id) => {
    try {
      const resp = await markNotificationAsRead(id);
      if (resp.success) {
        setNotifications(prev =>
          prev.map(item => (item._id === id ? { ...item, isRead: true } : item))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // 4. Mark All as Read
  const handleMarkAllRead = async () => {
    try {
      const resp = await markAllNotificationsAsRead();
      if (resp.success) {
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // 5. Submit Admin Alert Creation
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    try {
      const resp = await createNotification({
        title: newTitle,
        message: newMessage,
        type: newType
      });
      if (resp.success) {
        setOpenDialog(false);
        setNewTitle('');
        setNewMessage('');
        // Trigger a fresh reload to get accurate states
        loadData();
      }
    } catch (err) {
      console.error('Failed to publish notification:', err);
    }
  };

  // Custom styling helper for Category borders/chips
  const getCategoryColor = (type) => {
    switch (type.toLowerCase()) {
      case 'placement':
        return '#2979ff'; // Cobalt Blue
      case 'result':
        return '#00e676'; // Emerald Green
      case 'event':
        return '#ff9100'; // Amber Orange
      default:
        return '#90a4ae';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', py: 4, px: { xs: 1, sm: 3 } }}>
        <Container maxWidth={false} sx={{ maxWidth: '100%', px: { xs: 1, md: 5 } }}>
          {/* Dashboard Header Bar */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(16, 24, 48, 0.9) 0%, rgba(8, 13, 26, 0.9) 100%)'
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.85rem',
                    height: 22,
                    minWidth: 22,
                    borderRadius: 11
                  }
                }}
              >
                <NotificationsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              </Badge>
              <Box>
                <Typography variant="h5" sx={{ background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                  CAMPUS PULSE
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Priority Inbox Dashboard
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              {/* Live WebSockets Status Indicator */}
              <Chip
                icon={socketConnected ? <WifiIcon color="success" /> : <WifiOffIcon color="error" />}
                label={socketConnected ? 'Real-Time Connected' : 'Offline Mode'}
                color={socketConnected ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
              <IconButton onClick={loadData} color="primary" disabled={loading}>
                <RefreshIcon />
              </IconButton>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddAlertIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Publish Alert
              </Button>
            </Stack>
          </Paper>

          {/* Main Layout Grid */}
          <Grid container spacing={4}>
            {/* Control Sidebar Panel */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: '16px', height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                  Filter Notifications
                </Typography>

                <Stack spacing={3}>
                  {/* Category Type Filter */}
                  <FormControl fullWidth size="small">
                    <InputLabel id="category-filter-label">Category</InputLabel>
                    <Select
                      labelId="category-filter-label"
                      value={category}
                      label="Category"
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value=""><em>All Categories</em></MenuItem>
                      <MenuItem value="Placement">Placement Updates</MenuItem>
                      <MenuItem value="Result">Exam Results</MenuItem>
                      <MenuItem value="Event">Campus Events</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Limit Query Selector */}
                  <FormControl fullWidth size="small">
                    <InputLabel id="limit-select-label">Notifications to Display</InputLabel>
                    <Select
                      labelId="limit-select-label"
                      value={limit}
                      label="Notifications to Display"
                      onChange={(e) => {
                        setLimit(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value={5}>Top 5 Notifications</MenuItem>
                      <MenuItem value={10}>Top 10 Notifications</MenuItem>
                      <MenuItem value={25}>Top 25 Notifications</MenuItem>
                      <MenuItem value={50}>Top 50 Notifications</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ pt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      startIcon={<DoneAllIcon />}
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                    >
                      Mark All as Read
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Main Notifications Stack */}
            <Grid item xs={12} md={8}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                  {error}
                </Alert>
              )}

              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Priority Feed</span>
                <Typography variant="body2" color="text.secondary">
                  Showing {notifications.length} of {totalItems} items
                </Typography>
              </Typography>

              {loading && notifications.length === 0 ? (
                <Typography color="text.secondary">Loading notifications...</Typography>
              ) : notifications.length === 0 ? (
                <Paper sx={{ p: 4, text: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <Typography variant="body1" align="center" color="text.secondary">
                    No active notifications matching selected filter criteria.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {notifications.map((item) => {
                    const borderCol = getCategoryColor(item.type);
                    return (
                      <Card
                        key={item._id}
                        variant="outlined"
                        sx={{
                          borderLeft: `5px solid ${borderCol}`,
                          opacity: item.isRead ? 0.65 : 1,
                          borderColor: item.isRead ? 'rgba(255, 255, 255, 0.08)' : borderCol,
                          background: item.isRead
                            ? 'rgba(16, 24, 48, 0.3)'
                            : 'rgba(22, 34, 64, 0.5)'
                        }}
                      >
                        <CardContent sx={{ position: 'relative', pr: 8, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                            <Chip
                              label={item.type}
                              size="small"
                              sx={{
                                backgroundColor: `${borderCol}22`,
                                color: borderCol,
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                border: `1px solid ${borderCol}44`
                              }}
                            />

                            {/* Distinguish unread state with dynamic glowing text indicator */}
                            {!item.isRead && (
                              <Chip
                                label="New"
                                color="error"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  animation: 'pulse-glow 1.5s infinite alternate'
                                }}
                              />
                            )}

                            <Typography variant="caption" color="text.secondary">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.createdAt).toLocaleDateString()}
                            </Typography>
                          </Stack>

                          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 700, mb: 0.5, color: item.isRead ? 'text.secondary' : 'text.primary' }}>
                            {item.title}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            {item.message}
                          </Typography>

                          {/* Quick single-click read tracker action */}
                          {!item.isRead && (
                            <Box sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                              <Tooltip title="Mark as read">
                                <IconButton
                                  onClick={() => handleMarkAsRead(item._id)}
                                  color="primary"
                                  sx={{ '&:hover': { color: 'success.main' } }}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}

              {/* Pagination Controls */}
              {totalItems > limit && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={Math.ceil(totalItems / limit)}
                    page={page}
                    onChange={(e, v) => setPage(v)}
                    color="primary"
                  />
                </Box>
              )}
            </Grid>
          </Grid>

          {/* Dialog to Publish Announcement */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleCreateAnnouncement}>
              <DialogTitle>Publish New Alert</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                  <TextField
                    label="Announcement Title"
                    required
                    fullWidth
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <TextField
                    label="Description Details"
                    required
                    fullWidth
                    multiline
                    rows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <FormControl fullWidth>
                    <InputLabel id="new-category-label">Category</InputLabel>
                    <Select
                      labelId="new-category-label"
                      value={newType}
                      label="Category"
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <MenuItem value="Placement">Placement Update</MenuItem>
                      <MenuItem value="Result">Exam Result</MenuItem>
                      <MenuItem value="Event">Campus Event</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  Broadcast Alert
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Sliding Toast Snackbar notifications for live WebSocket updates */}
          <Snackbar
            open={toastOpen}
            autoHideDuration={6000}
            onClose={() => setToastOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setToastOpen(false)}
              severity="info"
              variant="filled"
              sx={{ width: '100%', borderRadius: '12px', borderLeft: toastMessage ? `5px solid ${getCategoryColor(toastMessage.type)}` : 'none' }}
            >
              {toastMessage && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    ⚡ Live Alert: {toastMessage.type}
                  </Typography>
                  <Typography variant="body2">
                    {toastMessage.message}
                  </Typography>
                </Box>
              )}
            </Alert>
          </Snackbar>
        </Container>
      </Box>

      {/* Global pulse glow animations inside styles */}
      <style>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(211, 47, 47, 0);
          }
        }
      `}</style>
    </ThemeProvider>
  );
}
