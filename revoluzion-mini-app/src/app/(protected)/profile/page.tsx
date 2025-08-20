'use client';

import { Page } from '@/components/PageLayout';
import { UserInfo } from '@/components/UserInfo';
import { AuthButton } from '@/components/AuthButton';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function Profile() {
  const { data: session } = useSession();

  const mockProfile = {
    name: session?.user?.name ?? 'Human',
    walletAddress: session?.user?.walletAddress,
    petitionsCreated: 3,
    petitionsSigned: 17,
    memberSince: 'October 2023',
  };

  return (
    <Page>
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

      <Page.Main className="bg-gray-50">
        <div className="px-4 py-6">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
                <span className="text-4xl">👤</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{mockProfile.name}</h1>
            {mockProfile.walletAddress && (
              <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                {mockProfile.walletAddress}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <h3 className="text-sm font-medium text-gray-500">Petitions Created</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{mockProfile.petitionsCreated}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <h3 className="text-sm font-medium text-gray-500">Petitions Signed</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{mockProfile.petitionsSigned}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-semibold text-gray-800">{mockProfile.memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verification Status</span>
                <span className="font-semibold text-green-600">Verified Human</span>
              </div>
            </div>
          </div>

          <div className="text-center">
        <AuthButton />
      </div>
        </div>
      </Page.Main>
    </Page>
  );
} 