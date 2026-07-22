import { useLayoutEffect } from 'react';
import { usePageTitleContext } from '@/contexts/PageTitleContext';

/**
 * Establece el título que se muestra en el header fijo del AdminLayout.
 * Usa useLayoutEffect para que el título esté listo antes del primer paint.
 *
 * @param title - Título principal visible en el header
 */
export function usePageTitle(title: string) {
  const { setTitle } = usePageTitleContext();

  useLayoutEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [title, setTitle]);
}
