const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('SKJMusicToken', function () {
  let SKJMusicToken
  let token
  let owner
  let artist
  let staker1
  let staker2
  let eigenStrategy
  let eigenDelegation

  const ARTIST_ADDRESS = '0xfB91A0Dba31ba4d042886C2A0b3AA23BFb23F196'
  const MONTH = 30 * 24 * 60 * 60 // 30 days in seconds

  beforeEach(async function () {
    // Get signers
    ;[owner, staker1, staker2] = await ethers.getSigners()

    // Create a new signer for the artist address
    await ethers.provider.send('hardhat_setBalance', [
      ARTIST_ADDRESS,
      '0x56BC75E2D63100000', // 100 ETH
    ])
    await ethers.provider.send('hardhat_impersonateAccount', [ARTIST_ADDRESS])
    artist = await ethers.getSigner(ARTIST_ADDRESS)

    // Deploy mock EigenLayer contracts
    const MockStrategy = await ethers.getContractFactory('MockEigenStrategy')
    eigenStrategy = await MockStrategy.deploy()
    await eigenStrategy.deployed()

    const MockDelegation = await ethers.getContractFactory(
      'MockEigenDelegation',
    )
    eigenDelegation = await MockDelegation.deploy()
    await eigenDelegation.deployed()

    // Deploy token contract
    SKJMusicToken = await ethers.getContractFactory('SKJMusicToken')
    token = await SKJMusicToken.deploy(
      eigenStrategy.address,
      eigenDelegation.address,
    )
    await token.deployed()
  })

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await token.owner()).to.equal(owner.address)
    })

    it('Should have correct initial supply', async function () {
      const totalSupply = await token.totalSupply()
      expect(totalSupply).to.equal(ethers.utils.parseEther('1000000'))
    })
  })

  describe('Monthly Royalties', function () {
    it('Should correctly distribute monthly royalties', async function () {
      const royaltyAmount = ethers.utils.parseEther('10')
      const streamCount = 1000

      // Get initial balances
      const initialArtistBalance = await token.getArtistWithdrawableBalance()

      // Deposit royalties
      await token.connect(owner).depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })

      // Check artist's share is correct (70%)
      const artistShare = royaltyAmount.mul(70).div(100)
      const finalArtistBalance = await token.getArtistWithdrawableBalance()
      expect(finalArtistBalance.sub(initialArtistBalance)).to.equal(artistShare)
    })

    it('Should update token price based on performance', async function () {
      const royaltyAmount = ethers.utils.parseEther('10')
      const streamCount = 1000

      // Get initial price
      const initialPrice = await token.getCurrentPrice()

      // Deposit royalties
      await token.connect(owner).depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })

      // Advance time by one month
      await ethers.provider.send('evm_increaseTime', [MONTH])
      await ethers.provider.send('evm_mine')

      // Deposit more royalties with better performance
      await token.connect(owner).depositMonthlyRoyalties(streamCount * 2, {
        value: royaltyAmount.mul(2),
      })

      // Check price increased
      const finalPrice = await token.getCurrentPrice()
      expect(finalPrice).to.be.gt(initialPrice)
    })
  })

  describe('Staking', function () {
    it('Should allow staking and unstaking', async function () {
      const stakeAmount = ethers.utils.parseEther('100')

      // Transfer tokens to staker
      await token.connect(owner).transfer(staker1.address, stakeAmount)

      // Approve and stake
      await token.connect(staker1).approve(token.address, stakeAmount)
      await token.connect(staker1).stake(stakeAmount)

      // Check staked balance
      const stakedBalance = await token.getStakedBalance(staker1.address)
      expect(stakedBalance).to.equal(stakeAmount)

      // Unstake
      await token.connect(staker1).unstake(stakeAmount)

      // Check final balance
      const finalBalance = await token.balanceOf(staker1.address)
      expect(finalBalance).to.equal(stakeAmount)
    })
  })

  describe('Emergency Functions', function () {
    it('Should allow owner to pause and unpause', async function () {
      await token.connect(owner).pause()
      expect(await token.paused()).to.be.true

      await token.connect(owner).unpause()
      expect(await token.paused()).to.be.false
    })

    it('Should prevent staking when paused', async function () {
      const stakeAmount = ethers.utils.parseEther('100')
      await token.connect(owner).pause()

      await expect(
        token.connect(staker1).stake(stakeAmount),
      ).to.be.revertedWith('Pausable: paused')
    })
  })

  describe('Artist Withdrawals', function () {
    it('Should allow artist to withdraw accumulated funds', async function () {
      const royaltyAmount = ethers.utils.parseEther('10')
      const streamCount = 1000

      // Deposit royalties
      await token.connect(owner).depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })

      // Check artist's withdrawable balance (should be 70%)
      const withdrawableBalance = await token.getArtistWithdrawableBalance()
      expect(withdrawableBalance).to.equal(royaltyAmount.mul(70).div(100))

      // Get artist's initial balance
      const initialBalance = await ethers.provider.getBalance(ARTIST_ADDRESS)

      // Artist withdraws funds
      await token.connect(artist).artistWithdraw()

      // Check artist's new balance
      const finalBalance = await ethers.provider.getBalance(ARTIST_ADDRESS)
      expect(finalBalance.sub(initialBalance)).to.be.closeTo(
        withdrawableBalance,
        ethers.utils.parseEther('0.01'), // Allow for gas costs
      )

      // Check withdrawable balance is now 0
      expect(await token.getArtistWithdrawableBalance()).to.equal(0)
    })

    it('Should prevent non-artist from withdrawing', async function () {
      await expect(token.connect(staker1).artistWithdraw()).to.be.revertedWith(
        'Only artist can withdraw',
      )
    })

    it('Should prevent withdrawal when no funds available', async function () {
      await expect(token.connect(artist).artistWithdraw()).to.be.revertedWith(
        'No funds available',
      )
    })
  })
})
