import React, { useState, useEffect, useCallback } from 'react'
import {
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Stack,
  Alert,
  Grid,
} from '@mui/material'

const StakingInterface = ({ web3, contract, account, onStakingChange }) => {
  const [stakeAmount, setStakeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [stakedBalance, setStakedBalance] = useState('0')
  const [stakingInfo, setStakingInfo] = useState({
    totalStaked: '0',
    userShare: '0',
    pendingRewards: '0',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchBalances = useCallback(async () => {
    if (!contract || !web3 || !account) {
      console.log('Missing dependencies:', {
        contract: !!contract,
        web3: !!web3,
        account,
      })
      return
    }

    try {
      setError('')
      // Get staked balance from contract
      const stakedTokens = await contract.methods
        .getStakedBalance(account)
        .call()
      console.log('Staked tokens (getStakedBalance):', stakedTokens)

      // Get token balance for comparison
      const tokenBalance = await contract.methods.balanceOf(account).call()
      console.log('Token balance:', tokenBalance)

      // Convert to ether and update state
      const stakedBalanceInEther = web3.utils.fromWei(
        stakedTokens || '0',
        'ether',
      )
      console.log(
        'Staked balance in ether:',
        stakedBalanceInEther,
        stakedTokens,
      )

      setStakedBalance(stakedBalanceInEther)

      // Update staking info
      setStakingInfo((prev) => ({
        ...prev,
        userShare: stakedBalanceInEther,
      }))
    } catch (error) {
      console.error('Error fetching balances:', error)
      setError('Failed to fetch staking balance: ' + error.message)
    }
  }, [contract, web3, account])

  const checkStaking = useCallback(async () => {
    if (!contract || !web3 || !account) return

    try {
      // Get staked balance and total staked
      const [userStaked, totalStaked] = await Promise.all([
        contract.methods.getStakedBalance(account).call(),
        contract.methods.getTotalStaked().call(),
      ])

      console.log('User staked:', userStaked, 'Total staked:', totalStaked)

      // Convert to ether
      const userStakedEther = web3.utils.fromWei(userStaked || '0', 'ether')
      const totalStakedEther = web3.utils.fromWei(totalStaked || '0', 'ether')

      // Calculate percentage
      const userSharePercentage =
        totalStakedEther !== '0'
          ? (Number(userStakedEther) / Number(totalStakedEther)) * 100
          : 0

      setStakingInfo({
        totalStaked: totalStakedEther,
        userShare: userSharePercentage.toFixed(2),
        pendingRewards: '0',
      })

      setStakedBalance(userStakedEther)

      console.log('Staking info updated:', {
        userStaked: userStakedEther,
        totalStaked: totalStakedEther,
        userSharePercentage,
      })
    } catch (error) {
      console.error('Error checking staking info:', error)
    }
  }, [contract, web3, account])

  // const checkStaking = useCallback(async () => {
  //   if (!contract || !web3 || !account) return

  //   try {
  //     const eigenStrategyAddress = await contract.methods.eigenStrategy().call()
  //     const eigenStrategy = new web3.eth.Contract(
  //       [
  //         {
  //           constant: true,
  //           inputs: [{ name: 'account', type: 'address' }],
  //           name: 'shares',
  //           outputs: [{ name: '', type: 'uint256' }],
  //           payable: false,
  //           stateMutability: 'view',
  //           type: 'function',
  //         },
  //         {
  //           constant: true,
  //           inputs: [],
  //           name: 'totalShares',
  //           outputs: [{ name: '', type: 'uint256' }],
  //           payable: false,
  //           stateMutability: 'view',
  //           type: 'function',
  //         },
  //       ],
  //       eigenStrategyAddress,
  //     )

  //     // Only get shares and total shares
  //     const [userShares, totalShares] = await Promise.all([
  //       eigenStrategy.methods.shares(account).call(),
  //       eigenStrategy.methods.totalShares().call(),
  //     ])

  //     // Convert shares to numbers safely
  //     const userSharesNum = web3.utils.fromWei(userShares || '0', 'ether')
  //     const totalSharesNum = web3.utils.fromWei(totalShares || '0', 'ether')

  //     // Calculate percentage
  //     const userSharePercentage =
  //       totalSharesNum !== '0'
  //         ? (Number(userSharesNum) / Number(totalSharesNum)) * 100
  //         : 0

  //     setStakingInfo({
  //       totalStaked: totalSharesNum,
  //       userShare: userSharePercentage.toFixed(2),
  //       pendingRewards: '0', // Set to '0' since we don't have rewards
  //     })

  //     setStakedBalance(userSharesNum)

  //     console.log('Staking info updated:', {
  //       userShares: userSharesNum,
  //       totalShares: totalSharesNum,
  //       userSharePercentage,
  //     })
  //   } catch (error) {
  //     console.error('Error checking staking info:', error)
  //   }
  // }, [contract, web3, account])

  // Set up event listeners once when component mounts
  useEffect(() => {
    if (!contract || !account) {
      console.log('Missing contract or account for events')
      return
    }

    console.log('Setting up event listeners for account:', account)

    const handleStakeEvent = (event) => {
      console.log('Stake event detected:', event)
      fetchBalances()
    }

    const handleUnstakeEvent = (event) => {
      console.log('Unstake event detected:', event)
      fetchBalances()
    }

    // Set up event listeners
    const stakedSubscription = contract.events
      .Staked({ filter: { staker: account } })
      .on('data', handleStakeEvent)
      .on('error', (error) => console.error('Stake event error:', error))

    const unstakedSubscription = contract.events
      .Unstaked({ filter: { staker: account } })
      .on('data', handleUnstakeEvent)
      .on('error', (error) => console.error('Unstake event error:', error))

    // Clean up event listeners when component unmounts
    return () => {
      console.log('Cleaning up event listeners')
      stakedSubscription.unsubscribe()
      unstakedSubscription.unsubscribe()
    }
  }, [contract, account, fetchBalances])

  // Initial fetch and polling
  useEffect(() => {
    console.log('Setting up initial fetch and polling')
    fetchBalances() // Initial fetch

    // Set up polling
    const interval = setInterval(() => {
      console.log('Polling for balance updates')
      fetchBalances()
    }, 5000) // Poll every 5 seconds

    return () => {
      console.log('Cleaning up polling interval')
      clearInterval(interval)
    }
  }, [fetchBalances])

  useEffect(() => {
    if (contract && web3 && account) {
      checkStaking()
    }
  }, [contract, web3, account, checkStaking])

  const checkAllowance = async (amount) => {
    try {
      const eigenStrategyAddress = await contract.methods.eigenStrategy().call()
      const allowance = await contract.methods
        .allowance(account, eigenStrategyAddress)
        .call()
      return web3.utils.toBN(allowance).gte(web3.utils.toBN(amount))
    } catch (error) {
      console.error('Error checking allowance:', error)
      return false
    }
  }

  const convertToWei = (amount) => {
    try {
      // Remove any extra decimals beyond 18 places
      const parts = amount.toString().split('.')
      if (parts.length > 1) {
        parts[1] = parts[1].slice(0, 18) // Keep only up to 18 decimal places
        amount = parts.join('.')
      }
      return web3.utils.toWei(amount)
    } catch (error) {
      console.error('Error converting to wei:', error)
      throw new Error('Invalid amount format')
    }
  }

  const handleStake = async () => {
    setIsLoading(true)
    setError('')
    try {
      // Input validation
      if (!stakeAmount || isNaN(stakeAmount) || Number(stakeAmount) <= 0) {
        throw new Error('Invalid amount')
      }

      const amount = web3.utils.toWei(stakeAmount.toString(), 'ether')
      console.log('Staking amount (wei):', amount)

      // Get eigenStrategy address
      const eigenStrategyAddress = await contract.methods.eigenStrategy().call()
      console.log('EigenStrategy address:', eigenStrategyAddress)

      // Check token balance
      const currentBalance = await contract.methods.balanceOf(account).call()
      console.log('Current balance (wei):', currentBalance)

      const amountBN = web3.utils.toBN(amount)
      const balanceBN = web3.utils.toBN(currentBalance)

      if (balanceBN.lt(amountBN)) {
        throw new Error('Insufficient balance')
      }

      // Get current allowance
      const currentAllowance = await contract.methods
        .allowance(account, eigenStrategyAddress)
        .call()
      console.log('Current allowance:', currentAllowance)

      // Approve if needed
      if (web3.utils.toBN(currentAllowance).lt(amountBN)) {
        console.log('Approving strategy contract...')

        // Estimate gas for approval
        const approveGas = await contract.methods
          .approve(eigenStrategyAddress, amount)
          .estimateGas({ from: account })
          .catch(() => 100000) // Fallback gas limit

        // Send approval transaction
        const approveTx = await contract.methods
          .approve(eigenStrategyAddress, amount)
          .send({
            from: account,
            gas: Math.min(approveGas * 1.5, 150000), // 50% buffer, max 150k
          })
        console.log('Approval tx:', approveTx.transactionHash)

        // Wait for 2 block confirmations
        const receipt = await web3.eth.getTransactionReceipt(
          approveTx.transactionHash,
        )
        console.log('Approval confirmed, block:', receipt.blockNumber)
      }

      // Estimate gas for stake
      const stakeGas = await contract.methods
        .stake(amount)
        .estimateGas({ from: account })
        .catch(() => 200000) // Fallback gas limit

      // Send stake transaction
      console.log('Staking tokens...')
      const stakeTx = await contract.methods.stake(amount).send({
        from: account,
        gas: Math.min(stakeGas * 1.5, 300000), // 50% buffer, max 300k
      })
      console.log('Stake tx:', stakeTx.transactionHash)

      // Wait for stake confirmation
      const stakeReceipt = await web3.eth.getTransactionReceipt(
        stakeTx.transactionHash,
      )
      console.log('Stake confirmed, block:', stakeReceipt.blockNumber)

      // Update UI
      setStakeAmount('')
      await Promise.all([fetchBalances(), checkStaking()])
      onStakingChange?.()
    } catch (error) {
      console.error('Error staking:', error)
      const errorMessage = error.message || error.toString()

      if (errorMessage.includes('user rejected')) {
        setError('Transaction was rejected')
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient ETH for gas')
      } else if (errorMessage.includes('Insufficient balance')) {
        setError('Insufficient token balance')
      } else if (errorMessage.includes('Invalid amount')) {
        setError('Invalid amount format')
      } else {
        setError('Failed to stake tokens: ' + errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    setIsLoading(true)
    setError('')
    try {
      if (
        !withdrawAmount ||
        isNaN(withdrawAmount) ||
        Number(withdrawAmount) <= 0
      ) {
        throw new Error('Invalid amount')
      }

      const amount = web3.utils.toWei(withdrawAmount.toString(), 'ether')
      console.log('Withdrawing amount (wei):', amount)

      const tx = await contract.methods.unstake(amount).send({
        from: account,
      })
      console.log('Withdraw successful:', tx.transactionHash)

      setWithdrawAmount('')
      await Promise.all([fetchBalances(), checkStaking()])
      onStakingChange?.()
    } catch (error) {
      console.error('Error withdrawing:', error)
      if (error.message.includes('user rejected')) {
        setError('Transaction was rejected')
      } else if (error.message.includes('insufficient funds')) {
        setError('Insufficient ETH for gas')
      } else if (error.message.includes('Invalid amount')) {
        setError('Invalid amount format')
      } else {
        setError('Failed to withdraw tokens: ' + error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Staking
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">Your Staking Position</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Your Staked Balance
            </Typography>
            <Typography variant="h6">{stakedBalance} SDT</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Your Share
            </Typography>
            <Typography variant="h6">{stakingInfo.userShare}%</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Pending Rewards
            </Typography>
            <Typography variant="h6">
              {stakingInfo.pendingRewards} SDT
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Total Staked in Protocol
            </Typography>
            <Typography variant="h6">{stakingInfo.totalStaked} SDT</Typography>
          </Grid>
        </Grid>
      </Box>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Amount to Stake"
            value={stakeAmount}
            onChange={(e) => {
              // Only allow numbers and decimals
              const value = e.target.value.replace(/[^0-9.]/g, '')
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setStakeAmount(value)
              }
            }}
            type="number"
            size="small"
            disabled={isLoading}
            error={!!error && error.includes('stake')}
          />
          <Button
            variant="contained"
            onClick={handleStake}
            disabled={isLoading || !stakeAmount || Number(stakeAmount) <= 0}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Stake'}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Amount to Withdraw"
            value={withdrawAmount}
            onChange={(e) => {
              // Only allow numbers and decimals
              const value = e.target.value.replace(/[^0-9.]/g, '')
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setWithdrawAmount(value)
              }
            }}
            type="number"
            size="small"
            disabled={isLoading || Number(stakedBalance) === 0} // Add this condition
            error={!!error && error.includes('withdraw')}
          />
          <Button
            variant="outlined"
            onClick={handleWithdraw}
            disabled={
              isLoading ||
              !withdrawAmount ||
              Number(withdrawAmount) <= 0 ||
              Number(withdrawAmount) > Number(stakedBalance) ||
              Number(stakedBalance) === 0 // Add this condition
            }
          >
            {isLoading ? <CircularProgress size={24} /> : 'Withdraw'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  )
}

export default StakingInterface
