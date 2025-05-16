import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'AES Encryption',
  projectId: '2b90d3809876ae90416a7944a0abdec2',
  chains: [
   sepolia
  ],
  // ssr: true,
});
