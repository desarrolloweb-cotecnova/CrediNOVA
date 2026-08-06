import { Ban, CircleAlert, CircleCheck, CircleX, Clock, FileCheck, PenLine, Stamp, type LucideIcon } from 'lucide-react';
import type { ApplicationStatus } from '@/types/application';

export interface ApplicationStatusConfig {
  /** Etiqueta legible del estado */
  label: string;
  /** Clase de color de fondo para badges (sobre texto blanco) */
  badgeClass: string;
  /** Clase de color de texto para el icono */
  iconClass: string;
  /** Icono del estado */
  icon: LucideIcon;
}

/**
 * Configuración visual de los estados de una solicitud.
 * Icono y color coinciden con la sección "Guía del Proceso" de la landing page.
 */
export const APPLICATION_STATUS_CONFIG: Record<ApplicationStatus, ApplicationStatusConfig> = {
  borrador: {
    label: 'Borrador',
    badgeClass: 'bg-zinc-500',
    iconClass: 'text-zinc-500',
    icon: PenLine,
  },
  en_revision: {
    label: 'En Revisión',
    badgeClass: 'bg-blue-500',
    iconClass: 'text-blue-500',
    icon: Clock,
  },
  requiere_ajustes: {
    label: 'Requiere Ajustes',
    badgeClass: 'bg-yellow-500',
    iconClass: 'text-yellow-600',
    icon: CircleAlert,
  },
  aprobado: {
    label: 'Aprobado',
    badgeClass: 'bg-green-500',
    iconClass: 'text-green-600',
    icon: CircleCheck,
  },
  pendiente_firma: {
    label: 'Pendiente Firma',
    badgeClass: 'bg-purple-500',
    iconClass: 'text-purple-600',
    icon: FileCheck,
  },
  matricula_autorizada: {
    label: 'Matrícula Autorizada',
    badgeClass: 'bg-primary',
    iconClass: 'text-primary',
    icon: Stamp,
  },
  rechazado: {
    label: 'Rechazado',
    badgeClass: 'bg-red-500',
    iconClass: 'text-red-500',
    icon: CircleX,
  },
  cancelado: {
    label: 'Cancelado',
    badgeClass: 'bg-rose-900',
    iconClass: 'text-rose-800',
    icon: Ban,
  },
};

/** Estados en el orden del proceso, igual que en la Guía del Proceso */
export const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'borrador',
  'en_revision',
  'requiere_ajustes',
  'aprobado',
  'pendiente_firma',
  'matricula_autorizada',
  'rechazado',
  'cancelado',
];

export function getStatusConfig(status: string): ApplicationStatusConfig {
  return (
    APPLICATION_STATUS_CONFIG[status as ApplicationStatus] ?? {
      label: status,
      badgeClass: 'bg-gray-500',
      iconClass: 'text-gray-500',
      icon: CircleAlert,
    }
  );
}
