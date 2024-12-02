const hre = require('hardhat')

async function main() {
  console.log('Deploying contracts...')

  // First deploy SDToken
  const SDToken = await hre.ethers.getContractFactory('SDToken')
  const sdToken = await SDToken.deploy()
  await sdToken.waitForDeployment()
  const sdTokenAddress = await sdToken.getAddress()

  // Then deploy mock contracts
  const MockStrategy = await hre.ethers.getContractFactory('MockStrategy')
  const mockStrategy = await MockStrategy.deploy(sdTokenAddress)
  await mockStrategy.waitForDeployment()

  const MockDelegationManager = await hre.ethers.getContractFactory(
    'MockDelegationManager',
  )
  const mockDelegationManager = await MockDelegationManager.deploy()
  await mockDelegationManager.waitForDeployment()

  // Initialize SDToken with mock addresses
  await sdToken.initialize(
    await mockStrategy.getAddress(),
    await mockDelegationManager.getAddress(),
  )

  console.log('SDToken deployed to:', sdTokenAddress)
  console.log('MockStrategy deployed to:', await mockStrategy.getAddress())
  console.log(
    'MockDelegationManager deployed to:',
    await mockDelegationManager.getAddress(),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
