import { type Address } from 'viem';

export const RVZ_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_RVZ_TOKEN_ADDRESS ?? '0x') as `0x${string}`;

// Worldcoin token address on World Chain
export const WLD_TOKEN_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as `0x${string}`;

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export const PETITION_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_PETITION_REGISTRY_ADDRESS as Address) ??
  '0x255286d8D754474e95e4485eCaE0c60D889803F6'; 