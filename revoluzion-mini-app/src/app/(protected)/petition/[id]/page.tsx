'use client';

import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import PetitionRegistryABI from '@/abi/PetitionRegistry.json';
import { useState, useEffect } from 'react';
import { MiniKit, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { useParams } from 'next/navigation';
import { PETITION_REGISTRY_ADDRESS } from '@/lib/contracts';
import { useAccount } from 'wagmi';
import { decodeAbiParameters, parseAbiParameters } from 'viem'
import { useSession } from 'next-auth/react';

export default function PetitionPage() {
  const params = useParams();
  const petitionId = params.id ? parseInt(params.id as string) : 0;
  const { address } = useAccount();
  const { data: session } = useSession();
  const walletAddress = address || session?.user?.walletAddress;

  const [petition, setPetition] = useState<{
    title: string;
    description: string;
    supportCount: bigint;
    goal: bigint;
    createdAt: bigint;
  } | null>(null);
  const [isSupporting, setIsSupporting] = useState(false);
  const [supportStatus, setSupportStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  //console.log('Using App ID:', process.env.NEXT_PUBLIC_WLD_APP_ID);
  //console.log('🔵 Render state - petition:', !!petition, 'isSupporting:', isSupporting, 'supportStatus:', supportStatus, 'address:', !!address);

  useEffect(() => {
    async function fetchPetition() {
      if (petitionId > 0 && PETITION_REGISTRY_ADDRESS && PETITION_REGISTRY_ADDRESS !== '0x') {
        try {
          const data = await client.readContract({
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'getPetition',
            args: [petitionId],
          });
          setPetition(data as {
            title: string;
            description: string;
            supportCount: bigint;
            goal: bigint;
            createdAt: bigint;
          });
        } catch (error) {
          console.error('Error fetching petition:', error);
        }
      }
    }
    fetchPetition();
  }, [petitionId, client]);

  const handleSupport = async () => {
    console.log('🔵 Button clicked! Starting handleSupport...');
    console.log('🔵 Address:', walletAddress);
    console.log('🔵 Petition:', petition);
    console.log('🔵 isSupporting:', isSupporting);

    // In World App Mini Apps, we don't need a traditional wallet connection
    // The World App handles the wallet connection internally

    if (!petition || isSupporting) {
      console.log('🔴 No petition or already supporting, returning');
      return;
    }

    try {
      console.log('🟢 Setting isSupporting to true');
      setIsSupporting(true);
      console.log('1. Starting support process...');

      // Step 1: Verify with World ID
      console.log('2. Verifying with World ID...');

      if (!MiniKit.isInstalled()) {
        console.warn("Tried to invoke 'verify', but MiniKit is not installed.");
        alert("MiniKit is not installed. Please make sure you're running this in the World App.");
        return;
      }

      console.log('🟢 MiniKit is installed, proceeding with verification');

      const verifyPayload = {
        action: 'support-action',
        signal: walletAddress,
        verification_level: VerificationLevel.Orb,
      };

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (finalPayload.status === 'error') {
        console.log('World ID verification failed:', finalPayload);
        setSupportStatus('error');
        setErrorMessage(JSON.stringify(finalPayload));
        console.log(errorMessage);
        alert('World ID verification failed. Please try again.');
        return;
      }

      const successPayload = finalPayload as ISuccessResult;

      const txPayload = {
        transaction: [
          {
            address: "0x255286d8D754474e95e4485eCaE0c60D889803F6" as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'supportPetition',
            args: [
              petitionId,
              BigInt(successPayload.merkle_root),
              BigInt(successPayload.nullifier_hash),
              decodeAbiParameters(
                parseAbiParameters('uint256[8]'),
                successPayload.proof as `0x${string}`
              )[0],
            ],
          },
        ],
      };

      console.log(txPayload);

      console.log('5. Sending transaction...');
      const { finalPayload: txFinalPayload } = await MiniKit.commandsAsync.sendTransaction(txPayload);

      console.log('6. Transaction response:', txFinalPayload);

      if (txFinalPayload.status === 'success') {
        console.log('Transaction successful!');
        setSupportStatus('success');
        alert('Successfully supported the petition!');
        // Refresh the page to show updated data
        setTimeout(() => {
          setSupportStatus('idle');
        }, 5000);
      } else {
        console.error('Transaction failed:', txFinalPayload);
        setSupportStatus('error');
        setErrorMessage(JSON.stringify(txFinalPayload));
        alert('Transaction failed. Please try again.');
      }
    } catch (error) {
      console.error('Error supporting petition:', error);
      setSupportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      console.log(errorMessage);
      alert('An error occurred. Please try again.');
    } finally {
      console.log('🟢 Setting isSupporting to false');
      setIsSupporting(false);
    }
  };

  // const handleSupport = async () => {
  //   console.log('🔵 Button clicked! Starting handleSupport...');
  //   console.log('🔵 Address:', address);
  //   console.log('🔵 Petition:', petition);
  //   console.log('🔵 isSupporting:', isSupporting);

  //   // In World App Mini Apps, we don't need a traditional wallet connection
  //   // The World App handles the wallet connection internally

  //   if (!petition || isSupporting) {
  //     console.log('🔴 No petition or already supporting, returning');
  //     return;
  //   }

  //   try {
  //     console.log('🟢 Setting isSupporting to true');
  //     setIsSupporting(true);
  //     console.log('1. Starting support process...');

  //     // Step 1: Verify with World ID
  //     console.log('2. Verifying with World ID...');

  //     if (!MiniKit.isInstalled()) {
  //       console.warn("Tried to invoke 'verify', but MiniKit is not installed.");
  //       alert("MiniKit is not installed. Please make sure you're running this in the World App.");
  //       return;
  //     }

  //     console.log('🟢 MiniKit is installed, proceeding with verification');

  //     const verifyPayload = {
  //       action: 'support-action',
  //       signal: petitionId.toString(),
  //       verification_level: VerificationLevel.Orb,
  //     };

  //     console.log('🟢 Verify payload:', verifyPayload);

  //     const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

  //     console.log('🟢 Verification response:', finalPayload);

  //     if (finalPayload.status === 'error') {
  //       console.log('World ID verification failed:', finalPayload);
  //       setSupportStatus('error');
  //       setErrorMessage(JSON.stringify(finalPayload));
  //       alert('World ID verification failed. Please try again.');
  //       return;
  //     }

  //     console.log('3. World ID verification successful:', finalPayload);

  //     // Step 2: Send transaction with verified proof
  //     console.log('4. Preparing transaction...');

  //     const successPayload = finalPayload as ISuccessResult;
  //     console.log("------------successPayload------------");
  //     console.log(successPayload);

  //     const unpackedProof = abi.decode(['uint256[8]'], successPayload.proof)[0] as string[];
  //     if (unpackedProof.length !== 8) {
  //       throw new Error('Invalid proof length');
  //     }
  //     const proofBigInts = unpackedProof.map(p => BigInt(p)) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];

  //     const txPayload = {
  //       transaction: [
  //         {
  //           address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
  //           abi: PetitionRegistryABI,
  //           functionName: 'supportPetition',
  //           args: [
  //             BigInt(petitionId),
  //             BigInt(successPayload.merkle_root),
  //             BigInt(successPayload.nullifier_hash),
  //             proofBigInts
  //           ],
  //         },
  //       ],
  //     };

  //     console.log(txPayload);

  //     console.log('5. Sending transaction...');
  //     const { finalPayload: txFinalPayload } = await MiniKit.commandsAsync.sendTransaction(txPayload);

  //     console.log('6. Transaction response:', txFinalPayload);

  //     if (txFinalPayload.status === 'success') {
  //       console.log('Transaction successful!');
  //       setSupportStatus('success');
  //       alert('Successfully supported the petition!');
  //       // Refresh the page to show updated data
  //       setTimeout(() => {
  //         setSupportStatus('idle');
  //       }, 5000);
  //     } else {
  //       console.error('Transaction failed:', txFinalPayload);
  //       setSupportStatus('error');
  //       setErrorMessage(JSON.stringify(txFinalPayload));
  //       alert('Transaction failed. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Error supporting petition:', error);
  //     setSupportStatus('error');
  //     setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
  //     alert('An error occurred. Please try again.');
  //   } finally {
  //     console.log('🟢 Setting isSupporting to false');
  //     setIsSupporting(false);
  //   }
  // };

  if (!petition) {
    return (
      <Page>
        <UserInfo />
        <div className="flex flex-col items-center justify-center space-y-8">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <UserInfo />
      <div className="flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto p-4">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{petition.title}</h1>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{petition.description}</p>

          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-sm text-gray-500">Current Support:</span>
              <span className="text-lg font-semibold text-gray-900 ml-2">
                {petition.supportCount?.toString() || '0'} / {petition.goal?.toString() || '100'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm text-gray-700 ml-2">
                {petition.createdAt ? new Date(Number(petition.createdAt) * 1000).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (Number(petition.supportCount || 0) / Number(petition.goal || 100)) * 100)}%`
              }}
            ></div>
          </div>

          <button
            onClick={handleSupport}
            disabled={isSupporting || supportStatus === 'success'}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: isSupporting || supportStatus === 'success' ? '#cccccc' : '#0066cc',
              color: 'white',
              border: '2px solid #000',
              borderRadius: '8px',
              cursor: isSupporting || supportStatus === 'success' ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {isSupporting ? 'Supporting...' : supportStatus === 'success' ? 'Supported ✓' : 'Support This Petition'}
          </button>

          {/* <div style={{
            marginTop: '32px',
            padding: '16px',
            border: '3px solid red',
            backgroundColor: '#ffeeee',
            borderRadius: '8px'
          }}>
            <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '16px' }}>
              DEBUG: World App: {typeof window !== 'undefined' && window.location.hostname ? '✓ Running' : '✗ Not Running'} | Petition: {petition ? '✓ Loaded' : '✗ Not Loaded'} | MiniKit: {typeof MiniKit !== 'undefined' ? '✓ Available' : '✗ Not Available'}
            </div>

            <button
              onClick={handleSupport}
              disabled={isSupporting || supportStatus === 'success'}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: isSupporting || supportStatus === 'success' ? '#cccccc' : '#0066cc',
                color: 'white',
                border: '2px solid #000',
                borderRadius: '8px',
                cursor: isSupporting || supportStatus === 'success' ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isSupporting ? 'Supporting...' : supportStatus === 'success' ? 'Supported ✓' : 'Support This Petition'}
            </button>

            <button
              onClick={() => {
                console.log('🟢 Test button clicked!');
                alert('Test button works!');
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#666666',
                color: 'white',
                border: '2px solid #000',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              Test Click (Debug)
            </button>

            <button
              onClick={async () => {
                console.log('🔵 Testing World ID Router...');
                const isWorking = await testWorldIdRouter();
                alert(isWorking ? 'World ID Router is working!' : 'World ID Router test failed - check console');
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#9333ea',
                color: 'white',
                border: '2px solid #000',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              Test World ID Router
            </button>

            <button
              onClick={async () => {
                try {
                  console.log('🔵 Testing complete World ID setup...');

                  // 1. Check if World ID router exists
                  const WORLD_ID_ROUTER = '0x57b930D551e677CC36e2fA036Ae2fe8FdaE0330D';
                  const bytecode = await client.getBytecode({
                    address: WORLD_ID_ROUTER as `0x${string}`
                  });

                  console.log('🟢 World ID Router exists:', !!bytecode);

                  // 2. Check your contract's router
                  const contractRouter = await client.readContract({
                    address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
                    abi: PetitionRegistryABI,
                    functionName: 'worldIdRouter',
                    args: []
                  });

                  console.log('🟢 Contract Router:', contractRouter);

                  // 3. Check group ID
                  const groupId = await client.readContract({
                    address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
                    abi: PetitionRegistryABI,
                    functionName: 'groupId',
                    args: []
                  });

                  console.log('🟢 Contract Group ID:', groupId);

                  // 4. Compare addresses
                  const routerMatch = contractRouter && typeof contractRouter === 'string'
                    ? contractRouter.toLowerCase() === WORLD_ID_ROUTER.toLowerCase()
                    : false;
                  const groupIdCorrect = groupId?.toString() === '1';

                  let message = `World ID Router: ${!!bytecode ? '✓' : '✗'}\n`;
                  message += `Contract Router: ${contractRouter}\n`;
                  message += `Router Match: ${routerMatch ? '✓' : '✗'}\n`;
                  message += `Group ID: ${groupId} ${groupIdCorrect ? '✓' : '✗'}\n`;

                  if (!routerMatch) {
                    message += `\n⚠️ Router mismatch!\nExpected: ${WORLD_ID_ROUTER}\nActual: ${contractRouter}`;
                  }

                  alert(message);
                } catch (error) {
                  console.error('🔴 Complete test failed:', error);
                  alert('Complete test failed - check console');
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: '2px solid #000',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              Complete World ID Test
            </button>
          </div>

          {supportStatus === 'error' && (
            <p className="text-red-600 text-sm mt-2 text-center">
              Failed to support petition. Please try again.
            </p>
          )}

          {errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#ffeeee',
              border: '1px solid #ff0000',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#cc0000'
            }}>
              <strong>Error Details:</strong><br />
              {errorMessage}
            </div>
          )} */}

          {supportStatus === 'success' && (
            <p className="text-green-600 text-sm mt-2 text-center">
              Thank you for your support!
            </p>
          )}
        </div>
      </div>
    </Page>
  );
} 