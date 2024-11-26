import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Timeline } from '@mui/icons-material'

const PriceChart = ({ web3, contract }) => {
  const [priceHistory, setPriceHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('1W') // 1W, 1M, 3M, 1Y

  useEffect(() => {
    if (contract) {
      fetchPriceHistory()
      const interval = setInterval(fetchPriceHistory, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [contract, timeRange])

  const fetchPriceHistory = async () => {
    try {
      // For demo purposes, we'll generate some mock data
      // In production, this should fetch from an API or blockchain events
      const currentPrice = await contract.methods.getCurrentPrice().call()
      const basePrice = web3.utils.fromWei(currentPrice, 'ether')

      const mockHistory = generateMockPriceHistory(basePrice, timeRange)
      setPriceHistory(mockHistory)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching price history:', error)
      setIsLoading(false)
    }
  }

  const generateMockPriceHistory = (currentPrice, range) => {
    const points = {
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '1Y': 365,
    }[range]

    const data = []
    const basePrice = parseFloat(currentPrice)
    const volatility = 0.05 // 5% volatility

    for (let i = points; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      // Generate a price with some random variation
      const randomChange = (Math.random() - 0.5) * 2 * volatility
      const price = basePrice * (1 + randomChange)

      data.push({
        date: date.toLocaleDateString(),
        price: price.toFixed(4),
      })
    }

    return data
  }

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange)
    }
  }

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <Timeline sx={{ mr: 1 }} />
          Price History
        </Typography>

        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
        >
          <ToggleButton value="1W">1W</ToggleButton>
          <ToggleButton value="1M">1M</ToggleButton>
          <ToggleButton value="3M">3M</ToggleButton>
          <ToggleButton value="1Y">1Y</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={priceHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value) => [`$${value}`, 'Price']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#90caf9"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  )
}

export default PriceChart
