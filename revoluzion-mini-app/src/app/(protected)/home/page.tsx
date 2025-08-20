'use client';

import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import Link from 'next/link';
import Image from 'next/image';
import PetitionRegistryABI from '@/abi/PetitionRegistry.json';
import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { PETITION_REGISTRY_ADDRESS } from '@/lib/contracts';

type Petition = {
  id: string | number;
  title: string;
  description: string;
  supportCount?: bigint;
  signatures?: string;
};

const mockPetitions = [
  {
    id: 'mock-1',
    title: 'Mock Petition: More Water Fountains',
    description: 'A petition to install more water fountains across the city parks.',
    signatures: '42',
  },
  {
    id: 'mock-2',
    title: 'Mock Petition: Pedestrian-Only Streets on Weekends',
    description: 'Proposal to make downtown streets pedestrian-only during weekends to promote local businesses and reduce pollution.',
    signatures: '128',
  },
];

export default function Home() {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPetitions = async () => {
      if (!PETITION_REGISTRY_ADDRESS || PETITION_REGISTRY_ADDRESS === '0x') {
        console.warn('PetitionRegistry contract address not set, using mock data.');
        setPetitions(mockPetitions);
        setLoading(false);
        return;
      }

      const client = createPublicClient({
        chain: worldchain,
        transport: http(),
      });

      try {
        // Get petition count first
        console.log("PETITION_REGISTRY_ADDRESS");
        console.log(PETITION_REGISTRY_ADDRESS);
        const count = await client.readContract({
          address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
          abi: PetitionRegistryABI,
          functionName: 'petitionCount',
        });

        const petitionCount = Number(count);
        const fetchedPetitions = [];
        const start = Math.max(1, petitionCount - 2);

        // Fetch each petition
        for (let i = petitionCount; i >= start; i--) {
          try {
            const petition = await client.readContract({
              address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
              abi: PetitionRegistryABI,
              functionName: 'getPetition',
              args: [BigInt(i)],
            });
            fetchedPetitions.push(petition);
          } catch (error) {
            console.error(`Error fetching petition ${i}:`, error);
          }
        }
        setPetitions(fetchedPetitions.length > 0 ? fetchedPetitions as Petition[] : mockPetitions);
      } catch (error) {
        console.error('Error fetching petitions:', error);
        setPetitions(mockPetitions);
      } finally {
        setLoading(false);
      }
    };

    fetchPetitions();
  }, []);


  return (
    <>
      <Page.Header className="p-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Revoluzion"
              width={32}
              height={32}
              className="rounded-full"
              style={{ objectFit: 'cover' }}
            />
            <span className="text-xl font-bold text-black">Revoluzion</span>
          </div>
          <div className="flex items-center gap-2">
            <UserInfo />
          </div>
        </div>
      </Page.Header>
      <Page.Main className="bg-gray-50 pb-20">
        <div className="px-4 py-6" style={{ marginBottom: "50px" }}>
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
                  width={64}
                  height={64}
                  className="mx-auto rounded-full"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <h1 className="text-2xl font-bold mb-2">
                Revoluzion. Your voice matters.
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: '#fee2e2' }}>
                Create or support petitions securely with your human identity.
              </p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Create a Petition</h3>
                  <p className="text-gray-600 text-sm mb-4">Start a movement and gather support for your cause</p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xl font-bold">+</span>
                  </div>
                </div>
              </div>
              <Link href="/create-petition">
                <button className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-sm">
                  Start Creating
                </button>
              </Link>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Support a Cause</h3>
                  <p className="text-gray-600 text-sm mb-4">Browse and support existing petitions</p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-700 text-xl">♥</span>
                  </div>
                </div>
              </div>
              <Link href={`/petitions/`}>
                <button className="w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors duration-200 shadow-sm">
                  Browse Petitions
                </button>
              </Link>
            </div>
          </div>

          {/* Trending Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Trending Now</h2>
              <Link href="/petitions" className="text-red-600 text-sm font-semibold">View All</Link>
            </div>

            {loading ? (
              <div className="flex justify-center items-center">
                <p>Loading petitions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ul>
                  {petitions.map((petition) => (
                    <li key={petition.id} style={{marginTop:"5px"}}>
                      <Link href={`/petition/${petition.id}`}>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:border-gray-200 transition-all">
                          <h3 className="font-bold text-gray-900">{petition.title}</h3>
                          <p className="text-sm text-gray-600">{petition.description}</p>
                          <p className="text-sm text-gray-500 mt-2">{petition.signatures} signatures</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Page.Main>
    </>
  );
}
