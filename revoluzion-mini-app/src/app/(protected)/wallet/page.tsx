'use client';

import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import { RVZ_TOKEN_ADDRESS, WLD_TOKEN_ADDRESS } from '@/lib/contracts';
import { useAccount, useBalance } from 'wagmi';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { erc20Abi } from 'viem';
import Image from 'next/image';

export default function Wallet() {
  const { address } = useAccount();
  const { data: session } = useSession();
  const [debugInfo, setDebugInfo] = useState<{
    wagmiAddress?: string;
    sessionAddress?: string;
    combinedAddress?: string;
    rvzTokenAddress?: string;
    wldTokenAddress?: string;
    rvzError?: string;
    wldError?: string;
    rvzBalanceData?: unknown;
    wldBalanceData?: unknown;
  }>({});

  // Use wagmi for balance fetching
  const walletAddress = address || session?.user?.walletAddress;
  
  const { data: rvzBalanceData, isLoading: isRvzBalanceLoading, error: rvzError } = useBalance({
    address: walletAddress as `0x${string}`,
    token: RVZ_TOKEN_ADDRESS,
  });

  const { data: wldBalanceData, isLoading: isWldBalanceLoading, error: wldError } = useBalance({
    address: walletAddress as `0x${string}`,
    token: WLD_TOKEN_ADDRESS,
  });

  // Alternative balance fetching using viem directly
  const [viemBalances, setViemBalances] = useState<{
    rvz: string | null;
    wld: string | null;
  }>({ rvz: null, wld: null });

  useEffect(() => {
    const fetchBalancesWithViem = async () => {
      // Use wagmi address first, fallback to session address
      const walletAddress = address || session?.user?.walletAddress;
      if (!walletAddress) return;

      const client = createPublicClient({
        chain: worldchain,
        transport: http(),
      });

      try {
        // Try to fetch RVZ balance with viem
        if (RVZ_TOKEN_ADDRESS && RVZ_TOKEN_ADDRESS !== '0x') {
          const rvzBalance = await client.readContract({
            address: RVZ_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          });
          const rvzDecimals = await client.readContract({
            address: RVZ_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'decimals',
          });
          setViemBalances(prev => ({
            ...prev,
            rvz: (Number(rvzBalance) / Math.pow(10, rvzDecimals)).toFixed(4)
          }));
        }

        // Try to fetch WLD balance with viem
        if (WLD_TOKEN_ADDRESS && WLD_TOKEN_ADDRESS !== '0x') {
          const wldBalance = await client.readContract({
            address: WLD_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          });
          const wldDecimals = await client.readContract({
            address: WLD_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'decimals',
          });
          setViemBalances(prev => ({
            ...prev,
            wld: (Number(wldBalance) / Math.pow(10, wldDecimals)).toFixed(4)
          }));
        }
      } catch (error) {
        console.error('Error fetching balances with viem:', error);
      }
    };

    fetchBalancesWithViem();
  }, [address, session?.user?.walletAddress]);

  // Debug information
  useEffect(() => {
    setDebugInfo({
      wagmiAddress: address,
      sessionAddress: session?.user?.walletAddress,
      combinedAddress: walletAddress,
      rvzTokenAddress: RVZ_TOKEN_ADDRESS,
      wldTokenAddress: WLD_TOKEN_ADDRESS,
      rvzError: rvzError?.message,
      wldError: wldError?.message,
      rvzBalanceData: rvzBalanceData,
      wldBalanceData: wldBalanceData,
    });
    console.log(debugInfo);
  }, [address, session, rvzBalanceData, wldBalanceData, rvzError, wldError, walletAddress]);

  const rvzBalanceDisplay = isRvzBalanceLoading
    ? 'Loading...'
    : rvzBalanceData
    ? parseFloat(rvzBalanceData.formatted).toFixed(4)
    : viemBalances.rvz || '0.0000';

  const wldBalanceDisplay = isWldBalanceLoading
    ? 'Loading...'
    : wldBalanceData
    ? parseFloat(wldBalanceData.formatted).toFixed(4)
    : viemBalances.wld || '0.0000';

  // Mock data for transactions - will be replaced in the future
  const mockTransactions = [
    { id: 1, type: 'in', token: 'RVZ', amount: '+ 500', date: '2023-10-26' },
    { id: 2, type: 'out', token: 'WLD', amount: '- 2.5', date: '2023-10-25' },
    { id: 3, type: 'in', token: 'RVZ', amount: '+ 100', date: '2023-10-24' },
  ];

  const totalValueDisplay =
    isRvzBalanceLoading || isWldBalanceLoading
      ? '...'
      : `$${(
          parseFloat(rvzBalanceDisplay) * 0.15 + // Mock price for RVZ
          parseFloat(wldBalanceDisplay) * 2.5 // Mock price for WLD
        ).toFixed(2)}`;

  return (
    <Page>
       <Page.Header className="p-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Revoluzion" 
              className="h-8 w-8 rounded-full"
              style={{ objectFit: 'cover' }}
              width={32}
              height={32}
            />
            <span className="text-xl font-bold text-black">Revoluzion</span>
          </div>
          <div className="flex items-center gap-2">
      <UserInfo />
          </div>
        </div>
      </Page.Header>

      <Page.Main className="bg-gray-50">
        <div className="px-4 py-6" style={{marginBottom: "50px"}}>
          <div 
            className="rounded-2xl p-6 mb-8 text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
            }}
          >
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">Total Balance (USD)</h2>
              <p className="text-3xl font-bold tracking-tight">
                {totalValueDisplay}
              </p>
              <div className="mt-4 text-xs text-gray-400 truncate">
                {walletAddress ?? 'Not connected'}
              </div>
            </div>
          </div>
        
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <h3 className="text-sm font-medium text-gray-500">RVZ Balance</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{viemBalances.rvz}</p>
              {rvzError && <p className="text-xs text-red-500 mt-1">Error: {rvzError.message}</p>}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <h3 className="text-sm font-medium text-gray-500">WLD Balance</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{wldBalanceDisplay}</p>
              {wldError && <p className="text-xs text-red-500 mt-1">Error: {wldError.message}</p>}
            </div>
          </div>

          {/* Debug Information - Remove in production */}
          {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <p><strong>Wagmi Address:</strong> {debugInfo.wagmiAddress || 'Not connected'}</p>
              <p><strong>Session Address:</strong> {debugInfo.sessionAddress || 'Not available'}</p>
              <p><strong>Combined Address:</strong> {debugInfo.combinedAddress || 'Not available'}</p>
              <p><strong>RVZ Token:</strong> {debugInfo.rvzTokenAddress}</p>
              <p><strong>WLD Token:</strong> {debugInfo.wldTokenAddress}</p>
              <p><strong>Viem RVZ Balance:</strong> {viemBalances.rvz || 'Not fetched'}</p>
              <p><strong>Viem WLD Balance:</strong> {viemBalances.wld || 'Not fetched'}</p>
              {debugInfo.rvzError && <p><strong>RVZ Error:</strong> {debugInfo.rvzError}</p>}
              {debugInfo.wldError && <p><strong>WLD Error:</strong> {debugInfo.wldError}</p>}
            </div>
          </div> */}

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity (Mock)</h3>
            <div className="space-y-3">
              {mockTransactions.map(tx => (
                <div key={tx.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{tx.token} Transfer</p>
                    <p className="text-sm text-gray-500">{tx.date}</p>
              </div>
                  <p className={`font-semibold ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount} {tx.token}
                  </p>
              </div>
              ))}
            </div>
          </div>

        </div>
      </Page.Main>
    </Page>
  );
} 