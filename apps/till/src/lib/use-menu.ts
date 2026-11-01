import type { MenuItem, MensaId } from '@zahln/domain';
import { useEffect, useState } from 'react';

import { useDependencies } from './dependencies';

/** The mensa's menu, or null until it has loaded. Loaded once and kept; retried when back online. */
export function useMenu(mensaId: MensaId, online: boolean): readonly MenuItem[] | null {
  const { loadMenu } = useDependencies();
  const [menu, setMenu] = useState<readonly MenuItem[] | null>(null);
  useEffect(() => {
    if (!online) return;
    let live = true;
    void loadMenu(mensaId).then((result) => {
      if (live && result.ok) setMenu(result.value);
    });
    return () => {
      live = false;
    };
  }, [mensaId, online, loadMenu]);
  return menu;
}
