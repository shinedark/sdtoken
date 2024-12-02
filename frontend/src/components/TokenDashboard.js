import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  Box,
} from '@mui/material'
import { ExpandMore, ExpandLess } from '@mui/icons-material'

const TokenDashboard = ({ web3, contract, account }) => {
  const [metrics, setMetrics] = useState({
    totalSupply: '0',
    totalStaked: '0',
    price: '0',
    stakersCount: '0',
  })
  const [stakers, setStakers] = useState([])
  const [showStakers, setShowStakers] = useState(false)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const eigenStrategyAddress = await contract.methods
          .eigenStrategy()
          .call()

        const eigenStrategy = new web3.eth.Contract(
          [
            {
              constant: true,
              inputs: [],
              name: 'totalShares',
              outputs: [{ name: '', type: 'uint256' }],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
          ],
          eigenStrategyAddress,
        )

        const [totalSupply, totalStaked, price] = await Promise.all([
          contract.methods.totalSupply().call(),
          eigenStrategy.methods.totalShares().call(),
          contract.methods.getCurrentPrice().call(),
        ])

        setMetrics({
          totalSupply: web3.utils.fromWei(totalSupply),
          totalStaked: web3.utils.fromWei(totalStaked),
          price: web3.utils.fromWei(price),
        })
      } catch (error) {
        console.error('Error fetching token metrics:', error)
      }
    }

    const fetchStakers = async () => {
      try {
        const eigenStrategyAddress = await contract.methods
          .eigenStrategy()
          .call()
        console.log('EigenStrategy address:', eigenStrategyAddress)

        // Check if the user has any tokens
        const balance = await contract.methods.balanceOf(account).call()
        console.log(
          'User balance:',
          web3.utils.fromWei(balance, 'ether'),
          'SDT',
        )

        // Check if user is in stakers list
        const stakerCount = await contract.methods.getStakersCount().call()
        console.log('Total staker count:', stakerCount)

        const stakerPromises = []
        for (let i = 0; i < stakerCount; i++) {
          stakerPromises.push(contract.methods.getStakerAtIndex(i).call())
        }
        const stakerAddresses = await Promise.all(stakerPromises)
        console.log('Staker addresses:', stakerAddresses)

        // Get shares for all addresses
        const eigenStrategy = new web3.eth.Contract(
          [
            {
              constant: true,
              inputs: [{ name: 'account', type: 'address' }],
              name: 'shares',
              outputs: [{ name: '', type: 'uint256' }],
              payable: false,
              stateMutability: 'view',
              type: 'function',
            },
          ],
          eigenStrategyAddress,
        )

        const stakerInfoPromises = stakerAddresses.map(async (address) => {
          const shares = await eigenStrategy.methods.shares(address).call()
          const stakes = await contract.methods.getStakedBalance(address).call()
          console.log(`Address ${address}:`, {
            shares: web3.utils.fromWei(shares, 'ether'),
            stakes: web3.utils.fromWei(stakes, 'ether'),
          })

          return {
            address,
            shares: web3.utils.fromWei(shares, 'ether'),
            stakes: web3.utils.fromWei(stakes, 'ether'),
            isCurrentUser: address.toLowerCase() === account?.toLowerCase(),
          }
        })

        const stakerInfo = await Promise.all(stakerInfoPromises)
        console.log('Raw staker info:', stakerInfo)

        // Sort by shares and filter out zero shares
        const sortedStakers = stakerInfo
          .filter((staker) => Number(staker.stakes) > 0)
          .sort((a, b) => Number(b.stakes) - Number(a.stakes))

        console.log('Filtered and sorted stakers:', sortedStakers)
        setStakers(sortedStakers)

        // Update metrics
        setMetrics((prev) => ({
          ...prev,
          stakersCount: sortedStakers.length.toString(),
        }))
      } catch (error) {
        console.error('Error fetching stakers:', error)
      }
    }

    if (contract && web3) {
      fetchMetrics()
      fetchStakers()

      // Set up polling
      const interval = setInterval(() => {
        fetchMetrics()
        fetchStakers()
      }, 10000) // Poll every 10 seconds

      return () => clearInterval(interval)
    }
  }, [contract, web3, account])

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4,
    )}`
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Token Metrics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle1">Total Supply</Typography>
          <Typography variant="h6">{metrics.totalSupply} SDT</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle1">Total Staked</Typography>
          <Typography variant="h6">{metrics.totalStaked} SDT</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle1">Current Price</Typography>
          <Typography variant="h6">${metrics.price}</Typography>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowStakers(!showStakers)}
        >
          <Typography variant="h6">
            Active Stakers ({stakers.length})
          </Typography>
          <IconButton size="small">
            {showStakers ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Collapse in={showStakers}>
          <List>
            {stakers.map((staker) => (
              <ListItem
                key={staker.address}
                sx={{
                  bgcolor: staker.isCurrentUser ? 'action.selected' : 'inherit',
                }}
              >
                <ListItemText
                  primary={
                    <>
                      <Typography
                        component="span"
                        variant="body1"
                        color={staker.isCurrentUser ? 'primary' : 'inherit'}
                      >
                        {formatAddress(staker.address)}
                        {staker.isCurrentUser && ' (You)'}
                      </Typography>
                    </>
                  }
                  secondary={`${Number(staker.stakes).toFixed(2)} SDT staked`}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
    </Paper>
  )
}

export default TokenDashboard
