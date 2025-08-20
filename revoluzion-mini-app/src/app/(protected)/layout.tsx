import { auth } from '@/auth';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If the user is not authenticated, redirect to the login page
  if (!session) {
    console.log('Not authenticated');
    // redirect('/');
  }

  return (
    <Page>
      {children}
      <Page.Footer className="px-0 fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
