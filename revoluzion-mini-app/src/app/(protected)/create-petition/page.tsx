'use client';

import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import PetitionRegistryABI from '@/abi/PetitionRegistry.json';
import RVZTokenABI from '@/abi/RVZToken.json';
import { useState, useEffect } from 'react';
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'
//import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { createPublicClient, http, formatUnits } from 'viem';
import { worldchain } from 'viem/chains';
import Image from 'next/image';
import {
  PETITION_REGISTRY_ADDRESS,
  PERMIT2_ADDRESS,
  RVZ_TOKEN_ADDRESS,
} from '@/lib/contracts';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { Spinner } from "flowbite-react";
import { useRouter } from 'next/navigation';

// Standard burn amount - you should fetch this from the contract
const BURN_AMOUNT = '1000000000000000000'; // 1 RVZ token (18 decimals)

const CreatePetitionPage = () => {
  const { address } = useAccount();
  const { data: session } = useSession();

  // Use wagmi address first, fallback to session address
  const walletAddress = address || session?.user?.walletAddress;
  const [rvzBalance, setRvzBalance] = useState<number>(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [contractInfo, setContractInfo] = useState<{
    rvzTokenAddress: string | null;
    permit2Address: string | null;
    burnAmount: string | null;
    isInitialized: boolean;
  }>({
    rvzTokenAddress: null,
    permit2Address: null,
    burnAmount: null,
    isInitialized: false,
  });
  const router = useRouter();

  // Feel free to use your own RPC provider for better performance
  const client = createPublicClient({
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
  });

  // const {
  //   isLoading: isConfirming,
  //   isSuccess: isConfirmed,
  //   isError: isTransactionError,
  //   error: transactionError,
  // } = useWaitForTransactionReceipt({
  //   client: client,
  //   appConfig: {
  //     app_id: process.env.NEXT_PUBLIC_WLD_APP_ID as `app_${string}`,
  //   },
  //   transactionId: transactionId,
  // });

  // Fetch contract configuration on component mount
  useEffect(() => {
    const fetchContractInfo = async () => {
      if (!PETITION_REGISTRY_ADDRESS || PETITION_REGISTRY_ADDRESS === '0x') {
        console.warn('PetitionRegistry contract address not set.');
        return;
      }

      try {
        const [contractRvzAddress, contractPermit2Address, contractBurnAmount] = await Promise.all([
          client.readContract({
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'rvzTokenAddress',
          }),
          client.readContract({
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'permit2Address',
          }),
          client.readContract({
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'burnAmount',
          }),
        ]);

        setContractInfo({
          rvzTokenAddress: contractRvzAddress as string,
          permit2Address: contractPermit2Address as string,
          burnAmount: (contractBurnAmount as bigint).toString(),
          isInitialized: true,
        });

        // console.log('Contract configuration:', {
        //   contractRvzAddress,
        //   configuredRvzAddress: RVZ_TOKEN_ADDRESS,
        //   match: contractRvzAddress === RVZ_TOKEN_ADDRESS,
        //   contractPermit2Address,
        //   configuredPermit2Address: PERMIT2_ADDRESS,
        //   contractBurnAmount: (contractBurnAmount as bigint).toString(),
        // });
      } catch (error) {
        console.error('Error fetching contract info:', error);
      }
    };

    fetchContractInfo();
  }, [client]);

  useEffect(() => {
    const getBalanceRVZ = async () => {
      const balance = await client.readContract({
        address: RVZ_TOKEN_ADDRESS,
        abi: RVZTokenABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });
      const rawBalance = balance as bigint;
      const formattedBalance = Number(formatUnits(rawBalance, 18));
      setRvzBalance(formattedBalance);
      console.log("balance: " + formattedBalance);
      console.log("rvzBalance: " + rvzBalance)
    };
    getBalanceRVZ();
  }, [rvzBalance]);

  useEffect(() => {
    if (transactionId != "error" && transactionId != "") {
      setTimeout(() => {
        console.log('Petition created successfully!');
        setSubmitStatus('success');
        setIsSubmitting(false);
        // Reset form
        setFormData({
          title: '',
          description: '',
          goal: 100
        });
        setTimeout(async () => {
          setSubmitStatus('idle');

          const client = createPublicClient({
            chain: worldchain,
            transport: http(),
          });

          const lastId = await client.readContract({
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'getLastPetitionId',
          });
          router.push('/petition/' + lastId);
        }, 1000);
      }, 5000);
    }
  }, [transactionId]);

  const verifyPayload: VerifyCommandInput = {
    action: 'voting-action', // This is your action ID from the Developer Portal
    signal: '0x12312', // Optional additional data
    verification_level: VerificationLevel.Orb, // Orb | Device
  }

  const handleVerify = async (): Promise<boolean> => {
    if (!MiniKit.isInstalled()) {
      console.log("MiniKit Not Ready");
      return false;
    }

    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (finalPayload.status === 'error') {
        console.log('Error payload', finalPayload);
        return false;
      }
      const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
      console.log(app_id);

      const verifyResponse = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
          action: 'voting-action',
          signal: '0x12312',
        }),
      });

      const verifyResponseJson = await verifyResponse.json();
      console.log(verifyResponseJson);

      if (verifyResponseJson.status === 200) {
        console.log('Verification success!');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Verification error:', err);
      return false;
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Run validation and get the errors directly
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters long';
    }

    if (formData.goal < 1) {
      newErrors.goal = 'Goal must be at least 1 supporter';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      console.error('Form validation failed:', newErrors);
      return;
    }

    if (!walletAddress) {
      console.error('No wallet connected');
      setSubmitStatus('error');
      return;
    }

    const isVerified = await handleVerify();

    if (!isVerified) {
      console.log("Error verifying");
      return;
    }

    console.log('Form submitted, starting validation...');
    console.log('Current form data:', formData);

    // Check token configuration
    if (contractInfo.isInitialized && contractInfo.rvzTokenAddress !== RVZ_TOKEN_ADDRESS) {
      console.error('Token configuration mismatch:', {
        contractToken: contractInfo.rvzTokenAddress,
        configuredToken: RVZ_TOKEN_ADDRESS
      });
      setSubmitStatus('error');
      return;
    }

    // Check if user has enough RVZ tokens
    const actualBurnAmount = contractInfo.burnAmount || BURN_AMOUNT;
    try {
      const userBalance = await client.readContract({
        address: RVZ_TOKEN_ADDRESS as `0x${string}`,
        abi: [
          {
            "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      console.log('User RVZ balance:', userBalance.toString());
      console.log('Required burn amount:', actualBurnAmount);

      if (BigInt(userBalance.toString()) < BigInt(actualBurnAmount)) {
        console.error('Insufficient RVZ balance:', {
          userBalance: userBalance.toString(),
          required: actualBurnAmount
        });
        setSubmitStatus('error');
        setIsSubmitting(false);
        return;
      }
    } catch (balanceError) {
      console.error('Error checking user balance:', balanceError);
      // Continue anyway - let the transaction fail if needed
    }

    setIsSubmitting(true);
    setSubmitStatus('pending');
    setTransactionId('');

    try {
      // Create permit2 for RVZ token transfer
      // Permit2 is valid for max 1 hour as per World Chain docs
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes from now
      const nonce = Date.now(); // Use timestamp as nonce for simplicity

      // Use the contract's burn amount instead of hardcoded value

      console.log('Creating petition with Permit2:', {
        title: formData.title,
        description: formData.description,
        goal: formData.goal,
        burnAmount: BURN_AMOUNT,
        contractBurnAmount: actualBurnAmount,
        deadline,
        nonce,
        petitionRegistry: PETITION_REGISTRY_ADDRESS,
        rvzToken: RVZ_TOKEN_ADDRESS,
        permit2: PERMIT2_ADDRESS,
        walletAddress
      });

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
            abi: PetitionRegistryABI,
            functionName: 'createPetitionWithPermit2',
            args: [
              formData.title,
              formData.description,
              BigInt(formData.goal),
              // Permit2 struct: PermitTransferFrom
              {
                permitted: {
                  token: RVZ_TOKEN_ADDRESS as `0x${string}`,
                  amount: BigInt(actualBurnAmount),
                },
                nonce: BigInt(nonce),
                deadline: BigInt(deadline),
              },
              'PERMIT2_SIGNATURE_PLACEHOLDER_0', // Placeholder for MiniKit to inject the Permit2 signature
            ],
          },
        ],
        permit2: [
          {
            permitted: {
              token: RVZ_TOKEN_ADDRESS as `0x${string}`,
              amount: actualBurnAmount.toString(),
            },
            nonce: nonce.toString(),
            deadline: deadline.toString(),
            spender: PETITION_REGISTRY_ADDRESS as `0x${string}`, // PetitionRegistry contract will spend the tokens
          },
        ],
      });

      console.log('MiniKit response:', finalPayload);

      if (finalPayload.status === 'success') {
        console.log('Transaction submitted successfully:', finalPayload.transaction_id);
        setTransactionId(finalPayload.transaction_id);
      } else {
        console.error('Transaction submission failed:', finalPayload);
        console.error('Full error details:', JSON.stringify(finalPayload, null, 2));
        if ('details' in finalPayload && finalPayload.details) {
          console.error('Simulation Details:', finalPayload.details);
        }
        setTransactionId("error");
        setSubmitStatus('error');
        setIsSubmitting(false);
        setTimeout(() => {
          setSubmitStatus('idle');
          setTransactionId("");
        }, 5000);
      }
    } catch (err) {
      console.error('Error creating petition:', err);
      setSubmitStatus('error');
      setIsSubmitting(false);
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const isFormValid = () => {
    return formData.title.trim() !== '' && formData.description.trim() !== '';
  };

  const getButtonText = () => {
    switch (submitStatus) {
      case 'pending':
        return 'Creating Petition...';
      case 'success':
        return 'Petition Created!';
      case 'error':
        return 'Failed - Try Again';
      default:
        return 'Launch Your Petition';
    }
  };

  const getButtonClass = () => {
    switch (submitStatus) {
      case 'pending':
        return 'w-full bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl cursor-not-allowed';
      case 'success':
        return 'w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-xl';
      case 'error':
        return 'w-full bg-red-700 text-white font-semibold py-4 px-6 rounded-xl hover:bg-red-800 transition-colors duration-200';
      default:
        return 'w-full bg-red-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-sm';
    }
  };

  return (
    <>
      <Page.Header className="p-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              className="text-red-600 font-semibold"
              onClick={() => window.history.back()}
            >
              ← Back
            </button>
          </div>
          <h1 className="text-lg font-bold text-black">Create Petition</h1>
          <div className="flex items-center gap-2">
            <UserInfo />
          </div>
        </div>
      </Page.Header>
      <Page.Main className="bg-gray-50 pb-20">
        <div className="px-4 py-6" style={{ marginBottom: "60px" }}>
          {/* Hero Section */}
          <div
            className="rounded-2xl p-6 mb-8 text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
            }}
          >
            <div className="text-center">
              <div className="mb-4">
                <Image
                  src="/logo.png"
                  alt="Revoluzion Logo"
                  className="mx-auto h-12 w-12 rounded-full"
                  width={48}
                  height={48}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <h1 className="text-xl font-bold mb-2">
                Start Your Revolution
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: '#fee2e2' }}>
                Create a petition that can change the world
              </p>
            </div>
          </div>

          {/* Wallet Connection Check */}
          {!walletAddress && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Wallet Not Connected
                  </h3>
                  <div className="mt-1 text-sm text-yellow-700">
                    Please connect your wallet to create a petition.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Information - Remove in production */}
          {/* <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">Debug Info:</h4>
            <div className="text-xs text-gray-700 space-y-1">
              <p><strong>Wagmi Address:</strong> {address || 'Not connected'}</p>
              <p><strong>Session Address:</strong> {session?.user?.walletAddress || 'Not available'}</p>
              <p><strong>Combined Address:</strong> {walletAddress || 'Not available'}</p>
              <p><strong>Can Create Petition:</strong> {walletAddress ? 'Yes' : 'No'}</p>

              <div className="mt-3 pt-2 border-t border-gray-300">
                <p><strong>Contract Configuration:</strong></p>
                <p className="ml-2">• Contract RVZ Token: {contractInfo.rvzTokenAddress || 'Loading...'}</p>
                <p className="ml-2">• Our RVZ Token: {RVZ_TOKEN_ADDRESS}</p>
                <p className="ml-2">• Tokens Match: {
                  contractInfo.isInitialized
                    ? (contractInfo.rvzTokenAddress === RVZ_TOKEN_ADDRESS ? '✅ Yes' : '❌ No')
                    : 'Loading...'
                }</p>
                <p className="ml-2">• Contract Permit2: {contractInfo.permit2Address || 'Loading...'}</p>
                <p className="ml-2">• Our Permit2: {PERMIT2_ADDRESS}</p>
                <p className="ml-2">• Burn Amount: {contractInfo.burnAmount || 'Loading...'}</p>
              </div>
            </div>
          </div> */}

          {/* Token Mismatch Warning */}
          {/* {contractInfo.isInitialized && contractInfo.rvzTokenAddress !== RVZ_TOKEN_ADDRESS && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Token Configuration Mismatch
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    The RVZ token address in the smart contract ({contractInfo.rvzTokenAddress}) doesn&apos;t match our configured address ({RVZ_TOKEN_ADDRESS}). This will cause the &ldquo;Invalid token&rdquo; error. Please update the environment variable or reinitialize the contract.
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Success!
                  </h3>
                  <div className="mt-1 text-sm text-green-700">
                    Your petition has been created successfully! RVZ tokens have been burned and your petition is now live on the blockchain.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Transaction Failed
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    Failed to create petition. Please ensure you have sufficient RVZ tokens and try again. Check the console for debug information.
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Petition Title */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Petition Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="What change do you want to see?"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none ${errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                maxLength={100}
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Make it clear and compelling</p>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tell Your Story *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Explain why this petition matters. What's the problem? What solution are you proposing? Why should people care?"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-32 resize-none ${errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                maxLength={1000}
              />
              {errors.description && (
                <p className="text-xs text-red-600 mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Be specific and passionate</p>
            </div>

            {/* Support Goal */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Support Goal *
              </label>
              <select
                value={formData.goal}
                onChange={(e) => handleInputChange('goal', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              >
                <option value={100}>100 supporters</option>
                <option value={500}>500 supporters</option>
                <option value={1000}>1,000 supporters</option>
                <option value={5000}>5,000 supporters</option>
                <option value={10000}>10,000 supporters</option>
                <option value={50000}>50,000 supporters</option>
                <option value={100000}>100,000 supporters</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Set your target number of supporters</p>
            </div>

            {/* Token Burn Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Creating a petition requires burning 10 RVZ token.
                  </h3>
                </div>
              </div>
            </div>

            {/* Permit2 Technical Info */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Permit2 Integration
                  </h3>
                  <div className="mt-1 text-sm text-blue-700">
                    This petition system uses Permit2 for secure, gasless token transfers. No pre-approval required - just sign the transaction and your tokens will be automatically burned upon petition creation.
                  </div>
                </div>
              </div>
            </div> */}

            {/* Submit Button */}
            {
              rvzBalance >= 10 ?
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || submitStatus === 'pending' || !walletAddress || !isFormValid()}
                    className={`${getButtonClass()} ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ display: "flex", justifyContent: "center" }}
                  >
                    {(isSubmitting || submitStatus === 'pending') && (
                      <Spinner color="failure" aria-label="Loading" size="md" className="text-gray-200 fill-blue-600" style={{ marginRight: "10px" }} />
                    )}
                    {getButtonText()}
                  </button>
                </div> :
                <div className="space-y-3">
                  <button
                    disabled={true}
                    className={`${getButtonClass()} ${'opacity-50 cursor-not-allowed'}`}
                    style={{ display: "flex", justifyContent: "center" }}
                  >
                    Insufficient RVZ Token balance
                  </button>
                </div>
            }
          </form>
        </div>
      </Page.Main>
    </>
  );
}

export default CreatePetitionPage; 