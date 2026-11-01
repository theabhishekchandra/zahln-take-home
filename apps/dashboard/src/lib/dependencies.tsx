import { createContext, useContext, type ReactNode } from 'react';

import type { Container } from './container';

const DependenciesContext = createContext<Container | null>(null);

export function DependenciesProvider({ container, children }: { container: Container; children: ReactNode }) {
  return <DependenciesContext.Provider value={container}>{children}</DependenciesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDependencies(): Container {
  const container = useContext(DependenciesContext);
  if (!container) throw new Error('useDependencies must be used inside <DependenciesProvider>');
  return container;
}
