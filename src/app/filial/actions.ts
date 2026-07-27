'use server';

import { cookies } from 'next/headers';

export async function setFilial(filial: string) {
  cookies().set('giro_filial', filial, {
    httpOnly: false, // lido no client também
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}
