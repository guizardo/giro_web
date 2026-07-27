'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setFilial } from '@/app/filial/actions';
import { GiroFilial } from '@/types/giro';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface Props {
  filiais:      GiroFilial[];
  filialAtual:  string; // '0' = consolidado, '1', '2', ...
}

export default function FilialSelect({ filiais, filialAtual }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleChange = (value: string) => {
    startTransition(async () => {
      await setFilial(value);
      router.refresh();
    });
  };

  const label = (f: GiroFilial) =>
    f.fantasia?.trim() || f.empresa?.trim() || `Filial ${f.codigo}`;

  return (
    <div className="px-3 py-2 border-t">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Filial
        </span>
      </div>
      <Select value={filialAtual} onValueChange={(v) => { if (v) handleChange(v); }}>
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filiais.length > 1 && (
            <SelectItem value="0">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Consolidado (todas)
              </span>
            </SelectItem>
          )}
          {filiais.map((f) => (
            <SelectItem key={f.codigo} value={String(f.codigo)}>
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground w-5">{f.codigo}</span>
                {label(f)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
