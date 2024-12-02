import Web3 from 'web3'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../config/contracts'

let connectionPromise = null
const EXPECTED_CHAIN_ID = '0x7A69' // 31337 in hex (Hardhat's chainId)

export const connectWeb3 = async () => {
  // Return existing connection promise if one is pending
  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = (async () => {
    try {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)

        // Check if already connected
        const accounts = await web3.eth.getAccounts()
        if (accounts.length === 0) {
          // Request account access if needed
          try {
            await window.ethereum.request({
              method: 'eth_requestAccounts',
              params: [],
            })
          } catch (error) {
            if (error.code === -32002) {
              throw new Error(
                'Please check MetaMask and approve the connection request',
              )
            }
            throw error
          }
        }

        // Check and switch network if needed
        const chainId = await web3.eth.getChainId()
        const chainIdHex = `0x${chainId.toString(16)}`

        if (chainIdHex !== EXPECTED_CHAIN_ID) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: EXPECTED_CHAIN_ID }],
            })
          } catch (error) {
            throw new Error(
              'Please switch to the local Hardhat network in MetaMask',
            )
          }
        }

        // Get network ID after potential switch
        const networkId = await web3.eth.net.getId()

        if (!CONTRACT_ADDRESSES.SDToken) {
          throw new Error('Contract address not configured')
        }

        return {
          web3,
          contractAddress: CONTRACT_ADDRESSES.SDToken,
          networkId,
          accounts: await web3.eth.getAccounts(),
        }
      } else {
        // Fallback to local network
        const web3 = new Web3(NETWORK_CONFIG.localhost.rpcUrl)
        return {
          web3,
          contractAddress: CONTRACT_ADDRESSES.SDToken,
          networkId: 31337, // Local hardhat network
          accounts: [],
        }
      }
    } finally {
      connectionPromise = null // Clear the promise when done
    }
  })()

  return connectionPromise
}

// Add network change listener
if (window.ethereum) {
  window.ethereum.on('chainChanged', () => {
    // Reload the page when network changes
    window.location.reload()
  })
}
