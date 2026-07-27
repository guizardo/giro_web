'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { clearSessaoAtiva } from '@/lib/empresas';

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logout();
      clearSessaoAtiva();
      router.push('/login');
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );
}
