import React, { useState } from 'react'
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
} from '@mui/material'
import {
  PlayArrow,
  Album,
  MonetizationOn,
  CalendarToday,
  MusicNote,
} from '@mui/icons-material'
import { releases, calculateRoyaltyShare } from '../data/releases'
import testImage from '../assets/images/academico.png'

// Add this temporarily to check if image loads
console.log('Test image path:', testImage)

const ReleasesGrid = ({ onStreamUpdate }) => {
  const [selectedRelease, setSelectedRelease] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleReleaseClick = (release) => {
    setSelectedRelease(release)
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
  }

  const handleStreamSubmit = (release) => {
    // Calculate royalties based on a mock stream count (this would come from real data)
    const mockStreamCount = Math.floor(Math.random() * 1000) + 100
    const royalties = calculateRoyaltyShare(mockStreamCount)

    // Update the parent component with new stream data
    onStreamUpdate({
      store_name: 'Spotify', // This would be dynamic in production
      stream_count: mockStreamCount,
      earnings: royalties.totalEarnings,
      period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
      period_end: new Date(),
      video_proof_url: `https://example.com/proof/${release.id}`, // This would be real proof in production
    })

    handleClose()
  }

  // Add SoundCloud player handling
  const handlePlayTrack = (track) => {
    if (track.soundCloudUrl) {
      window.open(track.soundCloudUrl, '_blank')
    }
  }

  return (
    <>
      <Grid container spacing={3}>
        {releases.map((release) => (
          <Grid item xs={12} sm={6} md={4} key={release.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.2s ease-in-out',
                },
              }}
              onClick={() => handleReleaseClick(release)}
            >
              <CardMedia
                component="img"
                height="200"
                image={release.artwork}
                alt={release.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {release.title}
                </Typography>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <MusicNote sx={{ mr: 0.5 }} fontSize="small" />
                    {release.tracks.length} tracks
                  </Typography>
                  <IconButton size="small" color="primary">
                    <PlayArrow />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={isDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        {selectedRelease && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Album sx={{ mr: 1 }} />
                {selectedRelease.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box mb={2}>
                <img
                  src={selectedRelease.artwork}
                  alt={selectedRelease.title}
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
              </Box>

              <Box mb={2} display="flex" gap={1}>
                <Chip
                  icon={<CalendarToday />}
                  label={new Date(
                    selectedRelease.releaseDate,
                  ).toLocaleDateString()}
                />
                <Chip
                  icon={<MusicNote />}
                  label={`${selectedRelease.tracks.length} tracks`}
                />
              </Box>

              <Typography variant="h6" gutterBottom>
                Tracks
              </Typography>
              <List>
                {selectedRelease.tracks.map((track, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={track.title}
                      secondary={track.duration}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handlePlayTrack(track)}
                    >
                      <PlayArrow />
                    </IconButton>
                  </ListItem>
                ))}
              </List>

              <Box mt={2} display="flex" justifyContent="space-between">
                <Button variant="outlined" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<MonetizationOn />}
                  onClick={() => handleStreamSubmit(selectedRelease)}
                >
                  Submit Stream Data
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  )
}

export default ReleasesGrid
