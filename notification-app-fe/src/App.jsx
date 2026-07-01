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
  Pagination,
  Drawer,
  Divider,
  LinearProgress,
  Skeleton,
  InputAdornment,
  Slider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  DoneAll as DoneAllIcon,
  AddAlert as AddAlertIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Launch as LaunchIcon,
  TrendingUp as TrendingUpIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  EventNote as EventNoteIcon,
  VolumeUp as VolumeUpIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification
} from './services/api';

// Premium cosmic dark theme with high contrast primary/secondary gradients
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00f2fe', // Electric Cyan
    },
    secondary: {
      main: '#9d4edd', // Vibrant Neon Purple
    },
    background: {
      default: '#0a0e1a', // Cosmic Midnight
      paper: 'rgba(16, 24, 48, 0.8)' // Frosted Glass
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8'
    }
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '0.05em'
    },
    h6: {
      fontWeight: 700
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 10px 40px 0 rgba(0, 0, 0, 0.45)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(20, 30, 60, 0.4)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.01)',
            boxShadow: '0 20px 30px rgba(0, 242, 254, 0.12)',
            borderColor: 'rgba(0, 242, 254, 0.25)'
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

  // Filters, Search & Pagination States
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  // WebSockets State
  const [socketConnected, setSocketConnected] = useState(false);

  // Metrics states
  const [stats, setStats] = useState({ placement: 0, result: 0, event: 0 });

  // Detail Drawer State
  const [selectedItem, setSelectedItem] = useState(null);

  // Sound effects status
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin Announcement Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('Placement');
  const [newPriority, setNewPriority] = useState(50); // Slider: 0=Low, 50=Medium, 75=High, 100=Critical

  // Live Toast Snackbars
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);

  // Synthesize soft high-frequency bubble notification sound
  const playSoundAlert = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, context.currentTime); // High pitch A note
      osc.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.15); // Slide up
      
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.start();
      osc.stop(context.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  // 1. Fetch data from backend
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications({
        limit,
        page,
        type: category || undefined
      });
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
        setTotalItems(data.data.totalItems || 0);

        // Calculate analytics stats dynamically
        const placementCount = (data.data.notifications || []).filter(n => n.type === 'Placement').length;
        const resultCount = (data.data.notifications || []).filter(n => n.type === 'Result').length;
        const eventCount = (data.data.notifications || []).filter(n => n.type === 'Event').length;
        setStats({ placement: placementCount, result: resultCount, event: eventCount });
      }
    } catch (err) {
      console.error(err);
      setError('Could not establish secure data connection to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [category, limit, page]);

  // 2. Initialize WebSockets connections
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

    socketRef.current.on('new-notification', (newNotification) => {
      playSoundAlert();
      setToastMessage(newNotification);
      setToastOpen(true);

      setNotifications(prev => {
        const merged = [newNotification, ...prev];
        const weightMap = { placement: 3, result: 2, event: 1 };
        merged.sort((a, b) => {
          const wA = weightMap[a.type.toLowerCase()] || 0;
          const wB = weightMap[b.type.toLowerCase()] || 0;
          if (wB !== wA) return wB - wA;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        return merged.slice(0, limit);
      });

      setUnreadCount(prev => prev + 1);
      setTotalItems(prev => prev + 1);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [limit, soundEnabled]);

  // 3. Mark alert as Read
  const handleMarkAsRead = async (id) => {
    try {
      const resp = await markNotificationAsRead(id);
      if (resp.success) {
        setNotifications(prev =>
          prev.map(item => (item._id === id ? { ...item, isRead: true } : item))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (selectedItem && selectedItem._id === id) {
          setSelectedItem(prev => ({ ...prev, isRead: true }));
        }
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  // 4. Mark All as Read
  const handleMarkAllRead = async () => {
    try {
      const resp = await markAllNotificationsAsRead();
      if (resp.success) {
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
        if (selectedItem) {
          setSelectedItem(prev => ({ ...prev, isRead: true }));
        }
      }
    } catch (err) {
      console.error('Bulk read error:', err);
    }
  };

  // 5. Submit Admin Alert Creation
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    let priorityLabel = 'Medium';
    if (newPriority <= 25) priorityLabel = 'Low';
    else if (newPriority <= 50) priorityLabel = 'Medium';
    else if (newPriority <= 75) priorityLabel = 'High';
    else priorityLabel = 'Critical';

    try {
      const resp = await createNotification({
        title: newTitle,
        message: newMessage,
        type: newType,
        priority: priorityLabel
      });
      if (resp.success) {
        setOpenDialog(false);
        setNewTitle('');
        setNewMessage('');
        setNewPriority(50);
        loadData();
      }
    } catch (err) {
      console.error('Publish error:', err);
    }
  };

  // Colors & styles helper
  const getCategoryColor = (type) => {
    switch (type.toLowerCase()) {
      case 'placement':
        return '#00f2fe'; // Neon Electric Blue
      case 'result':
        return '#00e676'; // Emerald green
      case 'event':
        return '#ff9100'; // Hot amber
      default:
        return '#94a3b8';
    }
  };

  // Live filter keyword check
  const filteredNotifications = notifications.filter(item => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      item.message.toLowerCase().includes(term)
    );
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', py: 4, px: { xs: 1, sm: 3 } }}>
        <Container maxWidth="lg">
          
          {/* 🌟 Navigation Bar */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: '20px',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: 2,
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.7) 0%, rgba(10, 14, 26, 0.8) 100%)'
            }}
          >
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.85rem',
                    height: 22,
                    minWidth: 22,
                    borderRadius: 11,
                    boxShadow: '0 0 10px rgba(211, 47, 47, 0.8)'
                  }
                }}
              >
                <NotificationsIcon sx={{ fontSize: 36, color: 'primary.main' }} />
              </Badge>
              <Box>
                <Typography variant="h4" sx={{ fontSize: { xs: '1.65rem', sm: '2.125rem' }, background: 'linear-gradient(90deg, #00f2fe 0%, #9d4edd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>
                  CAMPUS PULSE
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real-Time Academic Alerts & Priority Inbox
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'center', md: 'flex-end' }, flexWrap: 'wrap', gap: 1 }}>
              <Tooltip title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}>
                <IconButton onClick={() => setSoundEnabled(!soundEnabled)} color="secondary">
                  <VolumeUpIcon sx={{ opacity: soundEnabled ? 1 : 0.4 }} />
                </IconButton>
              </Tooltip>
              <Chip
                icon={socketConnected ? <WifiIcon color="success" /> : <WifiOffIcon color="error" />}
                label={socketConnected ? 'Connected' : 'Offline'}
                color={socketConnected ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
              <IconButton onClick={loadData} color="primary" disabled={loading}>
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddAlertIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{ borderRadius: '10px' }}
              >
                Publish Alert
              </Button>
            </Stack>
          </Paper>

          {/* 🌟 Analytics KPI Widgets */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', background: 'rgba(0, 242, 254, 0.04)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Placements</Typography>
                  <TrendingUpIcon sx={{ color: '#00f2fe' }} />
                </Stack>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 800 }}>{stats.placement}</Typography>
                <LinearProgress variant="determinate" value={Math.min((stats.placement / 10) * 100, 100)} color="primary" sx={{ height: 6, borderRadius: 3 }} />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', background: 'rgba(0, 230, 118, 0.04)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Exam Results</Typography>
                  <AssignmentTurnedInIcon sx={{ color: '#00e676' }} />
                </Stack>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 800 }}>{stats.result}</Typography>
                <LinearProgress variant="determinate" value={Math.min((stats.result / 10) * 100, 100)} color="success" sx={{ height: 6, borderRadius: 3 }} />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2.5, borderRadius: '16px', background: 'rgba(255, 145, 0, 0.04)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Events</Typography>
                  <EventNoteIcon sx={{ color: '#ff9100' }} />
                </Stack>
                <Typography variant="h4" sx={{ my: 1, fontWeight: 800 }}>{stats.event}</Typography>
                <LinearProgress variant="determinate" value={Math.min((stats.event / 10) * 100, 100)} color="warning" sx={{ height: 6, borderRadius: 3 }} />
              </Paper>
            </Grid>
          </Grid>

          {/* Main Dashboard Layout */}
          <Grid container spacing={4}>
            
            {/* 🌟 Left control panel */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                  Feed Settings
                </Typography>

                <Stack spacing={3.5}>
                  {/* Category Type Selector */}
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
                    <InputLabel id="limit-select-label">Display Limit</InputLabel>
                    <Select
                      labelId="limit-select-label"
                      value={limit}
                      label="Display Limit"
                      onChange={(e) => {
                        setLimit(e.target.value);
                        setPage(1);
                      }}
                    >
                      <MenuItem value={5}>Top 5 Alerts</MenuItem>
                      <MenuItem value={10}>Top 10 Alerts</MenuItem>
                      <MenuItem value={25}>Top 25 Alerts</MenuItem>
                      <MenuItem value={50}>Top 50 Alerts</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    startIcon={<DoneAllIcon />}
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    sx={{ borderRadius: '10px', py: 1 }}
                  >
                    Mark All as Read
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            {/* 🌟 Right main priority feed */}
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                
                {/* Search Text Input */}
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Search notifications by title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '10px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px'
                    }
                  }}
                />

                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Priority Inbox feed</span>
                  <Typography variant="body2" color="text.secondary">
                    Displaying {filteredNotifications.length} items
                  </Typography>
                </Typography>

                {loading && filteredNotifications.length === 0 ? (
                  <Stack spacing={2}>
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
                  </Stack>
                ) : filteredNotifications.length === 0 ? (
                  <Paper sx={{ p: 5, textAlign: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <Typography variant="body1" color="text.secondary">
                      No matching notifications found in this feed view.
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    {filteredNotifications.map((item) => {
                      const color = getCategoryColor(item.type);
                      return (
                        <Card
                          key={item._id}
                          variant="outlined"
                          onClick={() => setSelectedItem(item)} // Clicking slides open details Drawer
                          sx={{
                            borderLeft: `5px solid ${color}`,
                            opacity: item.isRead ? 0.6 : 1,
                            cursor: 'pointer',
                            borderColor: item.isRead ? 'rgba(255,255,255,0.08)' : color,
                            background: item.isRead ? 'rgba(16, 24, 48, 0.25)' : 'rgba(20, 30, 60, 0.45)'
                          }}
                        >
                          <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                  <Chip
                                    label={item.type}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${color}18`,
                                      color,
                                      fontWeight: 800,
                                      fontSize: '0.75rem',
                                      border: `1px solid ${color}44`
                                    }}
                                  />
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

                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: item.isRead ? 'text.secondary' : 'text.primary' }}>
                                  {item.title}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {item.message}
                                </Typography>
                              </Box>

                              {/* Mark single as read */}
                              {!item.isRead && (
                                <Box
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering details Drawer
                                    handleMarkAsRead(item._id);
                                  }}
                                  sx={{ flexShrink: 0 }}
                                >
                                  <Tooltip title="Mark read">
                                    <IconButton color="primary">
                                      <CheckCircleIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}

                {/* Pagination count */}
                {totalItems > limit && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={Math.ceil(totalItems / limit)}
                      page={page}
                      onChange={(e, v) => setPage(v)}
                      color="primary"
                    />
                  </Box>
                )}

              </Stack>
            </Grid>
          </Grid>

          {/* 🌟 Detail Drawer (Slide-Out Side Panel) */}
          <Drawer
            anchor="right"
            open={Boolean(selectedItem)}
            onClose={() => setSelectedItem(null)}
            PaperProps={{
              sx: { width: { xs: '100%', sm: 420 }, p: 4, background: '#0e1424' }
            }}
          >
            {selectedItem && (
              <Stack spacing={3}>
                <Box>
                  <Chip
                    label={selectedItem.type}
                    sx={{
                      backgroundColor: `${getCategoryColor(selectedItem.type)}22`,
                      color: getCategoryColor(selectedItem.type),
                      fontWeight: 800,
                      mb: 2
                    }}
                  />
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                    {selectedItem.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Received: {new Date(selectedItem.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                
                <Divider />

                <Box sx={{ py: 2 }}>
                  <Typography variant="body1" color="text.primary" sx={{ lineHeight: 1.8 }}>
                    {selectedItem.message}
                  </Typography>
                </Box>

                <Divider />

                <Stack spacing={2} direction="row">
                  {/* Dynamic Action Buttons */}
                  {selectedItem.type === 'Placement' && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="primary"
                      endIcon={<LaunchIcon />}
                      onClick={() => alert('Redirecting to Placement Application Portal...')}
                    >
                      Apply Now
                    </Button>
                  )}
                  {selectedItem.type === 'Result' && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="success"
                      endIcon={<LaunchIcon />}
                      onClick={() => alert('Loading Exam Marksheets PDF...')}
                    >
                      View Report
                    </Button>
                  )}
                  {selectedItem.type === 'Event' && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="warning"
                      endIcon={<LaunchIcon />}
                      onClick={() => alert('Registering Seat Booking...')}
                    >
                      Register Now
                    </Button>
                  )}

                  {!selectedItem.isRead && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleMarkAsRead(selectedItem._id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
          </Drawer>

          {/* dialog to publish alert */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleCreateAnnouncement}>
              <DialogTitle>Publish New Alert</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={3.5} sx={{ mt: 1 }}>
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

                  {/* Priority slider */}
                  <Box>
                    <Typography id="priority-slider" gutterBottom variant="body2" color="text.secondary">
                      Priority Level Previews
                    </Typography>
                    <Slider
                      value={newPriority}
                      onChange={(e, v) => setNewPriority(v)}
                      aria-labelledby="priority-slider"
                      step={25}
                      marks={[
                        { value: 0, label: 'Low' },
                        { value: 50, label: 'Medium' },
                        { value: 75, label: 'High' },
                        { value: 100, label: 'Critical' }
                      ]}
                      valueLabelDisplay="off"
                    />
                  </Box>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  Broadcast Announcement
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
                    ⚡ Real-time Alert: {toastMessage.type}
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

      {/* Global CSS animations style rules */}
      <style>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.45);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(211, 47, 47, 0);
          }
        }
      `}</style>
    </ThemeProvider>
  );
}
