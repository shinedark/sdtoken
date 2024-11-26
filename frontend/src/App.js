import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import axios from 'axios'
import Web3 from 'web3'
import TokenDashboard from './components/TokenDashboard'
import StakingInterface from './components/StakingInterface'
import PriceChart from './components/PriceChart'
import SKJMusicTokenABI from './contracts/SKJMusicToken.json'

const API_URL = 'http://localhost:8000/api'
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS

function App() {
  const [formData, setFormData] = useState({
    store_name: '',
    stream_count: '',
    earnings: '',
    period_start: null,
    period_end: null,
    video_proof_url: '',
  })

  const [streams, setStreams] = useState([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [web3, setWeb3] = useState(null)
  const [contract, setContract] = useState(null)
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)

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
    try {
      const [streamsRes, earningsRes] = await Promise.all([
        axios.get(`${API_URL}/streams`),
        axios.get(`${API_URL}/earnings`),
      ])
      setStreams(streamsRes.data.streams)
      setTotalEarnings(earningsRes.data.total_earnings)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API_URL}/streams`, {
        ...formData,
        stream_count: parseInt(formData.stream_count),
        earnings: parseFloat(formData.earnings),
      })
      fetchData()
      setFormData({
        store_name: '',
        stream_count: '',
        earnings: '',
        period_start: null,
        period_end: null,
        video_proof_url: '',
      })
    } catch (error) {
      console.error('Error submitting data:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
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

        <Divider sx={{ my: 4 }} />

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Add New Stream Data
              </Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Store Name"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Stream Count"
                  name="stream_count"
                  type="number"
                  value={formData.stream_count}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Earnings"
                  name="earnings"
                  type="number"
                  value={formData.earnings}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
                <DatePicker
                  label="Period Start"
                  value={formData.period_start}
                  onChange={(date) =>
                    setFormData({ ...formData, period_start: date })
                  }
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' },
                  }}
                />
                <DatePicker
                  label="Period End"
                  value={formData.period_end}
                  onChange={(date) =>
                    setFormData({ ...formData, period_end: date })
                  }
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' },
                  }}
                />
                <TextField
                  fullWidth
                  label="Video Proof URL"
                  name="video_proof_url"
                  value={formData.video_proof_url}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Submit
                </Button>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Statistics
              </Typography>
              <Typography variant="h6">
                Total Earnings: ${totalEarnings.toFixed(2)}
              </Typography>
            </Paper>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom>
                Recent Streams
              </Typography>
              {streams.map((stream, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{stream.store_name}</Typography>
                    <Typography>Streams: {stream.stream_count}</Typography>
                    <Typography>Earnings: ${stream.earnings}</Typography>
                    <Typography>
                      Period:{' '}
                      {new Date(stream.period_start).toLocaleDateString()} -{' '}
                      {new Date(stream.period_end).toLocaleDateString()}
                    </Typography>
                    <Button
                      href={stream.video_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    >
                      View Proof
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </LocalizationProvider>
  )
}

export default App
