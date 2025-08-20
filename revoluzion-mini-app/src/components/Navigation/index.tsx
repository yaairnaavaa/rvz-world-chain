'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Bank, Home, User, Page } from 'iconoir-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// import { useEffect, useState } from 'react';
// import { createPublicClient, http } from 'viem';
// import { worldchain } from 'viem/chains';
// import PetitionRegistryABI from '@/abi/PetitionRegistry.json';
// import { PETITION_REGISTRY_ADDRESS } from '@/lib/contracts';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

export const Navigation = () => {
  const pathname = usePathname();
  //const [petitionCount, setPetitionCount] = useState<number | null>(null);

  const getCurrentTab = () => {
    if (pathname.startsWith('/home')) return 'home';
    if (pathname.startsWith('/petitions')) return 'petitions';
    if (pathname.startsWith('/wallet')) return 'wallet';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'home';
  };

  // useEffect(() => {
  //   const fetchPetitionCount = async () => {
  //     if (!PETITION_REGISTRY_ADDRESS || PETITION_REGISTRY_ADDRESS === '0x') {
  //       console.warn('PetitionRegistry contract address not set.');
  //       setPetitionCount(0); // Set a default or placeholder
  //       return;
  //     }

  //     const client = createPublicClient({
  //       chain: worldchain,
  //       transport: http(),
  //     });

  //     try {
  //       const count = await client.readContract({
  //         address: PETITION_REGISTRY_ADDRESS as `0x${string}`,
  //         abi: PetitionRegistryABI,
  //         functionName: 'petitionCount',
  //       });
  //       setPetitionCount(Number(count));
  //     } catch (error) {
  //       console.error('Error fetching petition count:', error);
  //       setPetitionCount(0); // Fallback on error
  //     }
  //   };

  //   fetchPetitionCount();
  // }, []);

  //const petitionsLabel = petitionCount !== null ? `Petitions (${petitionCount})` : 'Petitions';

  return (
    <Tabs value={getCurrentTab()}>
      <Link href="/home" passHref>
        <TabItem value="home" icon={<Home />} label="Home" />
      </Link>
      <Link href="/petitions" passHref>
        <TabItem value="petitions" icon={<Page />} label="Petitions" />
      </Link>
      <Link href="/wallet" passHref>
        <TabItem value="wallet" icon={<Bank />} label="Wallet" />
      </Link>
      <Link href="/profile" passHref>
        <TabItem value="profile" icon={<User />} label="Profile" />
      </Link>
    </Tabs>
  );
};
