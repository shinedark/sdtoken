const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('SDToken', function () {
  let SDToken, MockStrategy, MockDelegationManager
  let sdToken, mockStrategy, mockDelegationManager
  let owner, artist, user1, user2
  const MONTH = 30 * 24 * 60 * 60 // 30 days in seconds

  beforeEach(async function () {
    ;[owner, artist, user1, user2] = await ethers.getSigners()

    // Deploy mock contracts
    MockStrategy = await ethers.getContractFactory('MockStrategy')
    mockStrategy = await MockStrategy.deploy()

    MockDelegationManager = await ethers.getContractFactory(
      'MockDelegationManager',
    )
    mockDelegationManager = await MockDelegationManager.deploy()

    // Deploy SDToken
    SDToken = await ethers.getContractFactory('SDToken')
    sdToken = await SDToken.deploy(
      await mockStrategy.getAddress(),
      await mockDelegationManager.getAddress(),
    )
  })

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await sdToken.owner()).to.equal(owner.address)
    })

    it('Should set the correct initial supply', async function () {
      const totalSupply = await sdToken.totalSupply()
      expect(totalSupply).to.equal(ethers.parseEther('1000000'))
    })

    it('Should set the correct EigenLayer contracts', async function () {
      expect(await sdToken.eigenStrategy()).to.equal(
        await mockStrategy.getAddress(),
      )
      expect(await sdToken.delegationManager()).to.equal(
        await mockDelegationManager.getAddress(),
      )
    })
  })

  describe('Staking', function () {
    const stakeAmount = ethers.parseEther('100')

    beforeEach(async function () {
      // Transfer tokens to user1
      await sdToken.transfer(user1.address, stakeAmount)
    })

    it('Should allow users to stake tokens', async function () {
      await sdToken
        .connect(user1)
        .approve(await mockStrategy.getAddress(), stakeAmount)
      await sdToken.connect(user1).stake(stakeAmount)

      expect(await sdToken.getStakedBalance(user1.address)).to.equal(
        stakeAmount,
      )
      expect(await mockStrategy.shares(user1.address)).to.equal(stakeAmount)
    })

    it('Should not allow staking more than balance', async function () {
      const tooMuch = stakeAmount.mul(2)
      await expect(sdToken.connect(user1).stake(tooMuch)).to.be.revertedWith(
        'Insufficient balance',
      )
    })
  })

  describe('Royalty Distribution', function () {
    const royaltyAmount = ethers.parseEther('1')
    const streamCount = 1000

    it('Should distribute royalties correctly', async function () {
      await sdToken.depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })

      const monthIndex = Math.floor(Date.now() / 1000 / MONTH)
      const royalty = await sdToken.getMonthlyRoyalty(monthIndex)

      expect(royalty.totalAmount).to.equal(royaltyAmount)
      expect(royalty.streamCount).to.equal(streamCount)
      expect(royalty.distributed).to.be.true
    })

    it('Should update token metrics after royalty distribution', async function () {
      await sdToken.depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })

      const metrics = await sdToken.tokenMetrics()
      expect(metrics.totalStreamCount).to.equal(streamCount)
      expect(metrics.totalRoyalties).to.equal(royaltyAmount)
    })
  })

  describe('Artist Withdrawal', function () {
    const royaltyAmount = ethers.parseEther('1')
    const streamCount = 1000

    beforeEach(async function () {
      await sdToken.depositMonthlyRoyalties(streamCount, {
        value: royaltyAmount,
      })
    })

    it('Should allow artist to withdraw their share', async function () {
      const artistBalanceBefore = await ethers.provider.getBalance(
        artist.address,
      )
      await sdToken.connect(artist).artistWithdraw()
      const artistBalanceAfter = await ethers.provider.getBalance(
        artist.address,
      )

      const expectedShare = (royaltyAmount * 70) / 100 // 70% artist share
      expect(artistBalanceAfter - artistBalanceBefore).to.be.closeTo(
        expectedShare,
        ethers.parseEther('0.01'), // Allow for gas costs
      )
    })
  })
})
