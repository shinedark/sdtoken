import React, { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  Button,
  Stack,
  Tooltip,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import axios from 'axios'
import Web3 from 'web3'
import TokenDashboard from './components/TokenDashboard'
import StakingInterface from './components/StakingInterface'
import PriceChart from './components/PriceChart'
import ReleasesGrid from './components/ReleasesGrid'
import { SDTokenABI } from './contracts/abis'
import { connectWeb3 } from './utils/web3'
import { AccountCircle, Logout } from '@mui/icons-material'
import { CONTRACT_ADDRESSES } from './contracts/addresses'

const API_URL = 'http://localhost:8000/api'
const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.SDToken
const ARTIST_ADDRESS = '0xfB91A0Dba31ba4d042886C2A0b3AA23BFb23F196'

function App() {
  const [streams, setStreams] = useState([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [web3, setWeb3] = useState(null)
  const [contract, setContract] = useState(null)
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [metricsKey, setMetricsKey] = useState(0)

  const initializeWeb3 = useCallback(async () => {
    try {
      if (window.ethereum) {
        const { web3: web3Instance, accounts } = await connectWeb3()
        const contractInstance = new web3Instance.eth.Contract(
          SDTokenABI,
          CONTRACT_ADDRESS,
        )

        setWeb3(web3Instance)
        setContract(contractInstance)
        setAccount(accounts[0])
      }
    } catch (err) {
      console.error('Web3 connection error:', err)
      setError('Error connecting to Web3: ' + err.message)
    }
  }, [])

  useEffect(() => {
    if (account === ARTIST_ADDRESS) {
      return
    }

    if (web3 && account) {
      const contractInstance = new web3.eth.Contract(
        SDTokenABI,
        CONTRACT_ADDRESS,
      )
      setContract(contractInstance)
    }
  }, [web3, account])

  const handleAccountsChanged = useCallback((newAccounts) => {
    if (newAccounts.length === 0) {
      // User disconnected
      setAccount(null)
      setContract(null)
      setWeb3(null)
    } else {
      setAccount(newAccounts[0])
    }
  }, [])

  useEffect(() => {
    initializeWeb3()

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [initializeWeb3, handleAccountsChanged])

  const handleConnect = async () => {
    setError(null)
    try {
      await initializeWeb3()
    } catch (err) {
      console.error('Connection error:', err)
      setError('Failed to connect wallet: ' + err.message)
    }
  }

  const handleDisconnect = useCallback(() => {
    setAccount(null)
    setContract(null)
    setWeb3(null)
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [streamsRes, earningsRes] = await Promise.all([
        axios.get(`${API_URL}/streams`),
        axios.get(`${API_URL}/earnings`),
      ])
      setStreams(streamsRes.data.streams)
      setTotalEarnings(earningsRes.data.total_earnings)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Error loading stream data: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreamUpdate = async (streamData) => {
    try {
      await axios.post(`${API_URL}/streams`, streamData)
      fetchData()
    } catch (error) {
      console.error('Error submitting stream data:', error)
    }
  }

  const handleStakingChange = () => {
    setMetricsKey((prev) => prev + 1)
  }

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4,
    )}`
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h3" component="h1">
            SDToken Stream Management
          </Typography>

          {account ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <Tooltip title={account}>
                <Button
                  variant="outlined"
                  startIcon={<AccountCircle />}
                  color="primary"
                >
                  {formatAddress(account)}
                </Button>
              </Tooltip>
              <Tooltip title="Disconnect Wallet">
                <Button
                  variant="outlined"
                  startIcon={<Logout />}
                  color="error"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </Tooltip>
            </Stack>
          ) : (
            <Button
              variant="contained"
              startIcon={<AccountCircle />}
              onClick={handleConnect}
              disabled={!!error}
            >
              Connect Wallet
            </Button>
          )}
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleConnect}>
                Retry Connection
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {web3 && contract && account ? (
          <>
            <TokenDashboard
              key={metricsKey}
              web3={web3}
              contract={contract}
              account={account}
            />
            <PriceChart web3={web3} contract={contract} />
            <StakingInterface
              web3={web3}
              contract={contract}
              account={account}
              onStakingChange={handleStakingChange}
            />
          </>
        ) : (
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" gutterBottom color="text.secondary">
              Connect your wallet to view token metrics and stake
            </Typography>
            <Button
              variant="contained"
              startIcon={<AccountCircle />}
              onClick={handleConnect}
              disabled={!!error}
              sx={{ mt: 2 }}
            >
              Connect Wallet
            </Button>
          </Paper>
        )}

        <Box mt={4}>
          <Typography variant="h4" gutterBottom>
            Music Releases
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" paragraph>
            Browse releases and submit stream data to earn tokens
          </Typography>
          <ReleasesGrid onStreamUpdate={handleStreamUpdate} />
        </Box>

        <Box mt={4}>
          <Typography variant="h4" gutterBottom>
            Recent Streams
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Total Earnings</Typography>
                <Typography variant="h4">
                  ${totalEarnings.toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Total Streams</Typography>
                <Typography variant="h4">
                  {streams.reduce(
                    (acc, stream) => acc + stream.stream_count,
                    0,
                  )}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {isLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : streams.length > 0 ? (
            <Grid container spacing={3}>
              {streams.map((stream, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6">{stream.store_name}</Typography>
                    <Typography>Streams: {stream.stream_count}</Typography>
                    <Typography>
                      Earnings: ${stream.earnings.toFixed(2)}
                    </Typography>
                    <Typography>
                      Period:{' '}
                      {new Date(stream.period_start).toLocaleDateString()} -{' '}
                      {new Date(stream.period_end).toLocaleDateString()}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="textSecondary">
                No streams data available
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </LocalizationProvider>
  )
}

export default App
