'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface Props {
  brand:    React.ReactNode;
  filial:   React.ReactNode;
  nav:      React.ReactNode;
  footer:   React.ReactNode;
}

export default function SidebarShell({ brand, filial, nav, footer }: Props) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div className="hidden md:flex w-10 shrink-0 flex-col items-center border-r bg-white py-4">
        <button
          onClick={() => setOpen(true)}
          title="Mostrar menu"
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-white">
      {/* Brand + toggle */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="flex-1 flex items-center gap-2">{brand}</div>
        <button
          onClick={() => setOpen(false)}
          title="Ocultar menu"
          className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Filial */}
      {filial}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3">{nav}</div>

      {/* Footer */}
      {footer}
    </aside>
  );
}
