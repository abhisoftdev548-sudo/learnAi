import { Compass } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { PageContainer } from '../components/ui/Layout.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import Button from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useAuth } from '../context/AuthContext.jsx';

export function NotFound() {
  useDocumentTitle('Page not found');
  const { isAuthenticated } = useAuth();

  return (
    <AppLayout>
      <PageContainer>
        <EmptyState
          icon={Compass}
          title="That page does not exist"
          description="The link may be outdated, or the challenge was renamed. Try the catalogue instead."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button to="/challenges">Browse challenges</Button>
              <Button to={isAuthenticated ? '/dashboard' : '/'} variant="secondary">
                {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
              </Button>
            </div>
          }
        />
      </PageContainer>
    </AppLayout>
  );
}

export default NotFound;
