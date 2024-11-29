import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import axios from 'axios'
import Web3 from 'web3'
import TokenDashboard from './components/TokenDashboard'
import StakingInterface from './components/StakingInterface'
import PriceChart from './components/PriceChart'
import ReleasesGrid from './components/ReleasesGrid'
import SKJMusicTokenABI from './contracts/SKJMusicToken.json'

const API_URL = 'http://localhost:8000/api'
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS

function App() {
  const [streams, setStreams] = useState([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [web3, setWeb3] = useState(null)
  const [contract, setContract] = useState(null)
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
    initializeWeb3()
  }, [])

  const initializeWeb3 = async () => {
    try {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum)
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const accounts = await web3Instance.eth.getAccounts()
        const contractInstance = new web3Instance.eth.Contract(
          SKJMusicTokenABI,
          CONTRACT_ADDRESS,
        )

        setWeb3(web3Instance)
        setContract(contractInstance)
        setAccount(accounts[0])

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0])
        })
      } else {
        setError('Please install MetaMask to use this dApp')
      }
    } catch (err) {
      setError('Error connecting to Web3: ' + err.message)
    }
  }

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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          SDToken Stream Management
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {web3 && contract && account && (
          <>
            <TokenDashboard web3={web3} contract={contract} account={account} />
            <PriceChart web3={web3} contract={contract} />
            <StakingInterface
              web3={web3}
              contract={contract}
              account={account}
            />
          </>
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
