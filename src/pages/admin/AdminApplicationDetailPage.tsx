import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Ban, Shield, Download, Link as LinkIcon, GraduationCap, Pencil, Save, Copy, ClipboardCheck, FileSpreadsheet, Bell, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { getApplicationById, updateApplicationStatus, cancelApplication, saveZapSignLink, saveZapSignSendLink, saveAmortization, deleteApplication, updateApplicationData, requestDeletion, rejectDeletion } from '@/services/applications';
import { getAllUsers } from '@/services/users';
import { notifyStatusChange, notifyRectorRequired } from '@/services/emailService';
import { formatCurrency } from '@/lib/utils';
import { 
  saveVerification, 
  getVerifications, 
  saveStatusHistory, 
  getStatusHistory,
  checkAllVerificationsMet,
  hasAnyNonCompliant,
  hasRectorPending,
  SECTION_LABELS,
  type ApplicationVerification,
  type ApplicationStatusHistory,
  type VerificationStatus,
} from '@/services/verifications';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import type { Application, AmortizationRow } from '@/types/application';
import { EditableField } from '@/components/admin/EditableField';

import { formatDateShort, formatDateTime, formatDateLong } from '@/lib/date';

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En Revisión',
  requiere_ajustes: 'Requiere Ajustes',
  aprobado: 'Aprobado',
  pendiente_firma: 'Pendiente Firma',
  matricula_autorizada: 'Matrícula Autorizada',
  rechazado: 'Rechazado',
  cancelado: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  borrador: 'bg-zinc-500',
  en_revision: 'bg-blue-500',
  requiere_ajustes: 'bg-yellow-500',
  aprobado: 'bg-green-500',
  pendiente_firma: 'bg-purple-500',
  matricula_autorizada: 'bg-primary',
  rechazado: 'bg-red-500',
  cancelado: 'bg-red-800',
};

// Flujo de estados del proceso (en orden)
const PROCESS_FLOW = [
  { key: 'en_revision',        label: 'En Revisión',         shortLabel: 'Revisión' },
  { key: 'aprobado',           label: 'Aprobado',            shortLabel: 'Aprobado' },
  { key: 'pendiente_firma',    label: 'Pendiente Firma',     shortLabel: 'Firmas' },
  { key: 'matricula_autorizada', label: 'Matrícula Autorizada', shortLabel: 'Matrícula' },
];

// Orden numérico de estados para el stepper
const STATUS_ORDER: Record<string, number> = {
  borrador: -1,
  en_revision: 0,
  requiere_ajustes: 0.5, // paralelo a en_revision
  aprobado: 1,
  pendiente_firma: 2,
  matricula_autorizada: 3,
  rechazado: -2,
  cancelado: -2,
};

function getStepState(stepKey: string, currentStatus: string): 'done' | 'current' | 'pending' | 'warning' {
  if (currentStatus === 'rechazado' || currentStatus === 'cancelado') return 'pending';
  const stepOrder = STATUS_ORDER[stepKey] ?? 0;
  const currentOrder = STATUS_ORDER[currentStatus] ?? 0;
  if (currentOrder > stepOrder) return 'done';
  if (stepKey === currentStatus) return 'current';
  // Caso especial: requiere_ajustes muestra warning en el paso de revisión
  if (stepKey === 'en_revision' && currentStatus === 'requiere_ajustes') return 'warning';
  return 'pending';
}

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [activeTab, setActiveTab] = useState('estudio');

  // Título dinámico basado en el código de solicitud cargado
  const appCode = application?.applicationCode ?? '';
  usePageTitle(appCode ? `Solicitud ${appCode}` : 'Detalle de Solicitud');
  
  // Estado para ZapSign
  const [zapsignSendLink, setZapsignSendLink] = useState('');
  const [zapsignCosignerSendLink, setZapsignCosignerSendLink] = useState('');
  const [isSendingDocs, setIsSendingDocs] = useState(false);
  const [zapsignLink, setZapsignLink] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  
  // Estado para tabla de Amortización (inline en Sección D)
  const [amortizationRows, setAmortizationRows] = useState<AmortizationRow[]>([]);
  const [isSavingAmortization, setIsSavingAmortization] = useState(false);
  
  // Estados para anotaciones de verificación
  const [studentNotes, setStudentNotes] = useState('');
  const [cosignerNotes, setCosignerNotes] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [initialPaymentNotes, setInitialPaymentNotes] = useState('');
  
  // Estados para verificación (cumple/no cumple/requiere_aprobacion_rector/autorizado_rector)
  const [studentVerification, setStudentVerification] = useState<VerificationStatus | null>(null);
  const [cosignerVerification, setCosignerVerification] = useState<VerificationStatus | null>(null);
  const [paymentVerification, setPaymentVerification] = useState<VerificationStatus | null>(null);
  const [planVerification, setPlanVerification] = useState<VerificationStatus | null>(null);
  const [initialPaymentVerification, setInitialPaymentVerification] = useState<VerificationStatus | null>(null);
  
  // Estados para verificaciones y historial
  const [verifications, setVerifications] = useState<ApplicationVerification[]>([]);
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusHistory[]>([]);
  const [isRector, setIsRector] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [showRequestDeletionDialog, setShowRequestDeletionDialog] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [isRejectingDeletion, setIsRejectingDeletion] = useState(false);
  /** Columnas editadas por el gestor en esta sesión (persistido en el padre para sobrevivir re-renders) */
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // ── Número del Pagaré a la Orden ──
  // Formato: {YYYYMM}{consecutivo_3d}-{applicationCode}
  // Ej: 202605001-KXFQNZ
  // El consecutivo es siempre 001 ya que cada solicitud genera un único pagaré.
  // La unicidad absoluta la aporta el applicationCode.
  const pagareNumber = useMemo(() => {
    if (!application) return '';
    // Extraer año y mes directamente del string ISO (sin conversión UTC)
    const parts = application.createdAt?.split('T')[0]?.split('-') ?? [];
    const yyyy = parts[0] ?? '';
    const mm = parts[1] ?? '';
    return `${yyyy}${mm}001-${application.applicationCode}`;
  }, [application?.id, application?.createdAt]);

  // ── Nombre sugerido del archivo para ZapSign ──
  // Formato: Pagare_{pagareNumber_sin_guion}_{Apellido}_{InicialNombre}
  // Ej: Pagare_202605001KXFQNZ_Ramos_E
  // Apellido = penúltima palabra del nombre completo (primer apellido en Colombia)
  // InicialNombre = primera letra de la primera palabra
  const suggestedFileName = useMemo(() => {
    if (!application || !pagareNumber) return '';
    const parts = application.studentFullName.trim().split(/\s+/);

    // Primer apellido: penúltimo token si hay ≥3 palabras, último si hay 2, único si hay 1
    const apellidoRaw =
      parts.length >= 3 ? parts[parts.length - 2] :
      parts.length === 2 ? parts[1] :
      parts[0] || 'Estudiante';

    const apellido = apellidoRaw
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/[^a-zA-Z0-9]/g, '');                    // solo alfanumérico

    // Inicial del primer nombre
    const inicial = (parts[0]?.[0] || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    // Número de pagaré sin el guion para el nombre del archivo
    const pagareNumClean = pagareNumber.replace('-', '');

    return `Pagare_${pagareNumClean}_${apellido}_${inicial}`;
  }, [application?.id, application?.studentFullName, pagareNumber]);

  useEffect(() => {
    if (id) {
      loadApplication(id);
      loadVerifications(id);
      loadStatusHistory(id);
    }
    checkUserRole();
  }, [id]);

  // Sincronizar links de ZapSign cuando carga la aplicación
  useEffect(() => {
    if (application?.zapsignSignedLink) {
      setZapsignLink(application.zapsignSignedLink);
    }
    if (application?.zapsignSendLink) {
      setZapsignSendLink(application.zapsignSendLink);
    }
    if (application?.zapsignCosignerSendLink) {
      setZapsignCosignerSendLink(application.zapsignCosignerSendLink);
    }
  }, [application?.zapsignSignedLink, application?.zapsignSendLink, application?.zapsignCosignerSendLink]);

  // Pre-poblar filas de amortización cuando carga la aplicación
  useEffect(() => {
    if (!application) return;
    const total = application.numberOfInstallments ?? 0;
    if (total <= 0) return;

    if (application.amortizationSchedule && application.amortizationSchedule.length > 0) {
      setAmortizationRows(application.amortizationSchedule);
    } else {
      // Generar filas vacías según número de cuotas
      setAmortizationRows(
        Array.from({ length: total }, (_, i) => ({
          installmentNumber: i + 1,
          dueDate: '',
          amount: 0,
        }))
      );
    }
  }, [application?.id]);

  async function checkUserRole() {
    try {
      // Usar el perfil guardado en localStorage (sincrónico, sin llamada extra a BD)
      const { getCurrentUserSync } = await import('@/services/auth');
      const currentUser = getCurrentUserSync();
      if (currentUser) {
        setCurrentUserEmail(currentUser.email);
        // rector tiene los mismos privilegios que admin
        const isAdminOrRector = currentUser.role === 'admin' || currentUser.role === 'rector';
        setIsAdmin(isAdminOrRector);
        setIsRector(isAdminOrRector);
        setIsGestor(currentUser.role === 'gestor');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  async function loadVerifications(applicationId: string) {
    try {
      const { data, error } = await getVerifications(applicationId);
      if (error) {
        console.error('Error loading verifications:', error);
        return;
      }
      
      if (data) {
        setVerifications(data);
        
        // Cargar estados de verificación
        data.forEach(v => {
          if (v.section_name === 'student') {
            setStudentVerification(v.verification_status);
            setStudentNotes(v.notes || '');
          } else if (v.section_name === 'cosigner') {
            setCosignerVerification(v.verification_status);
            setCosignerNotes(v.notes || '');
          } else if (v.section_name === 'payment') {
            setPaymentVerification(v.verification_status);
            setPaymentNotes(v.notes || '');
          } else if (v.section_name === 'plan') {
            setPlanVerification(v.verification_status);
            setPlanNotes(v.notes || '');
          } else if (v.section_name === 'initial_payment') {
            setInitialPaymentVerification(v.verification_status);
            setInitialPaymentNotes(v.notes || '');
          }
        });
      }
    } catch (error) {
      console.error('Error in loadVerifications:', error);
    }
  }

  async function loadStatusHistory(applicationId: string) {
    try {
      const { data, error } = await getStatusHistory(applicationId);
      if (error) {
        console.error('Error loading status history:', error);
        return;
      }
      
      if (data) {
        setStatusHistory(data);
      }
    } catch (error) {
      console.error('Error in loadStatusHistory:', error);
    }
  }

  async function loadApplication(applicationId: string) {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getApplicationById(applicationId);

      if (result.success && result.application) {
        setApplication(result.application);
      } else {
        setError(result.error || 'No se pudo cargar la solicitud');
        toast.error('Error al cargar la solicitud');
      }
    } catch (err) {
      console.error('Error al cargar solicitud:', err);
      setError('Error al cargar la solicitud');
      toast.error('Error al cargar la solicitud');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Evalúa el estado automático según las verificaciones actualizadas.
   * Lógica:
   *  - Todas cumple | autorizado_rector Y amortización completa → aprobado
   *  - Todas cumple | autorizado_rector Y amortización incompleta → queda en_revision (advertencia)
   *  - Alguna no_cumple → requiere_ajustes
   *  - Alguna requiere_aprobacion_rector (sin no_cumple) → queda en en_revision (pendiente rector)
   */
  async function evaluateAutoStatus(updatedVerifications: ApplicationVerification[]) {
    if (!application || !id) return;
    const current = application.status;
    if (current !== 'en_revision' && current !== 'requiere_ajustes') return;

    const allMet      = checkAllVerificationsMet(updatedVerifications);
    const hasNonCompl = hasAnyNonCompliant(updatedVerifications);
    const rectorPend  = hasRectorPending(updatedVerifications);

    // Verificar que la amortización esté completa cuando numberOfInstallments > 0
    const needsAmortization = (application.numberOfInstallments ?? 0) > 0;
    const amortizationDone  = !needsAmortization || (
      amortizationRows.length > 0 &&
      amortizationRows.every(r => r.dueDate && r.amount > 0)
    );

    // Actualizar columna has_rector_pending en applications
    await supabase.from('applications').update({ has_rector_pending: rectorPend }).eq('id', id);

    let newStatus: string | null = null;
    if (allMet) {
      if (amortizationDone) {
        newStatus = 'aprobado';
      } else {
        // Verificaciones completas pero amortización pendiente
        toast.warning('⚠️ Todas las secciones verificadas, pero la tabla de amortización está incompleta. Complete y guarde la amortización (Sección D) para aprobar la solicitud.');
        if (current !== 'en_revision') newStatus = 'en_revision';
      }
    } else if (hasNonCompl) {
      newStatus = 'requiere_ajustes';
    } else if (rectorPend) {
      if (current !== 'en_revision') newStatus = 'en_revision';
    } else {
      if (current !== 'en_revision') newStatus = 'en_revision';
    }

    if (newStatus && newStatus !== current) {
      const result = await updateApplicationStatus(id, newStatus);
      if (result.success) {
        await saveStatusHistory(id, current, newStatus, 'Actualización automática por verificaciones');
        await loadApplication(id);
        await loadStatusHistory(id);
        if (application) notifyStatusChange(application, newStatus);
        if (newStatus === 'aprobado') {
          toast.success('✅ Todas las secciones verificadas — Solicitud APROBADA automáticamente');
          setActiveTab('firmas');
        } else if (newStatus === 'requiere_ajustes') {
          toast.warning('⚠️ Sección no cumple — Estado actualizado a Requiere Ajustes');
        }
      }
    }
  }

  // Función para manejar el guardado de verificaciones
  async function handleVerificationChange(
    section: 'student' | 'cosigner' | 'payment' | 'plan' | 'initial_payment',
    status: VerificationStatus,
    notes: string
  ) {
    if (!id || !application) return;

    try {
      const { error } = await saveVerification(id, section, status, notes);
      
      if (error) {
        toast.error(`Error al guardar verificación: ${error.message}`);
        return;
      }

      toast.success('Verificación guardada correctamente');

      // Si requiere aprobación del rector → notificar por correo
      if (status === 'requiere_aprobacion_rector') {
        notifyRectorRequired({
          applicationCode: application.applicationCode,
          studentName: application.studentFullName,
          program: application.studentProgram,
          sectionLabel: SECTION_LABELS[section],
          gestorNotes: notes,
          applicationId: id,
        });
        toast.info('📧 Notificación enviada al Rector para aprobación');
      }
      
      // Recargar verificaciones y evaluar estado automático
      const { data: updatedVerifications } = await getVerifications(id);
      if (updatedVerifications) {
        setVerifications(updatedVerifications);
        await evaluateAutoStatus(updatedVerifications);
      }
    } catch (error) {
      console.error('Error saving verification:', error);
      toast.error('Error al guardar verificación');
    }
  }

  async function handleSaveAmortization() {
    if (!id) return;
    // Validar que todas las filas tengan fecha y valor
    const invalid = amortizationRows.some(r => !r.dueDate || r.amount <= 0);
    if (invalid) {
      toast.error('Complete la fecha y el valor de todas las cuotas antes de guardar');
      return;
    }
    setIsSavingAmortization(true);
    try {
      const result = await saveAmortization(id, amortizationRows);
      if (result.success) {
        toast.success('Tabla de amortización guardada correctamente');
        await loadApplication(id);
      } else {
        toast.error(result.error || 'Error al guardar la amortización');
      }
    } catch {
      toast.error('Error al guardar la amortización');
    } finally {
      setIsSavingAmortization(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!application || !id) return;

    try {
      setIsUpdating(true);

      const result = await updateApplicationStatus(id, newStatus);

      if (result.success) {
        await saveStatusHistory(id, application.status, newStatus);
        // Notificar al estudiante (y deudor solidario si aplica) del cambio de estado
        notifyStatusChange(application, newStatus);
        toast.success('Estado actualizado correctamente');
        await loadApplication(id);
        await loadStatusHistory(id);
      } else {
        toast.error(result.error || 'Error al actualizar estado');
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      toast.error('Error al actualizar estado');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCancelApplication() {
    if (!application || !id) return;

    try {
      setIsUpdating(true);

      const result = await cancelApplication(id, cancelReason || undefined);

      if (result.success) {
        toast.success('Solicitud cancelada correctamente');
        setShowCancelDialog(false);
        setCancelReason('');
        await loadApplication(id);
      } else {
        toast.error(result.error || 'Error al cancelar la solicitud');
      }
    } catch (err) {
      console.error('Error al cancelar solicitud:', err);
      toast.error('Error al cancelar la solicitud');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteApplication() {
    if (!application || !id) return;
    setIsDeletingApp(true);
    try {
      const result = await deleteApplication(id);
      if (result.success) {
        toast.success(`Solicitud ${application.applicationCode} eliminada correctamente`);
        navigate('/admin/solicitudes');
      } else {
        toast.error(result.error || 'Error al eliminar la solicitud');
        setShowDeleteDialog(false);
      }
    } catch (err) {
      console.error('Error al eliminar solicitud:', err);
      toast.error('Error al eliminar la solicitud');
      setShowDeleteDialog(false);
    } finally {
      setIsDeletingApp(false);
    }
  }

  /** Gestor solicita la eliminación (queda pendiente de aprobación) */
  async function handleRequestDeletion() {
    if (!id) return;
    setIsRequestingDeletion(true);
    try {
      const result = await requestDeletion(id);
      if (result.success) {
        toast.success('Solicitud de eliminación enviada. El rector o administrador deberá aprobarla.');
        setShowRequestDeletionDialog(false);
        if (id) await loadApplication(id);
      } else {
        toast.error(result.error || 'Error al solicitar la eliminación');
      }
    } catch (err) {
      console.error('Error al solicitar eliminación:', err);
      toast.error('Error al solicitar la eliminación');
    } finally {
      setIsRequestingDeletion(false);
    }
  }

  /** Admin/rector rechaza la solicitud de eliminación */
  async function handleRejectDeletion() {
    if (!id) return;
    setIsRejectingDeletion(true);
    try {
      const result = await rejectDeletion(id);
      if (result.success) {
        toast.success('Solicitud de eliminación rechazada');
        if (id) await loadApplication(id);
      } else {
        toast.error(result.error || 'Error al rechazar la solicitud de eliminación');
      }
    } catch (err) {
      console.error('Error al rechazar eliminación:', err);
      toast.error('Error al rechazar la solicitud de eliminación');
    } finally {
      setIsRejectingDeletion(false);
    }
  }

  /**
   * Guarda un campo individual de la solicitud (Secciones A y B).
   * @param column  Nombre de columna en snake_case (BD)
   * @param value   Nuevo valor
   */
  async function handleFieldSave(
    column: string,
    value: string | number | boolean
  ): Promise<void> {
    if (!id) return;
    const result = await updateApplicationData(id, { [column]: value === '' ? null : value });
    if (result.success) {
      // Marcar el campo como modificado ANTES de recargar la aplicación,
      // así el indicador visual persiste aunque React re-renderice el árbol.
      setModifiedFields((prev) => new Set(prev).add(column));
      toast.success('Campo actualizado');
      await loadApplication(id);
    } else {
      toast.error(result.error || 'Error al actualizar el campo');
      throw new Error(result.error);
    }
  }

  async function handleSaveZapSignLink() {
    if (!id || !application) return;
    if (!zapsignLink.trim()) {
      toast.error('Por favor ingrese el link del documento firmado');
      return;
    }

    setIsSavingLink(true);
    try {
      const result = await saveZapSignLink(id, zapsignLink.trim());
      if (result.success) {
        await saveStatusHistory(id, application.status, 'matricula_autorizada', 'Firma electrónica completada — link ZapSign guardado');
        notifyStatusChange(application, 'matricula_autorizada');
        toast.success('¡Proceso de firmas completado! Estado actualizado a Matrícula Autorizada');
        await loadApplication(id);
        await loadStatusHistory(id);
        setActiveTab('matricula');
      } else {
        toast.error(result.error || 'Error al guardar el link');
      }
    } catch {
      toast.error('Error al guardar el link de ZapSign');
    } finally {
      setIsSavingLink(false);
    }
  }

  // ── Guardar link de envío y transicionar a pendiente_firma ──
  async function handleSendForSigning() {
    if (!id || !application) return;
    if (!zapsignSendLink.trim()) {
      toast.error('Por favor ingrese el link del documento a enviar para firmas');
      return;
    }

    setIsSendingDocs(true);
    try {
      const result = await saveZapSignSendLink(id, zapsignSendLink.trim(), zapsignCosignerSendLink.trim() || undefined);
      if (result.success) {
        await saveStatusHistory(id, application.status, 'pendiente_firma', 'Documento enviado para firma electrónica vía ZapSign');
        toast.success('Documentos enviados — estado actualizado a Pendiente Firma');
        await loadApplication(id);
        await loadStatusHistory(id);
      } else {
        toast.error(result.error || 'Error al guardar el link de envío');
      }
    } catch {
      toast.error('Error al registrar el envío para firmas');
    } finally {
      setIsSendingDocs(false);
    }
  }

  // Cuando el gestor abre la pestaña de Firmas (ya no auto-transiciona; la transición es manual)
  async function handleFirmasTabOpen() {
    // Sin acción automática — el cambio de estado lo activa el botón "Enviado para firmas"
  }

  /** Genera y descarga el Excel con TODOS los datos para combinación de correspondencia */
  function handleDownloadExcel() {
    if (!application) return;

    const financed =
      application.semesterValue != null && application.initialPayment != null
        ? application.semesterValue - application.initialPayment
        : application.financedAmount ?? 0;

    // ── Fila principal: todos los campos para combinación de correspondencia ──
    const row: Record<string, string | number> = {
      // Identificación del documento
      'Numero_Pagare':           pagareNumber,
      'Nombre_Archivo_Sugerido': suggestedFileName,
      'Codigo_Solicitud':        application.applicationCode,

      // Datos del Estudiante
      'Nombre_Estudiante':       application.studentFullName,
      'Tipo_Documento_Estudiante': application.studentDocumentType,
      'Documento_Estudiante':    application.studentDocumentNumber,
      'Fecha_Exp_Doc_Estudiante': application.studentDocumentExpeditionDate
        ? formatDateShort(application.studentDocumentExpeditionDate) : '',
      'Fecha_Nacimiento_Estudiante': application.studentBirthDate
        ? formatDateShort(application.studentBirthDate) : '',
      'Email_Estudiante':        application.studentEmail,
      'Telefono_Estudiante':     application.studentPhone,
      'Direccion_Estudiante':    application.studentAddress,
      'Barrio_Estudiante':       application.studentNeighborhood,
      'Ciudad_Estudiante':       application.studentCity,
      'Departamento_Estudiante': application.studentDepartment,
      'Programa':                application.studentProgram,
      'Semestre':                application.studentSemester,
      'Jornada':                 application.studentShift,

      // Datos del Deudor Solidario
      'Nombre_Deudor_Solidario':     application.cosignerFullName,
      'Tipo_Documento_Deudor':       application.cosignerDocumentType,
      'Documento_Deudor':            application.cosignerDocumentNumber,
      'Fecha_Exp_Doc_Deudor': application.cosignerDocumentExpeditionDate
        ? formatDateShort(application.cosignerDocumentExpeditionDate) : '',
      'Fecha_Nacimiento_Deudor': application.cosignerBirthDate
        ? formatDateShort(application.cosignerBirthDate) : '',
      'Email_Deudor':                application.cosignerEmail,
      'Telefono_Deudor':             application.cosignerPhone,
      'Direccion_Deudor':            application.cosignerAddress,
      'Barrio_Deudor':               application.cosignerNeighborhood,
      'Ciudad_Deudor':               application.cosignerCity,
      'Departamento_Deudor':         application.cosignerDepartment,
      'Ocupacion_Deudor':            application.cosignerOccupation,
      'Empresa_Deudor':              application.cosignerCompany ?? '',
      'Cargo_Deudor':                application.cosignerPosition ?? '',
      'Ingresos_Deudor':             application.cosignerIncome ?? '',

      // Plan de Crédito
      'Plan_Credito':       application.creditPlan,
      'Valor_Semestre':     application.semesterValue ?? '',
      'Cuota_Inicial':      application.initialPayment ?? '',
      'Saldo_Financiado':   financed,
      'Numero_Cuotas':      application.numberOfInstallments ?? '',
      'Dia_Pago':           application.paymentDayOfMonth ?? '',
    };

    // ── Columnas dinámicas para cada cuota de amortización ──
    if (application.amortizationSchedule && application.amortizationSchedule.length > 0) {
      application.amortizationSchedule.forEach((cuota) => {
        const n = cuota.installmentNumber;
        row[`Cuota_${n}_Fecha`] = cuota.dueDate
          ? formatDateShort(cuota.dueDate) : '';
        row[`Cuota_${n}_Valor`] = cuota.amount ?? 0;
      });
      row['Total_Financiado'] = application.amortizationSchedule
        .reduce((s, r) => s + (r.amount || 0), 0);
    }

    // ── Construir el libro de Excel ──
    const ws = XLSX.utils.json_to_sheet([row]);

    // Ajustar anchos de columna automáticamente
    const colWidths = Object.keys(row).map(key => ({
      wch: Math.max(key.length, String(row[key]).length, 18),
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos ZapSign');

    XLSX.writeFile(wb, `${suggestedFileName.replace(/\.pdf$/, '') || `ZapSign_${application.applicationCode}`}.xlsx`);
    toast.success('Archivo Excel descargado — listo para combinación de correspondencia');
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando solicitud...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !application) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6 mb-4">
              <p className="text-red-900 dark:text-red-100 font-semibold mb-2">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error || 'Solicitud no encontrada'}</p>
            </div>
            <Button onClick={() => navigate('/admin/solicitudes')}>
              Volver a Solicitudes
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const showFirmasTab = ['aprobado', 'pendiente_firma', 'matricula_autorizada'].includes(application.status);
  const showMatriculaTab = application.status === 'matricula_autorizada';
  const isTerminal = ['rechazado', 'cancelado'].includes(application.status);
  const financedAmount =
    application.semesterValue != null && application.initialPayment != null
      ? application.semesterValue - application.initialPayment
      : application.financedAmount;

  return (
    <AdminLayout>
      <div className="bg-muted/30 min-h-full">
        {/* Botón volver */}
        <div className="container mx-auto px-4 md:px-6 pt-4 md:pt-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/solicitudes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Banner borrador */}
          {application.status === 'borrador' && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                ⚠️ Esta solicitud aún no ha sido enviada para revisión
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                El usuario está trabajando en un borrador. Solo puede cancelar esta solicitud.
              </p>
            </div>
          )}

          {/* ── STEPPER DE FLUJO ── */}
          {!isTerminal && application.status !== 'borrador' && (
            <Card>
              <CardHeader className="pb-4">

              </CardHeader>
              <CardContent>
                {/* Alerta Requiere Ajustes */}
                {application.status === 'requiere_ajustes' && (
                  <div className="mb-4 flex items-start gap-3 border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 rounded-md p-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Requiere Ajustes</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 text-pretty">
                        Una o más secciones no cumplen los requisitos. Corrija las observaciones para continuar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Stepper visual */}
                <div className="flex items-center gap-0 overflow-x-auto pb-2">
                  {PROCESS_FLOW.map((step, idx) => {
                    const state = getStepState(step.key, application.status);
                    return (
                      <div key={step.key} className="flex items-center min-w-0">
                        {/* Paso */}
                        <div className="flex flex-col items-center min-w-[72px] md:min-w-[100px]">
                          <div className={`
                            flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all
                            ${state === 'done'    ? 'bg-green-500 border-green-500 text-white' : ''}
                            ${state === 'current' ? 'bg-primary border-primary text-primary-foreground' : ''}
                            ${state === 'warning' ? 'bg-yellow-400 border-yellow-400 text-white' : ''}
                            ${state === 'pending' ? 'bg-background border-border text-muted-foreground' : ''}
                          `}>
                            {state === 'done'    && <CheckCircle className="h-5 w-5" />}
                            {state === 'current' && <span className="text-xs font-bold">{idx + 1}</span>}
                            {state === 'warning' && <AlertCircle className="h-5 w-5" />}
                            {state === 'pending' && <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>}
                          </div>
                          <span className={`
                            mt-1.5 text-xs text-center whitespace-nowrap font-medium
                            ${state === 'done'    ? 'text-green-600 dark:text-green-400' : ''}
                            ${state === 'current' ? 'text-primary' : ''}
                            ${state === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                            ${state === 'pending' ? 'text-muted-foreground' : ''}
                          `}>
                            {step.shortLabel}
                          </span>
                        </div>
                        {/* Conector */}
                        {idx < PROCESS_FLOW.length - 1 && (
                          <div className={`
                            flex-1 h-0.5 min-w-[24px] mx-1 rounded-full
                            ${STATUS_ORDER[application.status] > STATUS_ORDER[step.key]
                              ? 'bg-green-400'
                              : 'bg-border'}
                          `} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── BOTONES DE ACCIÓN MANUAL (solo Rechazar y Cancelar) ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-balance">Gestión de Estado</CardTitle>
              <CardDescription className="text-pretty">
                {application.status === 'borrador'
                  ? 'Esta solicitud es un borrador y solo puede ser cancelada'
                  : 'El estado se actualiza automáticamente según las verificaciones. Solo las acciones de rechazo y cancelación son manuales.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* Rechazar — disponible desde en_revision hasta matricula_autorizada */}
                {!['borrador', 'rechazado', 'cancelado'].includes(application.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => handleStatusChange('rechazado')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar Solicitud
                  </Button>
                )}

                {/* Cancelar — disponible solo en borrador */}
                {application.status === 'borrador' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isUpdating}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancelar Solicitud
                  </Button>
                )}

                {/* Estados informacionales — muestra el estado actual visualmente pero no son clickeables */}
                {!['borrador', 'rechazado', 'cancelado'].includes(application.status) && (
                  <div className="flex flex-wrap gap-2 items-center ml-auto">
                    <span className="text-xs text-muted-foreground mr-1 hidden md:inline">Estado actual:</span>
                    <Badge className={`${STATUS_COLORS[application.status]} text-white`}>
                      {STATUS_LABELS[application.status]}
                    </Badge>
                    {application.status === 'en_revision' && (
                      <span className="text-xs text-muted-foreground text-pretty">
                        — Se aprobará automáticamente cuando todas las secciones estén verificadas
                      </span>
                    )}
                    {application.status === 'aprobado' && (
                      <span className="text-xs text-muted-foreground text-pretty">
                        — Continúe en la pestaña <strong>Firmas</strong>
                      </span>
                    )}
                    {application.status === 'pendiente_firma' && (
                      <span className="text-xs text-muted-foreground text-pretty">
                        — Esperando firma electrónica ZapSign
                      </span>
                    )}
                    {application.status === 'matricula_autorizada' && (
                      <span className="text-xs text-muted-foreground text-pretty">
                        — Ver pestaña <strong>Matrícula Financiera</strong>
                      </span>
                    )}
                  </div>
                )}

                {(application.status === 'rechazado' || application.status === 'cancelado') && (
                  <Badge className={`${STATUS_COLORS[application.status]} text-white`}>
                    {STATUS_LABELS[application.status]}
                  </Badge>
                )}

                {/* ── Solicitar/Eliminar según rol ── */}
                {isGestor && (
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:border-red-800"
                      onClick={() => setShowRequestDeletionDialog(true)}
                      disabled={!!application.deletionRequestedAt}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {application.deletionRequestedAt ? 'Eliminación solicitada' : 'Solicitar Eliminación'}
                    </Button>
                  </div>
                )}
                {isAdmin && (
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:border-red-800"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeletingApp}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Solicitud
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Banner: solicitud de eliminación pendiente (solo admin/rector) ── */}
          {(isAdmin) && application.deletionRequestedAt && (
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-red-700 dark:text-red-400 text-sm text-balance">
                    Solicitud de eliminación pendiente
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 text-pretty mt-0.5">
                    El gestor <strong>{application.deletionRequestedBy}</strong> solicitó eliminar esta solicitud el{' '}
                    {formatDateTime(application.deletionRequestedAt)}. Revise y decida si procede la eliminación.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeletingApp || isRejectingDeletion}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Aprobar eliminación
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectDeletion}
                  disabled={isDeletingApp || isRejectingDeletion}
                >
                  {isRejectingDeletion
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rechazando…</>
                    : 'Rechazar solicitud'}
                </Button>
              </div>
            </div>
          )}

          {/* ── PESTAÑAS PRINCIPALES ── */}
          {application.status !== 'borrador' && (
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v);
              if (v === 'firmas') handleFirmasTabOpen();
            }}>
              <TabsList className={`grid w-full ${showMatriculaTab ? 'grid-cols-3' : showFirmasTab ? 'grid-cols-2' : 'grid-cols-1'} bg-primary/10 border border-primary/20 p-1 rounded-lg`}>
                <TabsTrigger
                  value="estudio"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Estudio de Crédito
                </TabsTrigger>
                {showFirmasTab && (
                  <TabsTrigger
                    value="firmas"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Firmas
                    {application.status === 'pendiente_firma' && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    )}
                  </TabsTrigger>
                )}
                {showMatriculaTab && (
                  <TabsTrigger
                    value="matricula"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Matrícula Financiera
                  </TabsTrigger>
                )}
              </TabsList>

              {/* ─────────────── TAB 1: ESTUDIO DE CRÉDITO ─────────────── */}
              <TabsContent value="estudio" className="space-y-6 mt-6">

                {/* Sección A: Estudiante */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-balance">Sección A – Información del Estudiante</CardTitle>
                    <CardDescription>
                      Datos registrados por el estudiante. Pasa el cursor sobre un campo y haz clic en el lápiz para editarlo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <EditableField
                        label="Nombre Completo"
                        displayValue={application.studentFullName || 'N/A'}
                        rawValue={application.studentFullName}
                        type="text"
                        onSave={(v) => handleFieldSave('student_full_name', v)}
                        isModified={modifiedFields.has('student_full_name')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Tipo de Documento"
                        displayValue={application.studentDocumentType || 'N/A'}
                        rawValue={application.studentDocumentType}
                        type="select"
                        options={[
                          { value: 'CC', label: 'CC – Cédula de Ciudadanía' },
                          { value: 'CE', label: 'CE – Cédula de Extranjería' },
                          { value: 'TI', label: 'TI – Tarjeta de Identidad' },
                        ]}
                        onSave={(v) => handleFieldSave('student_document_type', v)}
                        isModified={modifiedFields.has('student_document_type')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Número de Documento"
                        displayValue={application.studentDocumentNumber || 'N/A'}
                        rawValue={application.studentDocumentNumber}
                        type="text"
                        onSave={(v) => handleFieldSave('student_document_number', v)}
                        isModified={modifiedFields.has('student_document_number')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Fecha de Expedición"
                        displayValue={formatDateShort(application.studentDocumentExpeditionDate)}
                        rawValue={application.studentDocumentExpeditionDate}
                        type="date"
                        onSave={(v) => handleFieldSave('student_document_expedition_date', v)}
                        isModified={modifiedFields.has('student_document_expedition_date')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Fecha de Nacimiento"
                        displayValue={formatDateShort(application.studentBirthDate)}
                        rawValue={application.studentBirthDate}
                        type="date"
                        onSave={(v) => handleFieldSave('student_birth_date', v)}
                        isModified={modifiedFields.has('student_birth_date')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Email"
                        displayValue={application.studentEmail || 'N/A'}
                        rawValue={application.studentEmail}
                        type="email"
                        onSave={(v) => handleFieldSave('student_email', v)}
                        isModified={modifiedFields.has('student_email')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Teléfono"
                        displayValue={application.studentPhone || 'N/A'}
                        rawValue={application.studentPhone}
                        type="tel"
                        onSave={(v) => handleFieldSave('student_phone', v)}
                        isModified={modifiedFields.has('student_phone')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Dirección"
                        displayValue={application.studentAddress || 'N/A'}
                        rawValue={application.studentAddress}
                        type="text"
                        onSave={(v) => handleFieldSave('student_address', v)}
                        isModified={modifiedFields.has('student_address')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Barrio"
                        displayValue={application.studentNeighborhood || 'N/A'}
                        rawValue={application.studentNeighborhood}
                        type="text"
                        onSave={(v) => handleFieldSave('student_neighborhood', v)}
                        isModified={modifiedFields.has('student_neighborhood')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Ciudad"
                        displayValue={application.studentCity || 'N/A'}
                        rawValue={application.studentCity}
                        type="text"
                        onSave={(v) => handleFieldSave('student_city', v)}
                        isModified={modifiedFields.has('student_city')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Departamento"
                        displayValue={application.studentDepartment || 'N/A'}
                        rawValue={application.studentDepartment}
                        type="text"
                        onSave={(v) => handleFieldSave('student_department', v)}
                        isModified={modifiedFields.has('student_department')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Programa"
                        displayValue={application.studentProgram || 'N/A'}
                        rawValue={application.studentProgram}
                        type="text"
                        onSave={(v) => handleFieldSave('student_program', v)}
                        isModified={modifiedFields.has('student_program')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Semestre"
                        displayValue={application.studentSemester || 'N/A'}
                        rawValue={application.studentSemester}
                        type="text"
                        onSave={(v) => handleFieldSave('student_semester', v)}
                        isModified={modifiedFields.has('student_semester')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Jornada"
                        displayValue={application.studentShift || 'N/A'}
                        rawValue={application.studentShift}
                        type="select"
                        options={[
                          { value: 'Diurna', label: 'Diurna' },
                          { value: 'Nocturna', label: 'Nocturna' },
                          { value: 'Sabatina', label: 'Sabatina' },
                        ]}
                        onSave={(v) => handleFieldSave('student_shift', v)}
                        isModified={modifiedFields.has('student_shift')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="¿Trabaja Actualmente?"
                        displayValue={application.studentWorks ? 'Sí' : 'No'}
                        rawValue={application.studentWorks}
                        type="boolean"
                        onSave={(v) => handleFieldSave('student_works', v)}
                        isModified={modifiedFields.has('student_works')}
                        disabled={isTerminal}
                      />
                      <EditableField
                        label="Parentesco con Deudor Solidario"
                        displayValue={application.studentRelationshipToCosigner || 'N/A'}
                        rawValue={application.studentRelationshipToCosigner}
                        type="text"
                        onSave={(v) => handleFieldSave('student_relationship_to_cosigner', v)}
                        isModified={modifiedFields.has('student_relationship_to_cosigner')}
                        disabled={isTerminal}
                      />
                    </div>

                    {application.studentWorks && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-semibold mb-3">Información Laboral del Estudiante</p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <EditableField
                              label="Empresa"
                              displayValue={application.studentCompanyName || 'N/A'}
                              rawValue={application.studentCompanyName}
                              type="text"
                              onSave={(v) => handleFieldSave('student_company_name', v)}
                        isModified={modifiedFields.has('student_company_name')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Salario"
                              displayValue={application.studentSalary ? formatCurrency(application.studentSalary) : 'N/A'}
                              rawValue={application.studentSalary}
                              type="number"
                              onSave={(v) => handleFieldSave('student_salary', v)}
                        isModified={modifiedFields.has('student_salary')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Dirección de la Empresa"
                              displayValue={application.studentCompanyAddress || 'N/A'}
                              rawValue={application.studentCompanyAddress}
                              type="text"
                              onSave={(v) => handleFieldSave('student_company_address', v)}
                        isModified={modifiedFields.has('student_company_address')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Teléfono de la Empresa"
                              displayValue={application.studentCompanyPhone || 'N/A'}
                              rawValue={application.studentCompanyPhone}
                              type="tel"
                              onSave={(v) => handleFieldSave('student_company_phone', v)}
                        isModified={modifiedFields.has('student_company_phone')}
                              disabled={isTerminal}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Verificación sección A */}
                    <VerificationPanel
                      id="student"
                      label="Notas de Verificación – Datos del Estudiante"
                      notes={studentNotes}
                      onNotesChange={setStudentNotes}
                      verification={studentVerification}
                      onSave={(status) => {
                        setStudentVerification(status);
                        handleVerificationChange('student', status, studentNotes);
                      }}
                      isRector={isRector}
                      disabled={isTerminal}
                    />
                  </CardContent>
                </Card>

                {/* Sección B: Deudor Solidario */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-balance">Sección B – Información del Deudor Solidario</CardTitle>
                    <CardDescription>
                      Datos registrados del deudor solidario. Pasa el cursor sobre un campo y haz clic en el lápiz para editarlo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-3">Datos Personales</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <EditableField
                          label="Nombre Completo"
                          displayValue={application.cosignerFullName || 'N/A'}
                          rawValue={application.cosignerFullName}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_full_name', v)}
                        isModified={modifiedFields.has('cosigner_full_name')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Tipo de Documento"
                          displayValue={application.cosignerDocumentType || 'N/A'}
                          rawValue={application.cosignerDocumentType}
                          type="select"
                          options={[
                            { value: 'CC', label: 'CC – Cédula de Ciudadanía' },
                            { value: 'CE', label: 'CE – Cédula de Extranjería' },
                            { value: 'TI', label: 'TI – Tarjeta de Identidad' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_document_type', v)}
                        isModified={modifiedFields.has('cosigner_document_type')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Número de Documento"
                          displayValue={application.cosignerDocumentNumber || 'N/A'}
                          rawValue={application.cosignerDocumentNumber}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_document_number', v)}
                        isModified={modifiedFields.has('cosigner_document_number')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Fecha de Expedición"
                          displayValue={formatDateShort(application.cosignerDocumentExpeditionDate)}
                          rawValue={application.cosignerDocumentExpeditionDate}
                          type="date"
                          onSave={(v) => handleFieldSave('cosigner_document_expedition_date', v)}
                        isModified={modifiedFields.has('cosigner_document_expedition_date')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Fecha de Nacimiento"
                          displayValue={formatDateShort(application.cosignerBirthDate)}
                          rawValue={application.cosignerBirthDate}
                          type="date"
                          onSave={(v) => handleFieldSave('cosigner_birth_date', v)}
                        isModified={modifiedFields.has('cosigner_birth_date')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Género"
                          displayValue={application.cosignerGender || 'N/A'}
                          rawValue={application.cosignerGender}
                          type="select"
                          options={[
                            { value: 'Masculino', label: 'Masculino' },
                            { value: 'Femenino', label: 'Femenino' },
                            { value: 'Otro', label: 'Otro' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_gender', v)}
                        isModified={modifiedFields.has('cosigner_gender')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Estado Civil"
                          displayValue={application.cosignerMaritalStatus || 'N/A'}
                          rawValue={application.cosignerMaritalStatus}
                          type="select"
                          options={[
                            { value: 'Soltero(a)', label: 'Soltero(a)' },
                            { value: 'Casado(a)', label: 'Casado(a)' },
                            { value: 'Unión libre', label: 'Unión libre' },
                            { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                            { value: 'Viudo(a)', label: 'Viudo(a)' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_marital_status', v)}
                        isModified={modifiedFields.has('cosigner_marital_status')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Personas a Cargo"
                          displayValue={application.cosignerDependents != null ? String(application.cosignerDependents) : 'N/A'}
                          rawValue={application.cosignerDependents}
                          type="number"
                          onSave={(v) => handleFieldSave('cosigner_dependents', v)}
                        isModified={modifiedFields.has('cosigner_dependents')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Email"
                          displayValue={application.cosignerEmail || 'N/A'}
                          rawValue={application.cosignerEmail}
                          type="email"
                          onSave={(v) => handleFieldSave('cosigner_email', v)}
                        isModified={modifiedFields.has('cosigner_email')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Teléfono"
                          displayValue={application.cosignerPhone || 'N/A'}
                          rawValue={application.cosignerPhone}
                          type="tel"
                          onSave={(v) => handleFieldSave('cosigner_phone', v)}
                        isModified={modifiedFields.has('cosigner_phone')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Dirección"
                          displayValue={application.cosignerAddress || 'N/A'}
                          rawValue={application.cosignerAddress}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_address', v)}
                        isModified={modifiedFields.has('cosigner_address')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Barrio"
                          displayValue={application.cosignerNeighborhood || 'N/A'}
                          rawValue={application.cosignerNeighborhood}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_neighborhood', v)}
                        isModified={modifiedFields.has('cosigner_neighborhood')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Ciudad"
                          displayValue={application.cosignerCity || 'N/A'}
                          rawValue={application.cosignerCity}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_city', v)}
                        isModified={modifiedFields.has('cosigner_city')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Departamento"
                          displayValue={application.cosignerDepartment || 'N/A'}
                          rawValue={application.cosignerDepartment}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_department', v)}
                        isModified={modifiedFields.has('cosigner_department')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Ocupación"
                          displayValue={application.cosignerOccupation || 'N/A'}
                          rawValue={application.cosignerOccupation}
                          type="select"
                          options={[
                            { value: 'Empleado', label: 'Empleado' },
                            { value: 'Pensionado', label: 'Pensionado' },
                            { value: 'Independiente', label: 'Independiente' },
                            { value: 'Otro', label: 'Otro' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_occupation', v)}
                        isModified={modifiedFields.has('cosigner_occupation')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Nivel Educativo"
                          displayValue={application.cosignerEducationLevel || 'N/A'}
                          rawValue={application.cosignerEducationLevel}
                          type="select"
                          options={[
                            { value: 'Primaria', label: 'Primaria' },
                            { value: 'Secundaria', label: 'Secundaria' },
                            { value: 'Técnico', label: 'Técnico' },
                            { value: 'Tecnólogo', label: 'Tecnólogo' },
                            { value: 'Universitario', label: 'Universitario' },
                            { value: 'Posgrado', label: 'Posgrado' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_education_level', v)}
                        isModified={modifiedFields.has('cosigner_education_level')}
                          disabled={isTerminal}
                        />
                      </div>
                    </div>

                    {application.cosignerMaritalStatus === 'Casado(a)' && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-semibold mb-3">Información del Cónyuge</p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <EditableField
                              label="Nombre del Cónyuge"
                              displayValue={application.cosignerSpouseName || 'N/A'}
                              rawValue={application.cosignerSpouseName}
                              type="text"
                              onSave={(v) => handleFieldSave('cosigner_spouse_name', v)}
                        isModified={modifiedFields.has('cosigner_spouse_name')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Empresa del Cónyuge"
                              displayValue={application.cosignerSpouseCompany || 'N/A'}
                              rawValue={application.cosignerSpouseCompany}
                              type="text"
                              onSave={(v) => handleFieldSave('cosigner_spouse_company', v)}
                        isModified={modifiedFields.has('cosigner_spouse_company')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Dirección Empresa del Cónyuge"
                              displayValue={application.cosignerSpouseCompanyAddress || 'N/A'}
                              rawValue={application.cosignerSpouseCompanyAddress}
                              type="text"
                              onSave={(v) => handleFieldSave('cosigner_spouse_company_address', v)}
                        isModified={modifiedFields.has('cosigner_spouse_company_address')}
                              disabled={isTerminal}
                            />
                            <EditableField
                              label="Teléfono Empresa del Cónyuge"
                              displayValue={application.cosignerSpouseCompanyPhone || 'N/A'}
                              rawValue={application.cosignerSpouseCompanyPhone}
                              type="tel"
                              onSave={(v) => handleFieldSave('cosigner_spouse_company_phone', v)}
                        isModified={modifiedFields.has('cosigner_spouse_company_phone')}
                              disabled={isTerminal}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-3">Información Laboral</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <EditableField
                          label="Empresa"
                          displayValue={application.cosignerCompany || 'N/A'}
                          rawValue={application.cosignerCompany}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_company', v)}
                        isModified={modifiedFields.has('cosigner_company')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Dirección de la Empresa"
                          displayValue={application.cosignerCompanyAddress || 'N/A'}
                          rawValue={application.cosignerCompanyAddress}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_company_address', v)}
                        isModified={modifiedFields.has('cosigner_company_address')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Cargo"
                          displayValue={application.cosignerPosition || 'N/A'}
                          rawValue={application.cosignerPosition}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_position', v)}
                        isModified={modifiedFields.has('cosigner_position')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Teléfono de la Empresa"
                          displayValue={application.cosignerCompanyPhone || 'N/A'}
                          rawValue={application.cosignerCompanyPhone}
                          type="tel"
                          onSave={(v) => handleFieldSave('cosigner_company_phone', v)}
                        isModified={modifiedFields.has('cosigner_company_phone')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Extensión"
                          displayValue={application.cosignerCompanyExtension || 'N/A'}
                          rawValue={application.cosignerCompanyExtension}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_company_extension', v)}
                        isModified={modifiedFields.has('cosigner_company_extension')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Ciudad de la Empresa"
                          displayValue={application.cosignerCompanyCity || 'N/A'}
                          rawValue={application.cosignerCompanyCity}
                          type="text"
                          onSave={(v) => handleFieldSave('cosigner_company_city', v)}
                        isModified={modifiedFields.has('cosigner_company_city')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Tipo de Contrato"
                          displayValue={application.cosignerContractType || 'N/A'}
                          rawValue={application.cosignerContractType}
                          type="select"
                          options={[
                            { value: 'Indefinido', label: 'Indefinido' },
                            { value: 'Fijo', label: 'Fijo' },
                            { value: 'Prestación de servicios', label: 'Prestación de servicios' },
                          ]}
                          onSave={(v) => handleFieldSave('cosigner_contract_type', v)}
                        isModified={modifiedFields.has('cosigner_contract_type')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Fecha de Vinculación"
                          displayValue={formatDateShort(application.cosignerHireDate)}
                          rawValue={application.cosignerHireDate}
                          type="date"
                          onSave={(v) => handleFieldSave('cosigner_hire_date', v)}
                        isModified={modifiedFields.has('cosigner_hire_date')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Ingresos Mensuales"
                          displayValue={application.cosignerIncome ? formatCurrency(application.cosignerIncome) : 'N/A'}
                          rawValue={application.cosignerIncome}
                          type="number"
                          onSave={(v) => handleFieldSave('cosigner_income', v)}
                        isModified={modifiedFields.has('cosigner_income')}
                          disabled={isTerminal}
                        />
                        <EditableField
                          label="Gastos Mensuales"
                          displayValue={application.cosignerMonthlyExpenses ? formatCurrency(application.cosignerMonthlyExpenses) : 'N/A'}
                          rawValue={application.cosignerMonthlyExpenses}
                          type="number"
                          onSave={(v) => handleFieldSave('cosigner_monthly_expenses', v)}
                        isModified={modifiedFields.has('cosigner_monthly_expenses')}
                          disabled={isTerminal}
                        />
                      </div>
                    </div>

                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-3">Referencias</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <EditableField
                            label="Referencia Familiar – Nombre"
                            displayValue={application.cosignerFamilyReferenceName || 'N/A'}
                            rawValue={application.cosignerFamilyReferenceName}
                            type="text"
                            onSave={(v) => handleFieldSave('cosigner_family_reference_name', v)}
                        isModified={modifiedFields.has('cosigner_family_reference_name')}
                            disabled={isTerminal}
                          />
                          <EditableField
                            label="Referencia Familiar – Teléfono"
                            displayValue={application.cosignerFamilyReferencePhone || 'N/A'}
                            rawValue={application.cosignerFamilyReferencePhone}
                            type="tel"
                            onSave={(v) => handleFieldSave('cosigner_family_reference_phone', v)}
                        isModified={modifiedFields.has('cosigner_family_reference_phone')}
                            disabled={isTerminal}
                          />
                        </div>
                        <div className="space-y-1">
                          <EditableField
                            label="Referencia Personal – Nombre"
                            displayValue={application.cosignerPersonalReferenceName || 'N/A'}
                            rawValue={application.cosignerPersonalReferenceName}
                            type="text"
                            onSave={(v) => handleFieldSave('cosigner_personal_reference_name', v)}
                        isModified={modifiedFields.has('cosigner_personal_reference_name')}
                            disabled={isTerminal}
                          />
                          <EditableField
                            label="Referencia Personal – Teléfono"
                            displayValue={application.cosignerPersonalReferencePhone || 'N/A'}
                            rawValue={application.cosignerPersonalReferencePhone}
                            type="tel"
                            onSave={(v) => handleFieldSave('cosigner_personal_reference_phone', v)}
                        isModified={modifiedFields.has('cosigner_personal_reference_phone')}
                            disabled={isTerminal}
                          />
                        </div>
                        <div className="space-y-1">
                          <EditableField
                            label="Referencia Comercial – Nombre"
                            displayValue={application.cosignerCommercialReferenceName || 'N/A'}
                            rawValue={application.cosignerCommercialReferenceName}
                            type="text"
                            onSave={(v) => handleFieldSave('cosigner_commercial_reference_name', v)}
                        isModified={modifiedFields.has('cosigner_commercial_reference_name')}
                            disabled={isTerminal}
                          />
                          <EditableField
                            label="Referencia Comercial – Teléfono"
                            displayValue={application.cosignerCommercialReferencePhone || 'N/A'}
                            rawValue={application.cosignerCommercialReferencePhone}
                            type="tel"
                            onSave={(v) => handleFieldSave('cosigner_commercial_reference_phone', v)}
                        isModified={modifiedFields.has('cosigner_commercial_reference_phone')}
                            disabled={isTerminal}
                          />
                        </div>
                        {application.cosignerOccupation === 'Independiente' && (
                          <>
                            <div className="space-y-1">
                              <EditableField
                                label="Principal Proveedor – Nombre"
                                displayValue={application.cosignerMainSupplierName || 'N/A'}
                                rawValue={application.cosignerMainSupplierName}
                                type="text"
                                onSave={(v) => handleFieldSave('cosigner_main_supplier_name', v)}
                        isModified={modifiedFields.has('cosigner_main_supplier_name')}
                                disabled={isTerminal}
                              />
                              <EditableField
                                label="Principal Proveedor – Teléfono"
                                displayValue={application.cosignerMainSupplierPhone || 'N/A'}
                                rawValue={application.cosignerMainSupplierPhone}
                                type="tel"
                                onSave={(v) => handleFieldSave('cosigner_main_supplier_phone', v)}
                        isModified={modifiedFields.has('cosigner_main_supplier_phone')}
                                disabled={isTerminal}
                              />
                            </div>
                            <div className="space-y-1">
                              <EditableField
                                label="Principal Cliente – Nombre"
                                displayValue={application.cosignerMainClientName || 'N/A'}
                                rawValue={application.cosignerMainClientName}
                                type="text"
                                onSave={(v) => handleFieldSave('cosigner_main_client_name', v)}
                        isModified={modifiedFields.has('cosigner_main_client_name')}
                                disabled={isTerminal}
                              />
                              <EditableField
                                label="Principal Cliente – Teléfono"
                                displayValue={application.cosignerMainClientPhone || 'N/A'}
                                rawValue={application.cosignerMainClientPhone}
                                type="tel"
                                onSave={(v) => handleFieldSave('cosigner_main_client_phone', v)}
                        isModified={modifiedFields.has('cosigner_main_client_phone')}
                                disabled={isTerminal}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Verificación sección B */}
                    <VerificationPanel
                      id="cosigner"
                      label="Notas de Verificación – Datos del Deudor Solidario"
                      notes={cosignerNotes}
                      onNotesChange={setCosignerNotes}
                      verification={cosignerVerification}
                      onSave={(status) => {
                        setCosignerVerification(status);
                        handleVerificationChange('cosigner', status, cosignerNotes);
                      }}
                      isRector={isRector}
                      hint="Incluya verificación de referencias familiares y personales"
                      disabled={isTerminal}
                    />
                  </CardContent>
                </Card>

                {/* Sección C: Pago Estudio de Crédito */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-balance">Sección C – Pago Estudio de Crédito Educativo</CardTitle>
                    <CardDescription>Información del pago del estudio de crédito educativo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Número de Recibo</p>
                        <p className="text-base">{application.creditStudyReceiptNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Pago</p>
                        <p className="text-base">{formatDateShort(application.creditStudyPaymentDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor Pagado</p>
                        <p className="text-base">{application.creditStudyAmount ? formatCurrency(application.creditStudyAmount) : 'N/A'}</p>
                      </div>
                    </div>
                    <VerificationPanel
                      id="payment"
                      label="Notas de Verificación – Pago del Estudio de Crédito Educativo"
                      notes={paymentNotes}
                      onNotesChange={setPaymentNotes}
                      verification={paymentVerification}
                      onSave={(status) => {
                        setPaymentVerification(status);
                        handleVerificationChange('payment', status, paymentNotes);
                      }}
                      isRector={isRector}
                      disabled={isTerminal}
                    />
                  </CardContent>
                </Card>

                {/* Sección D: Plan Crédito */}
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-balance">Sección D – Selección Plan Crédito Educativo</CardTitle>
                      <CardDescription>Plan seleccionado, condiciones del crédito y tabla de amortización</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Datos del plan */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plan</p>
                        <p className="text-base font-semibold">{application.creditPlan || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor del Semestre</p>
                        <p className="text-base font-semibold">{application.semesterValue ? formatCurrency(application.semesterValue) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Cuota Inicial</p>
                        <p className="text-base">{application.initialPayment ? formatCurrency(application.initialPayment) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Saldo Financiado</p>
                        <p className="text-base">
                          {financedAmount != null ? formatCurrency(financedAmount) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Número de Cuotas</p>
                        <p className="text-base">{application.numberOfInstallments ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Día de Pago</p>
                        <p className="text-base">{application.paymentDayOfMonth ?? 'N/A'}</p>
                      </div>
                    </div>

                    {/* ── Tabla de Amortización inline (obligatoria) ── */}
                    {application.numberOfInstallments && application.numberOfInstallments > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-medium">Tabla de Amortización</p>
                            <p className="text-xs text-muted-foreground text-pretty">
                              Obligatoria para aprobar la solicitud. Complete fecha y valor de cada cuota.
                            </p>
                          </div>
                          {/* Indicador de completitud */}
                          {(() => {
                            const filled = amortizationRows.filter(r => r.dueDate && r.amount > 0).length;
                            const total  = amortizationRows.length;
                            const done   = filled === total && total > 0;
                            return (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                                done
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {done
                                  ? <><CheckCircle className="h-3.5 w-3.5" /> Completa ({total}/{total})</>
                                  : <><AlertCircle className="h-3.5 w-3.5" /> Incompleta ({filled}/{total})</>
                                }
                              </span>
                            );
                          })()}
                        </div>

                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full min-w-max text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap w-16">Cuota</th>
                                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Fecha de Pago</th>
                                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Valor de Pago</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {amortizationRows.map((row, idx) => {
                                const rowInvalid = !row.dueDate || row.amount <= 0;
                                return (
                                  <tr key={row.installmentNumber} className={rowInvalid && !isTerminal ? 'bg-amber-50/40' : ''}>
                                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                      #{row.installmentNumber}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isTerminal ? (
                                        <span>{row.dueDate ? formatDateShort(row.dueDate) : '—'}</span>
                                      ) : (
                                        <Input
                                          type="date"
                                          value={row.dueDate}
                                          onChange={(e) => {
                                            const updated = [...amortizationRows];
                                            updated[idx] = { ...updated[idx], dueDate: e.target.value };
                                            setAmortizationRows(updated);
                                          }}
                                          className="h-8 text-sm px-2 w-40"
                                        />
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isTerminal ? (
                                        <span>{row.amount > 0 ? formatCurrency(row.amount) : '—'}</span>
                                      ) : (
                                        <Input
                                          type="number"
                                          min={0}
                                          step={1000}
                                          value={row.amount || ''}
                                          placeholder="0"
                                          onChange={(e) => {
                                            const updated = [...amortizationRows];
                                            updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                                            setAmortizationRows(updated);
                                          }}
                                          className="h-8 text-sm px-2 w-36"
                                        />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {amortizationRows.length > 0 && (
                              <tfoot>
                                <tr className="border-t border-border bg-muted/20">
                                  <td colSpan={2} className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                                    Total
                                  </td>
                                  <td className="px-3 py-2 text-sm font-semibold whitespace-nowrap">
                                    {formatCurrency(amortizationRows.reduce((s, r) => s + (r.amount || 0), 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>

                        {/* Botón guardar amortización */}
                        {!isTerminal && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleSaveAmortization}
                              disabled={isSavingAmortization}
                            >
                              {isSavingAmortization
                                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Guardando…</>
                                : <><Save className="h-3.5 w-3.5 mr-2" />Guardar amortización</>
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No se definió un número de cuotas en esta solicitud.
                      </p>
                    )}

                    <VerificationPanel
                      id="plan"
                      label="Notas de Verificación – Selección Plan Crédito Educativo"
                      notes={planNotes}
                      onNotesChange={setPlanNotes}
                      verification={planVerification}
                      onSave={(status) => {
                        setPlanVerification(status);
                        handleVerificationChange('plan', status, planNotes);
                      }}
                      isRector={isRector}
                      hint={
                        application.numberOfInstallments && application.numberOfInstallments > 0 &&
                        amortizationRows.some(r => !r.dueDate || r.amount <= 0)
                          ? '⚠️ La tabla de amortización está incompleta. Complétela y guárdela antes de verificar esta sección.'
                          : undefined
                      }
                      disabled={isTerminal}
                    />
                  </CardContent>
                </Card>

                {/* Sección E: Cuota Inicial */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-balance">Sección E – Pago Cuota Inicial</CardTitle>
                    <CardDescription>Información del pago de la cuota inicial</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Número de Recibo</p>
                        <p className="text-base">{application.initialPaymentReceiptNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Pago</p>
                        <p className="text-base">{application.initialPaymentDate ? formatDateShort(application.initialPaymentDate) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor Pagado</p>
                        <p className="text-base">{application.initialPaymentAmount ? formatCurrency(application.initialPaymentAmount) : 'N/A'}</p>
                      </div>
                    </div>
                    <VerificationPanel
                      id="initial_payment"
                      label="Notas de Verificación – Pago Cuota Inicial"
                      notes={initialPaymentNotes}
                      onNotesChange={setInitialPaymentNotes}
                      verification={initialPaymentVerification}
                      onSave={(status) => {
                        setInitialPaymentVerification(status);
                        handleVerificationChange('initial_payment', status, initialPaymentNotes);
                      }}
                      isRector={isRector}
                      disabled={isTerminal}
                    />
                  </CardContent>
                </Card>

                {/* Sección F: Autorizaciones */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-balance">Sección F – Autorizaciones y Declaraciones</CardTitle>
                    <CardDescription>Estado de las autorizaciones del estudiante y del deudor solidario</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        {application.studentAuthorizationAccepted
                          ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="font-medium">Autorización del Estudiante</p>
                          <p className="text-sm text-muted-foreground">{application.studentAuthorizationAccepted ? 'Aceptada' : 'No aceptada'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        {application.cosignerAuthorizationAccepted
                          ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="font-medium">Autorización del Deudor Solidario</p>
                          <p className="text-sm text-muted-foreground">{application.cosignerAuthorizationAccepted ? 'Aceptada' : 'No aceptada'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historial */}
                {statusHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-balance">Historial de Estados</CardTitle>
                      <CardDescription>Registro de todos los cambios de estado de la solicitud</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {statusHistory.map((history) => (
                          <div key={history.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                            <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {history.previous_status && (
                                    <>
                                      <Badge variant="outline">{STATUS_LABELS[history.previous_status] || history.previous_status}</Badge>
                                      <span className="text-muted-foreground">→</span>
                                    </>
                                  )}
                                  <Badge>{STATUS_LABELS[history.new_status] || history.new_status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{formatDateTime(history.changed_at)}</p>
                              </div>
                              {history.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ─────────────── TAB 2: FIRMAS ─────────────── */}
              {showFirmasTab && (
                <TabsContent value="firmas" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-balance">Firma Electrónica – ZapSign</CardTitle>
                      <CardDescription className="text-pretty">
                        Descargue el archivo Excel con todos los datos para la combinación de correspondencia en Word.
                        Una vez los documentos estén firmados, pegue el link del archivo firmado y guarde para completar el proceso.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                      {/* 1 ── Banner de estado: en espera de firma ── */}
                      {application.status === 'pendiente_firma' && (
                        <div className="flex items-start gap-3 border border-purple-200 bg-purple-50 dark:bg-purple-950/20 rounded-md p-4">
                          <AlertCircle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">En espera de firma electrónica</p>
                            <p className="text-xs text-purple-700 dark:text-purple-300 text-pretty">
                              Los documentos han sido enviados. Cuando el estudiante y el deudor solidario hayan firmado, registre el link del documento firmado a continuación.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 2 ── Previsualización de datos + pagaré + nombre archivo ── */}
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <h4 className="text-sm font-semibold text-balance">Previsualización de Datos para ZapSign</h4>
                          <Button variant="outline" size="sm" className="shrink-0" onClick={handleDownloadExcel}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Descargar Excel
                          </Button>
                        </div>
                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Campo</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Estudiante</th>
                                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Deudor Solidario</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              <tr>
                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">Nombre</td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.studentFullName} /></td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.cosignerFullName} /></td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">Documento</td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.studentDocumentNumber} /></td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.cosignerDocumentNumber} /></td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">Email</td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.studentEmail} /></td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.cosignerEmail} /></td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">Teléfono</td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.studentPhone} /></td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><InlineCopyCell value={application.cosignerPhone} /></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                          <CopyField
                            label="Número del Pagaré a la Orden"
                            value={pagareNumber}
                            hint="Formato: YYYYMM + consecutivo (001) + código de solicitud. Péguelo en la plantilla del pagaré."
                          />
                          <CopyField
                            label="Nombre sugerido del archivo (ZapSign)"
                            value={suggestedFileName}
                            hint="Formato: Pagare + número pagaré + primer apellido + inicial del nombre. Use este nombre al subir el archivo a ZapSign."
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* 3 ── PASO 1: Enviar documentos para firma ── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {application.status === 'aprobado' ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                          )}
                          <h4 className="text-sm font-semibold">Paso 1 — Enviar documentos para firma electrónica</h4>
                        </div>

                        {application.status !== 'aprobado' && application.zapsignSendLink ? (
                          /* Links guardados — modo lectura */
                          (<div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Estudiante / Deudor Principal</p>
                              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 min-w-0">
                                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 min-w-0 text-sm truncate select-all" title={application.zapsignSendLink}>
                                  {application.zapsignSendLink}
                                </span>
                                <Button type="button" variant="ghost" size="icon"
                                  className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Abrir en nueva ventana"
                                  onClick={() => window.open(application.zapsignSendLink, '_blank', 'noopener,noreferrer')}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {application.zapsignCosignerSendLink && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Deudor Solidario</p>
                                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 min-w-0">
                                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="flex-1 min-w-0 text-sm truncate select-all" title={application.zapsignCosignerSendLink}>
                                    {application.zapsignCosignerSendLink}
                                  </span>
                                  <Button type="button" variant="ghost" size="icon"
                                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Abrir en nueva ventana"
                                    onClick={() => window.open(application.zapsignCosignerSendLink, '_blank', 'noopener,noreferrer')}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>)
                        ) : (
                          /* Ingreso de links */
                          (<div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="zapsign-send-link" className="text-sm font-normal">
                                Link del proceso ZapSign – Estudiante / Deudor Principal <span className="text-destructive">*</span>
                              </Label>
                              <p className="text-xs text-muted-foreground text-pretty">
                                Suba el documento a ZapSign, copie el link del proceso y péguelo aquí antes de enviárselo al firmante.
                              </p>
                              <Input
                                id="zapsign-send-link"
                                value={zapsignSendLink}
                                onChange={(e) => setZapsignSendLink(e.target.value)}
                                placeholder="https://app.zapsign.com.br/..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="zapsign-cosigner-send-link" className="text-sm font-normal">
                                Link del proceso ZapSign – Deudor Solidario
                                <span className="ml-1.5 text-xs text-muted-foreground">(opcional)</span>
                              </Label>
                              <p className="text-xs text-muted-foreground text-pretty">
                                Si el estudiante cuenta con deudor solidario, ingrese el link del proceso ZapSign correspondiente.
                              </p>
                              <Input
                                id="zapsign-cosigner-send-link"
                                value={zapsignCosignerSendLink}
                                onChange={(e) => setZapsignCosignerSendLink(e.target.value)}
                                placeholder="https://app.zapsign.com.br/... (opcional)"
                              />
                            </div>
                            <Button
                              onClick={handleSendForSigning}
                              disabled={isSendingDocs || !zapsignSendLink.trim()}
                              className="w-full md:w-auto"
                            >
                              {isSendingDocs ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                              ) : (
                                <><LinkIcon className="h-4 w-4 mr-2" />Enviado para firmas</>
                              )}
                            </Button>
                          </div>)
                        )}
                      </div>

                      <Separator />

                      {/* 4 ── PASO 2: Registrar documento firmado ── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {application.status === 'matricula_autorizada' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${application.status === 'pendiente_firma' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                          )}
                          <h4 className="text-sm font-semibold">Paso 2 — Registrar documento firmado</h4>
                        </div>

                        {application.status === 'aprobado' ? (
                          <p className="text-xs text-muted-foreground text-pretty">
                            Disponible una vez que los documentos hayan sido enviados para firma (Paso 1).
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <Label htmlFor="zapsign-link" className="text-sm font-normal">
                              Link del Documento Firmado (ZapSign)
                            </Label>
                            <p className="text-xs text-muted-foreground text-pretty">
                              Una vez el estudiante y el deudor solidario hayan firmado electrónicamente,
                              pegue aquí el link del documento firmado generado por ZapSign.
                            </p>

                            {application.status === 'matricula_autorizada' && !isEditingLink && zapsignLink ? (
                              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 min-w-0">
                                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 min-w-0 text-sm truncate select-all" title={zapsignLink}>{zapsignLink}</span>
                                <Button type="button" variant="ghost" size="icon"
                                  className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Editar link" onClick={() => setIsEditingLink(true)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon"
                                  className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Abrir en nueva ventana"
                                  onClick={() => window.open(zapsignLink, '_blank', 'noopener,noreferrer')}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Input
                                  id="zapsign-link"
                                  value={zapsignLink}
                                  onChange={(e) => setZapsignLink(e.target.value)}
                                  placeholder="https://app.zapsign.com.br/..."
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    onClick={async () => { await handleSaveZapSignLink(); setIsEditingLink(false); }}
                                    disabled={isSavingLink || !zapsignLink.trim()}
                                    className="w-full md:w-auto"
                                  >
                                    {isSavingLink ? (
                                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                                    ) : (
                                      <><CheckCircle className="h-4 w-4 mr-2" />Guardar y Finalizar Proceso de Firmas</>
                                    )}
                                  </Button>
                                  {isEditingLink && (
                                    <Button variant="outline"
                                      onClick={() => { setZapsignLink(application.zapsignSignedLink ?? ''); setIsEditingLink(false); }}
                                      className="w-full md:w-auto">
                                      Cancelar
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}

                            {application.status === 'matricula_autorizada' && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Proceso de firmas completado</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ─────────────── TAB 3: MATRÍCULA FINANCIERA ─────────────── */}
              {showMatriculaTab && (
                <TabsContent value="matricula" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-balance">Matrícula Financiera</CardTitle>
                        <CardDescription className="text-pretty">
                          Vista previa del documento de autorización de matrícula financiera para imprimir y entregar al estudiante.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => window.print()}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Imprimir Documento
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <MatriculaDocument application={application} generatedAt={new Date()} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* Vista para borradores (sin tabs) */}
          {application.status === 'borrador' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-balance">Esta solicitud es un borrador</CardTitle>
                <CardDescription className="text-pretty">
                  El estudiante aún no ha enviado esta solicitud para revisión. No es posible gestionar verificaciones en este estado.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

        </div>
      </div>
      {/* Diálogo solicitud de eliminación — Gestor */}
      <Dialog open={showRequestDeletionDialog} onOpenChange={setShowRequestDeletionDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Solicitar Eliminación de Solicitud</DialogTitle>
            <DialogDescription className="text-pretty">
              Esta acción enviará una solicitud de eliminación al rector o administrador para que
              la apruebe. Usted <strong>no eliminará</strong> la solicitud directamente.
            </DialogDescription>
          </DialogHeader>

          {application && (
            <div className="rounded-md bg-muted/40 border border-border px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Código</span>
                <span className="font-medium">{application.applicationCode}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estudiante</span>
                <span className="font-medium">{application.studentFullName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estado actual</span>
                <Badge className={`${STATUS_COLORS[application.status]} text-white text-xs`}>
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
            </div>
          )}

          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 text-pretty">
            El rector o administrador recibirá una alerta y deberá confirmar la eliminación antes de que sea efectiva.
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowRequestDeletionDialog(false)}
              disabled={isRequestingDeletion}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={isRequestingDeletion}
            >
              {isRequestingDeletion
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Enviar solicitud de eliminación</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Eliminación — solo administradores */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">
              {application?.deletionRequestedAt ? 'Aprobar Eliminación de Solicitud' : 'Eliminar Solicitud'}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {application?.deletionRequestedAt
                ? <>El gestor <strong>{application.deletionRequestedBy}</strong> solicitó eliminar esta solicitud. Al aprobar, se eliminará permanentemente la solicitud <strong>{application?.applicationCode}</strong> y todos sus registros. <span className="font-semibold text-destructive">No se puede deshacer.</span></>
                : <>¿Está seguro de que desea eliminar permanentemente la solicitud <strong>{application?.applicationCode}</strong>? Esta acción eliminará la solicitud y todos sus registros relacionados. <span className="font-semibold text-destructive">No se puede deshacer.</span></>
              }
            </DialogDescription>
          </DialogHeader>

          {application && (
            <div className="rounded-md bg-muted/40 border border-border px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Código</span>
                <span className="font-medium">{application.applicationCode}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estudiante</span>
                <span className="font-medium">{application.studentFullName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estado actual</span>
                <Badge className={`${STATUS_COLORS[application.status]} text-white text-xs`}>
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingApp}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApplication}
              disabled={isDeletingApp}
            >
              {isDeletingApp ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando…</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Eliminar definitivamente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de Cancelación */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-balance">Cancelar Solicitud</DialogTitle>
            <DialogDescription className="text-pretty">
              ¿Está seguro de que desea cancelar esta solicitud? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Motivo de cancelación (opcional)</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelación..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelApplication}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelando...</>
              ) : (
                <><Ban className="h-4 w-4 mr-2" />Confirmar Cancelación</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ─── Componente reutilizable de panel de verificación ───
interface VerificationPanelProps {
  id: string;
  label: string;
  notes: string;
  onNotesChange: (value: string) => void;
  verification: VerificationStatus | null;
  onSave: (status: VerificationStatus) => void;
  isRector: boolean;
  hint?: string;
  disabled?: boolean;
}

function VerificationPanel({
  id, label, notes, onNotesChange, verification, onSave, isRector, hint, disabled
}: VerificationPanelProps) {
  const [isEditing, setIsEditing] = useState(verification === null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (verification !== null) {
      setIsEditing(false);
    }
  }, [verification]);

  function handleGuardar() {
    if (!notes.trim()) {
      toast.error('Escriba una nota antes de guardar');
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirm(status: VerificationStatus) {
    onSave(status);
    setShowConfirm(false);
    setIsEditing(false);
  }

  // ¿El rector puede actuar sobre esta sección?
  const rectorCanAct = isRector && verification === 'requiere_aprobacion_rector';

  const StatusIcon = () => {
    if (!verification) return null;
    if (verification === 'cumple') {
      return (
        <span className="inline-flex items-center gap-1.5 text-green-600 font-medium text-sm">
          <CheckCircle className="w-5 h-5" />
          Cumple
        </span>
      );
    }
    if (verification === 'no_cumple') {
      return (
        <span className="inline-flex items-center gap-1.5 text-red-600 font-medium text-sm">
          <XCircle className="w-5 h-5" />
          No Cumple
        </span>
      );
    }
    if (verification === 'requiere_aprobacion_rector') {
      return (
        <span className="inline-flex items-center gap-1.5 text-violet-600 font-medium text-sm">
          <Bell className="w-5 h-5" />
          Requiere Aprobación Rector
        </span>
      );
    }
    if (verification === 'autorizado_rector') {
      return (
        <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium text-sm">
          <Shield className="w-5 h-5" />
          Autorizado por Rector
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <div className="mt-4 space-y-3">
        <Separator />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Label htmlFor={`${id}-notes`} className="text-sm font-medium">{label}</Label>
          {!isEditing && verification && <StatusIcon />}
        </div>

        <Textarea
          id={`${id}-notes`}
          placeholder="Ingrese aquí sus anotaciones de verificación..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[80px]"
          disabled={disabled || (!isEditing && !rectorCanAct)}
        />

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

        {!disabled && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Rector actúa sobre secciones marcadas como requiere_aprobacion_rector */}
            {rectorCanAct && !isEditing ? (
              <Button type="button" size="sm" onClick={() => setShowConfirm(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Dar Resolución
              </Button>
            ) : isEditing ? (
              <Button type="button" size="sm" onClick={handleGuardar}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            ) : (
              /* Solo gestores no-rector pueden editar para cambiar su resultado */
              (!isRector && (<Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />Editar
                                </Button>))
            )}
          </div>
        )}
      </div>
      {/* Diálogo de confirmación */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-balance">
              {rectorCanAct ? '¿Cuál es su resolución?' : '¿Esta sección cumple los requisitos?'}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {rectorCanAct
                ? 'Como rector, puede aprobar esta sección o marcarla como No Cumple.'
                : 'Seleccione el resultado de la verificación para guardar las notas.'}
            </DialogDescription>
          </DialogHeader>

          {notes.trim() && (
            <div className="rounded-md bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground italic">
              "{notes.trim()}"
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            {rectorCanAct ? (
              /* Vista rector: Autorizar o No Cumple */
              (<>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                  onClick={() => handleConfirm('autorizado_rector')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Autorizado por Rector
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 flex-1"
                  onClick={() => handleConfirm('no_cumple')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  No Cumple
                </Button>
              </>)
            ) : (
              /* Vista gestor: Cumple / No Cumple / Requiere Rector */
              (<>
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 flex-1"
                  onClick={() => handleConfirm('cumple')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cumple
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 flex-1"
                  onClick={() => handleConfirm('no_cumple')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  No Cumple
                </Button>
                <Button
                  type="button"
                  className="bg-violet-600 hover:bg-violet-700 flex-1"
                  onClick={() => handleConfirm('requiere_aprobacion_rector')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Requiere Rector
                </Button>
              </>)
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Celda copiable en línea (para tabla de previsualización) ───
function InlineCopyCell({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const text = value || '';

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('No se pudo copiar al portapapeles');
    });
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-sm truncate select-all">{text || '—'}</span>
      {text && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          title="Copiar"
        >
          {copied
            ? <ClipboardCheck className="h-3.5 w-3.5 text-green-600" />
            : <Copy className="h-3.5 w-3.5" />
          }
        </Button>
      )}
    </div>
  );
}

// ─── Documento de Matrícula Financiera para impresión ───
interface MatriculaDocumentProps {
  application: Application;
  generatedAt: Date;
}

function MatriculaDocument({ application, generatedAt }: MatriculaDocumentProps) {
  const financedAmount =
    application.semesterValue != null && application.initialPayment != null
      ? application.semesterValue - application.initialPayment
      : application.financedAmount ?? 0;

  const fechaGeneracion = formatDateLong(new Date().toISOString());

  return (
    <div className="matricula-doc border border-border rounded-md p-6 md:p-10 space-y-8 bg-white text-foreground print:border-0 print:p-0 print:shadow-none max-w-3xl mx-auto">
      {/* Encabezado: logo + datos institución */}
      <div className="flex items-center gap-6 border-b border-border pb-6">
        <img
          src="/images/brand/cotecnova-logo.svg"
          alt="Logo Cotecnova"
          className="h-20 w-auto object-contain shrink-0"
        />
        <div className="min-w-0">

        </div>
      </div>
      {/* Título del documento */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold tracking-wide uppercase">
          Autorización de Matrícula Financiera
        </h1>
        <p className="text-sm text-muted-foreground">
          Fecha de generación: <strong>{fechaGeneracion}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Código de solicitud: <strong>{application.applicationCode}</strong>
        </p>
      </div>
      <Separator />
      {/* Datos del Estudiante */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Datos del Estudiante
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <DocField label="Nombre completo" value={application.studentFullName} />
          <DocField label="Tipo de documento" value={application.studentDocumentType} />
          <DocField label="Número de documento" value={application.studentDocumentNumber} />
          <DocField label="Fecha de expedición" value={application.studentDocumentExpeditionDate
            ? formatDateShort(application.studentDocumentExpeditionDate) : ''} />
          <DocField label="Programa académico" value={application.studentProgram} />
          <DocField label="Semestre" value={application.studentSemester} />
          <DocField label="Jornada" value={application.studentShift} />
          <DocField label="Correo electrónico" value={application.studentEmail} />
          <DocField label="Teléfono" value={application.studentPhone} />
          <DocField label="Dirección" value={`${application.studentAddress ?? ''}, ${application.studentCity ?? ''}`} />
        </div>
      </div>
      <Separator />
      {/* Información del Crédito */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Información del Crédito Educativo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <DocField label="Plan de crédito" value={application.creditPlan} />
          <DocField label="Valor del semestre"
            value={application.semesterValue != null ? `$${application.semesterValue.toLocaleString('es-CO')}` : ''} />
          <DocField label="Cuota inicial pagada"
            value={application.initialPayment != null ? `$${application.initialPayment.toLocaleString('es-CO')}` : ''} />
          <DocField label="Saldo financiado"
            value={financedAmount ? `$${financedAmount.toLocaleString('es-CO')}` : ''} />
          <DocField label="Número de cuotas" value={String(application.numberOfInstallments ?? '')} />
          <DocField label="Día de pago mensual" value={String(application.paymentDayOfMonth ?? '')} />
        </div>
      </div>
      {/* Pago de Cuota Inicial */}
      {(application.initialPaymentReceiptNumber || application.initialPaymentDate || application.initialPaymentAmount) && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pago de Cuota Inicial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {application.initialPaymentReceiptNumber && (
                <DocField label="N° recibo de pago" value={application.initialPaymentReceiptNumber} />
              )}
              {application.initialPaymentDate && (
                <DocField label="Fecha de pago"
                  value={formatDateShort(application.initialPaymentDate)} />
              )}
              {application.initialPaymentAmount != null && (
                <DocField label="Valor pagado"
                  value={`$${application.initialPaymentAmount.toLocaleString('es-CO')}`} />
              )}
            </div>
          </div>
        </>
      )}
      <Separator />
      {/* Nota legal */}

      {/* Espacio de firmas */}
    </div>
  );
}

// ─── Campo simple para el documento de matrícula ───
function DocField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
// ─── Campo copiable al portapapeles ───
interface CopyFieldProps {
  label: string;
  value: string;
  hint?: string;
}

function CopyField({ label, value, hint }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`"${label}" copiado al portapapeles`);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('No se pudo copiar al portapapeles');
    });
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground leading-tight">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        <code className="flex-1 min-w-0 text-sm font-mono font-semibold truncate select-all">
          {value || '—'}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          disabled={!value}
          title="Copiar"
        >
          {copied
            ? <ClipboardCheck className="h-4 w-4 text-green-600" />
            : <Copy className="h-4 w-4" />
          }
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground text-pretty leading-tight">{hint}</p>}
    </div>
  );
}

