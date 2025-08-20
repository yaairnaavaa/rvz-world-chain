import { Page } from '@/components/PageLayout';
import { AuthButton } from '../components/AuthButton';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  console.log('🔵 Main page - Session status:', !!session);

  if (session) {
    console.log('🟢 User is authenticated, redirecting to /home');
    redirect('/home');
  }

  console.log('🔴 User not authenticated, showing login page');

  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
            Welcome to Revoluzion
          </h1>
          <p style={{ marginBottom: '30px', color: '#666' }}>
            Please authenticate with your World App wallet to continue
          </p>
          <AuthButton />
        </div>
      </Page.Main>
    </Page>
  );
}
