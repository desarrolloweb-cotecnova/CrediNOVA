import { createContext, useCallback, useContext, useState } from 'react';

interface PageTitleState {
  title: string;
}

interface PageTitleContextValue extends PageTitleState {
  setTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: '',
  setTitle: () => undefined,
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleState] = useState('');

  // useCallback garantiza que setTitle sea estable entre renders
  const setTitle = useCallback((t: string) => {
    setTitleState(t);
  }, []);

  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleContext() {
  return useContext(PageTitleContext);
}
