const fs = require('fs')
const path = require('path')

const artifactsDir = path.join(__dirname, '../artifacts/contracts')
const frontendDir = path.join(__dirname, '../../frontend/src/contracts')

// Create frontend contracts directory if it doesn't exist
if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir, { recursive: true })
}

// Copy SDToken artifacts
const sdTokenArtifact = path.join(artifactsDir, 'SDToken.sol/SDToken.json')
fs.copyFileSync(sdTokenArtifact, path.join(frontendDir, 'SDToken.json'))

// Copy MockStrategy artifacts
const mockStrategyArtifact = path.join(
  artifactsDir,
  'mocks/MockStrategy.sol/MockStrategy.json',
)
fs.copyFileSync(
  mockStrategyArtifact,
  path.join(frontendDir, 'MockStrategy.json'),
)

// Copy MockDelegationManager artifacts
const mockDelegationArtifact = path.join(
  artifactsDir,
  'mocks/MockDelegationManager.sol/MockDelegationManager.json',
)
fs.copyFileSync(
  mockDelegationArtifact,
  path.join(frontendDir, 'MockDelegationManager.json'),
)

console.log('Contract artifacts copied to frontend')
