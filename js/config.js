/* All tunable facts live here, each with its source. Update this file when FungoLabs publishes new details. */
window.CHECKER_CONFIG = {
  siteName: "SazidFungo.checker",
  // Official Zama OG NFT contract (listed on zama.org/post/zama-og-nft-claim-portal-is-live)
  contract: '0xb3f2ddaed136cf10d5b228ee2eff29b71c7535fc',
  // FungoLabs thread: 10B total supply, Zama OG holders get 7%
  totalSupply: 10_000_000_000,
  zamaOgPool: 700_000_000,
  // Collection size used for the per-NFT share (community figure: 700,000,000 / 4,996 = 140,112.09)
  collectionSize: 4996,
  perNft: 140112,
  claimDays: 7,
  // FDV scenarios are GUESSES: $FUNGO has no market price yet.
  // 25.1M = 10B supply x $0.00251 expected TGE price (community-supplied, NOT official)
  expectedTgePrice: 0.00251,
  fdvScenarios: [5e6, 10e6, 25.1e6, 50e6, 100e6],
  fdvDefault: 25.1e6,
  // Public RPCs, raced in parallel; first good answer wins.
  rpcs: [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.drpc.org',
    'https://rpc.mevblocker.io',
    'https://1rpc.io/eth',
    'https://eth-mainnet.public.blastapi.io'
  ],
  ensRegistry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  sample: '0xdfa8e3a0f2096ec0f3dced725fa703072922323d',
  campaign: {
    url: 'https://fungolabs.org/launchpad/c/cfpdxjt4',
    pool: 300_000_000,
    // closesAt from the public campaign page data: 2026-11-30 14:00 UTC
    closesAtUtc: '2026-11-30T14:00:00Z'
  }
};
