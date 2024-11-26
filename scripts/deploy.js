const hre = require('hardhat')

async function main() {
  console.log('Deploying SDToken contracts...')

  // Get the contract factory
  const SKJMusicToken = await hre.ethers.getContractFactory('SKJMusicToken')

  // For testing, we'll use placeholder addresses for EigenLayer contracts
  // These should be replaced with actual EigenLayer addresses for mainnet deployment
  const EIGEN_STRATEGY_ADDRESS =
    process.env.EIGEN_STRATEGY_ADDRESS ||
    '0x0000000000000000000000000000000000000000'
  const EIGEN_DELEGATION_ADDRESS =
    process.env.EIGEN_DELEGATION_ADDRESS ||
    '0x0000000000000000000000000000000000000000'

  // Deploy the contract
  const token = await SKJMusicToken.deploy(
    EIGEN_STRATEGY_ADDRESS,
    EIGEN_DELEGATION_ADDRESS,
  )

  await token.deployed()

  console.log('SKJMusicToken deployed to:', token.address)
  console.log('Deployment configuration:')
  console.log('- EigenLayer Strategy:', EIGEN_STRATEGY_ADDRESS)
  console.log('- EigenLayer Delegation:', EIGEN_DELEGATION_ADDRESS)
  console.log('- Artist Address:', '0xfB91A0Dba31ba4d042886C2A0b3AA23BFb23F196')

  // Verify the contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log('Verifying contract on Etherscan...')
    await hre.run('verify:verify', {
      address: token.address,
      constructorArguments: [EIGEN_STRATEGY_ADDRESS, EIGEN_DELEGATION_ADDRESS],
    })
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
