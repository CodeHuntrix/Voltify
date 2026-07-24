// src/pages/Shop.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Shop() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect /shop requests directly to Profile rewards tab (Item 7 flow consolidation)
    navigate('/profile', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-on-surface-variant font-headline">
      Redirecting to Profile Rewards Console...
    </div>
  );
}
export { Shop };
