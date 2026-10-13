import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-5xl font-black text-slate-900">404</h1>
      <p className="mt-2 text-lg font-semibold text-slate-700">Page not found</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        The page you are looking for doesn’t exist or may have been moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}
