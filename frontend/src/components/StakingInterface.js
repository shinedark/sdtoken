import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'
import { AccountBalance } from '@mui/icons-material'

const StakingInterface = ({ web3, contract, account }) => {
  const [stakeAmount, setStakeAmount] = useState('')
  const [unstakeAmount, setUnstakeAmount] = useState('')
  const [stakedBalance, setStakedBalance] = useState('0')
  const [tokenBalance, setTokenBalance] = useState('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (contract && account) {
      fetchBalances()
      const interval = setInterval(fetchBalances, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [contract, account])

  const fetchBalances = async () => {
    try {
      const [staked, balance] = await Promise.all([
        contract.methods.getStakedBalance(account).call(),
        contract.methods.balanceOf(account).call(),
      ])
      setStakedBalance(web3.utils.fromWei(staked, 'ether'))
      setTokenBalance(web3.utils.fromWei(balance, 'ether'))
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }

  const handleStake = async () => {
    if (!stakeAmount) return
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const amount = web3.utils.toWei(stakeAmount, 'ether')

      // First approve the contract to spend tokens
      await contract.methods
        .approve(contract.options.address, amount)
        .send({ from: account })

      // Then stake the tokens
      await contract.methods.stake(amount).send({ from: account })

      setSuccess('Successfully staked tokens!')
      setStakeAmount('')
      fetchBalances()
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnstake = async () => {
    if (!unstakeAmount) return
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const amount = web3.utils.toWei(unstakeAmount, 'ether')
      await contract.methods.unstake(amount).send({ from: account })

      setSuccess('Successfully unstaked tokens!')
      setUnstakeAmount('')
      fetchBalances()
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <AccountBalance sx={{ mr: 1 }} />
        Staking Interface
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" color="textSecondary">
          Available Balance: {parseFloat(tokenBalance).toLocaleString()} SKJ
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Staked Balance: {parseFloat(stakedBalance).toLocaleString()} SKJ
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Amount to Stake"
          type="number"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          disabled={isLoading}
          InputProps={{
            inputProps: { min: 0, step: '0.000001' },
          }}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleStake}
          disabled={isLoading || !stakeAmount}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Stake Tokens'}
        </Button>
      </Box>

      <Box>
        <TextField
          fullWidth
          label="Amount to Unstake"
          type="number"
          value={unstakeAmount}
          onChange={(e) => setUnstakeAmount(e.target.value)}
          disabled={isLoading}
          InputProps={{
            inputProps: { min: 0, step: '0.000001' },
          }}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleUnstake}
          disabled={isLoading || !unstakeAmount}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Unstake Tokens'}
        </Button>
      </Box>
    </Paper>
  )
}

export default StakingInterface
