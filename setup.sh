#!/bin/bash

# Create lib directory if it doesn't exist
mkdir -p lib

# Remove existing EigenLayer directory if it exists
rm -rf lib/eigenlayer-contracts

# Clone EigenLayer contracts
git clone https://github.com/Layr-Labs/eigenlayer-contracts.git lib/eigenlayer-contracts
cd lib/eigenlayer-contracts
git checkout main  # Use main branch for now
cd ../..

# Install npm dependencies
npm install

# Create contracts directory if it doesn't exist
mkdir -p contracts

# Copy our contract to contracts directory if it doesn't exist
if [ ! -d "contracts/SDToken" ]; then
    mkdir -p contracts/SDToken
    cp IdeaContracts/softkilljams.sol contracts/SDToken/SKJMusicToken.sol
fi

# Copy mock contracts
mkdir -p contracts/mocks
cp contracts/mocks/MockEigenStrategy.sol contracts/mocks/
cp contracts/mocks/MockEigenDelegation.sol contracts/mocks/

echo "Setup complete! You can now run 'npx hardhat compile'" 