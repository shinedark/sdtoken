import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Box,
} from '@mui/material'
import {
  Timeline,
  TrendingUp,
  AccountBalance,
  Group,
  MonetizationOn,
} from '@mui/icons-material'

const TokenDashboard = ({ web3, contract, account }) => {
  const [tokenMetrics, setTokenMetrics] = useState({
    price: '0',
    totalSupply: '0',
    totalStaked: '0',
    stakersCount: '0',
    artistBalance: '0',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (contract) {
      fetchTokenMetrics()
      const interval = setInterval(fetchTokenMetrics, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [contract, account])

  const fetchTokenMetrics = async () => {
    try {
      const [
        price,
        totalSupply,
        totalStaked,
        stakersCount,
        artistBalance,
      ] = await Promise.all([
        contract.methods.getCurrentPrice().call(),
        contract.methods.totalSupply().call(),
        contract.methods.eigenStrategy().methods.totalShares().call(),
        contract.methods.getStakersCount().call(),
        contract.methods.getArtistWithdrawableBalance().call(),
      ])

      setTokenMetrics({
        price: web3.utils.fromWei(price, 'ether'),
        totalSupply: web3.utils.fromWei(totalSupply, 'ether'),
        totalStaked: web3.utils.fromWei(totalStaked, 'ether'),
        stakersCount,
        artistBalance: web3.utils.fromWei(artistBalance, 'ether'),
      })
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching token metrics:', error)
      setIsLoading(false)
    }
  }

  const handleArtistWithdraw = async () => {
    try {
      await contract.methods.artistWithdraw().send({ from: account })
      await fetchTokenMetrics()
    } catch (error) {
      console.error('Error withdrawing artist funds:', error)
    }
  }

  if (isLoading) {
    return <LinearProgress />
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <Timeline sx={{ mr: 1 }} />
        Token Metrics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <TrendingUp sx={{ mr: 1 }} />
                Token Price
              </Typography>
              <Typography variant="h5">
                ${parseFloat(tokenMetrics.price).toFixed(4)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <AccountBalance sx={{ mr: 1 }} />
                Total Supply
              </Typography>
              <Typography variant="h5">
                {parseFloat(tokenMetrics.totalSupply).toLocaleString()} SKJ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <MonetizationOn sx={{ mr: 1 }} />
                Total Staked
              </Typography>
              <Typography variant="h5">
                {parseFloat(tokenMetrics.totalStaked).toLocaleString()} SKJ
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {(
                  (tokenMetrics.totalStaked / tokenMetrics.totalSupply) *
                  100
                ).toFixed(2)}
                % of supply
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <Group sx={{ mr: 1 }} />
                Total Stakers
              </Typography>
              <Typography variant="h5">{tokenMetrics.stakersCount}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={8}>
          <Card>
            <CardContent>
              <Typography
                color="textSecondary"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <MonetizationOn sx={{ mr: 1 }} />
                Artist's Withdrawable Balance
              </Typography>
              <Typography variant="h5">
                {parseFloat(tokenMetrics.artistBalance).toFixed(4)} ETH
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleArtistWithdraw}
                  disabled={parseFloat(tokenMetrics.artistBalance) === 0}
                >
                  Withdraw Funds
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default TokenDashboard
