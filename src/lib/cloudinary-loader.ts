/**
 * Cloudinary Widget Loader Singleton
 * 
 * Carga el script de Cloudinary una sola vez a nivel de aplicación,
 * evitando múltiples requests y conflictos entre instancias del widget.
 */

// Declaración de tipos para window.cloudinary
declare global {
  interface Window {
    cloudinary: any;
  }
}

// Estado del loader
let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Carga el script de Cloudinary Widget de forma singleton.
 * 
 * - Si ya está cargado, retorna inmediatamente
 * - Si está en proceso de carga, retorna la promesa existente
 * - Si no se ha cargado, crea el script y lo inserta en document.head
 * - NUNCA elimina el script del DOM
 * 
 * @returns Promise que se resuelve cuando el script está listo
 */
export function loadCloudinaryWidget(): Promise<void> {
  // Si ya está cargado, retornar inmediatamente
  if (isLoaded && window.cloudinary) {
    return Promise.resolve();
  }

  // Si ya hay una carga en progreso, retornar la misma promesa
  if (loadingPromise) {
    return loadingPromise;
  }

  // Crear nueva promesa de carga
  loadingPromise = new Promise((resolve, reject) => {
    // Verificar si el script ya existe en el DOM
    const existingScript = document.querySelector(
      'script[src="https://upload-widget.cloudinary.com/global/all.js"]'
    );

    if (existingScript) {
      // El script ya está en el DOM, verificar si window.cloudinary está disponible
      if (window.cloudinary) {
        isLoaded = true;
        resolve();
      } else {
        // El script está en el DOM pero aún no ha cargado, esperar el evento load
        existingScript.addEventListener('load', () => {
          isLoaded = true;
          resolve();
        });
        existingScript.addEventListener('error', () => {
          reject(new Error('Error al cargar el script de Cloudinary'));
        });
      }
      return;
    }

    // Crear y cargar el script
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;

    script.onload = () => {
      isLoaded = true;
      resolve();
    };

    script.onerror = () => {
      loadingPromise = null; // Permitir reintentos
      reject(new Error('Error al cargar el script de Cloudinary'));
    };

    // Insertar en document.head (NO en body para evitar conflictos con React)
    document.head.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Verifica si el widget de Cloudinary está disponible
 */
export function isCloudinaryLoaded(): boolean {
  return isLoaded && !!window.cloudinary;
}
