import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Send, Save, Info, Copy } from 'lucide-react';
import { toast } from 'sonner';
import CosignerSection from '@/components/application/CosignerSection';
import StudentSection from '@/components/application/StudentSection';
import CreditStudySection from '@/components/application/CreditStudySection';
import CreditPlanSection from '@/components/application/CreditPlanSection';
import InitialPaymentSection from '@/components/application/InitialPaymentSection';
import AuthorizationsSection from '@/components/application/AuthorizationsSection';
import ApplicationConfirmationDialog from '@/components/application/ApplicationConfirmationDialog';
import { createApplication, saveDraft, finalizeDraft, getDraftByCode } from '@/services/applications';
import { notifyDraftSaved, notifyApplicationSubmitted } from '@/services/emailService';
import type { Application, NewApplicationForm, EducationLevel, Occupation, ContractType, CreditPlan } from '@/types/application';

// Schema de validación
const applicationSchema = z.object({
  // Deudor Solidario
  cosignerFullName: z.string().min(1, 'Campo requerido'),
  cosignerDocumentType: z.enum(['CC', 'CE']),
  cosignerDocumentNumber: z.string().min(1, 'Campo requerido'),
  cosignerDocumentExpeditionDate: z.string().min(1, 'Campo requerido'),
  cosignerBirthDate: z.string().min(1, 'Campo requerido'),
  cosignerGender: z.string().min(1, 'Campo requerido'),
  cosignerMaritalStatus: z.string().min(1, 'Campo requerido'),
  cosignerDependents: z.coerce.number().min(0),
  cosignerAddress: z.string().min(1, 'Campo requerido'),
  cosignerNeighborhood: z.string().min(1, 'Campo requerido'),
  cosignerCity: z.string().min(1, 'Campo requerido'),
  cosignerDepartment: z.string().min(1, 'Campo requerido'),
  cosignerEducationLevel: z.string().min(1, 'Campo requerido'),
  cosignerPhone: z.string().min(1, 'Campo requerido'),
  cosignerEmail: z.string().email('Email inválido'),
  cosignerOccupation: z.string().min(1, 'Campo requerido'),
  cosignerSpouseName: z.string().optional(),
  cosignerSpouseCompany: z.string().optional(),
  cosignerSpouseCompanyAddress: z.string().optional(),
  cosignerSpouseCompanyPhone: z.string().optional(),
  cosignerCompany: z.string().optional(),
  cosignerCompanyAddress: z.string().optional(),
  cosignerCompanyCity: z.string().optional(),
  cosignerCompanyPhone: z.string().optional(),
  cosignerPosition: z.string().optional(),
  cosignerCompanyExtension: z.string().optional(),
  cosignerContractType: z.string().optional(),
  cosignerHireDate: z.string().optional(),
  cosignerIncome: z.coerce.number().optional(),
  cosignerMonthlyExpenses: z.coerce.number().optional(),
  cosignerFamilyReferenceName: z.string().min(1, 'Campo requerido'),
  cosignerFamilyReferencePhone: z.string().min(1, 'Campo requerido'),
  cosignerPersonalReferenceName: z.string().min(1, 'Campo requerido'),
  cosignerPersonalReferencePhone: z.string().min(1, 'Campo requerido'),
  cosignerCommercialReferenceName: z.string().optional(),
  cosignerCommercialReferencePhone: z.string().optional(),
  cosignerMainSupplierName: z.string().optional(),
  cosignerMainSupplierPhone: z.string().optional(),
  cosignerMainClientName: z.string().optional(),
  cosignerMainClientPhone: z.string().optional(),
  
  // Estudiante
  studentFullName: z.string().min(1, 'Campo requerido'),
  studentDocumentType: z.enum(['CC', 'TI']),
  studentDocumentNumber: z.string().min(1, 'Campo requerido'),
  studentDocumentExpeditionDate: z.string().min(1, 'Campo requerido'),
  studentBirthDate: z.string().min(1, 'Campo requerido'),
  studentPhone: z.string().min(1, 'Campo requerido'),
  studentEmail: z.string().email('Email inválido'),
  studentAddress: z.string().min(1, 'Campo requerido'),
  studentNeighborhood: z.string().min(1, 'Campo requerido'),
  studentCity: z.string().min(1, 'Campo requerido'),
  studentDepartment: z.string().min(1, 'Campo requerido'),
  studentProgram: z.string().min(1, 'Campo requerido'),
  studentSemester: z.string().min(1, 'Campo requerido'),
  studentShift: z.enum(['Diurna', 'Nocturna', 'Sabatina']),
  studentWorks: z.boolean(),
  studentCompanyName: z.string().optional(),
  studentSalary: z.coerce.number().optional(),
  studentCompanyAddress: z.string().optional(),
  studentCompanyPhone: z.string().optional(),
  studentRelationshipToCosigner: z.string().min(1, 'Campo requerido'),
  
  // Pago estudio de crédito
  creditStudyReceiptNumber: z.string().min(1, 'Campo requerido'),
  creditStudyPaymentDate: z.string().min(1, 'Campo requerido'),
  creditStudyAmount: z.coerce.number().min(0, 'Monto inválido'),
  
  // Plan de crédito
  creditPlan: z.enum(['50/50', '20/80']),
  semesterValue: z.coerce.number().min(0, 'Valor inválido'),
  initialPayment: z.coerce.number().min(0, 'Valor inválido'),
  numberOfInstallments: z.coerce.number().min(1).max(3, 'Máximo 3 cuotas'),
  paymentDayOfMonth: z.union([z.literal(1), z.literal(15)]),
  
  // Pago cuota inicial
  initialPaymentReceiptNumber: z.string().min(1, 'Campo requerido'),
  initialPaymentDate: z.string().min(1, 'Campo requerido'),
  initialPaymentAmount: z.coerce.number().min(0, 'Valor inválido'),
  
  // Autorizaciones
  studentAuthorizationAccepted: z.boolean().refine(val => val === true, 'Debe aceptar las autorizaciones'),
  cosignerAuthorizationAccepted: z.boolean().refine(val => val === true, 'Debe aceptar las autorizaciones'),
}).superRefine((data, ctx) => {
  // Validar que la cuota inicial sea >= sugerida (siempre entero)
  const suggested = Math.trunc(data.creditPlan === '50/50' ? data.semesterValue * 0.5 : data.semesterValue * 0.2);
  if (data.initialPayment < suggested) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['initialPayment'],
      message: `La cuota inicial debe ser igual o superior al valor sugerido (${suggested.toLocaleString('es-CO')})`,
    });
  }
  
  // Validar que el monto pagado sea >= cuota inicial
  if (data.initialPaymentAmount < data.initialPayment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['initialPaymentAmount'],
      message: `El valor pagado debe ser igual o superior a la cuota inicial (${data.initialPayment.toLocaleString('es-CO')})`,
    });
  }
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [applicationCode, setApplicationCode] = useState('');
  const [draftCode, setDraftCode] = useState('');
  
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      cosignerDependents: 0,
      cosignerCity: 'Cartago',
      cosignerDepartment: 'Valle del Cauca',
      studentWorks: false,
      studentCity: 'Cartago',
      studentDepartment: 'Valle del Cauca',
      creditPlan: '50/50',
      numberOfInstallments: 2,
      paymentDayOfMonth: 1,
      studentAuthorizationAccepted: false,
      cosignerAuthorizationAccepted: false,
    },
  });

  const totalSteps = 6; // Actualizado: 6 secciones
  const sectionNames = [
    'Información del Estudiante',
    'Información del Deudor Solidario',
    'Pago Estudio de Crédito Educativo',
    'Selección Plan Crédito Educativo',
    'Pago Cuota Inicial',
    'Autorizaciones y Declaraciones'
  ];

  // Cargar borrador si existe en sessionStorage
  // Cargar borrador desde sessionStorage o auto-recuperar
  useEffect(() => {
    const draftData = sessionStorage.getItem('draftData');
    const savedDraftCode = sessionStorage.getItem('draftCode');
    const savedStep = sessionStorage.getItem('draftCurrentStep');
    
    // Caso 1: Recuperación completa desde RecoverDraftPage
    if (draftData && savedDraftCode) {
      try {
        const parsedData = JSON.parse(draftData);
        
        // Guardar el draft_code para futuras actualizaciones
        setDraftCode(savedDraftCode);
        
        // Mapear los datos del borrador (formato snake_case de DB) al formato del formulario (camelCase)
        form.reset({
          // Deudor Solidario
          cosignerFullName: parsedData.cosigner_full_name || '',
          cosignerDocumentType: parsedData.cosigner_document_type || 'CC',
          cosignerDocumentNumber: parsedData.cosigner_document_number || '',
          cosignerDocumentExpeditionDate: parsedData.cosigner_document_expedition_date || '',
          cosignerBirthDate: parsedData.cosigner_birth_date || '',
          cosignerGender: parsedData.cosigner_gender || '',
          cosignerMaritalStatus: parsedData.cosigner_marital_status || '',
          cosignerDependents: parsedData.cosigner_dependents || 0,
          cosignerAddress: parsedData.cosigner_address || '',
          cosignerNeighborhood: parsedData.cosigner_neighborhood || '',
          cosignerCity: parsedData.cosigner_city || '',
          cosignerDepartment: parsedData.cosigner_department || '',
          cosignerEducationLevel: parsedData.cosigner_education_level as EducationLevel || 'Secundaria',
          cosignerPhone: parsedData.cosigner_phone || '',
          cosignerEmail: parsedData.cosigner_email || '',
          cosignerOccupation: parsedData.cosigner_occupation as Occupation || 'Empleado',
          cosignerSpouseName: parsedData.cosigner_spouse_name || '',
          cosignerSpouseCompany: parsedData.cosigner_spouse_company || '',
          cosignerSpouseCompanyAddress: parsedData.cosigner_spouse_company_address || '',
          cosignerSpouseCompanyPhone: parsedData.cosigner_spouse_company_phone || '',
          cosignerCompany: parsedData.cosigner_company || '',
          cosignerCompanyAddress: parsedData.cosigner_company_address || '',
          cosignerCompanyCity: parsedData.cosigner_company_city || '',
          cosignerCompanyPhone: parsedData.cosigner_company_phone || '',
          cosignerPosition: parsedData.cosigner_position || '',
          cosignerCompanyExtension: parsedData.cosigner_company_extension || '',
          cosignerContractType: (parsedData.cosigner_contract_type as ContractType) || undefined,
          cosignerHireDate: parsedData.cosigner_hire_date || '',
          cosignerIncome: parsedData.cosigner_income || 0,
          cosignerMonthlyExpenses: parsedData.cosigner_monthly_expenses || 0,
          cosignerFamilyReferenceName: parsedData.cosigner_family_reference_name || '',
          cosignerFamilyReferencePhone: parsedData.cosigner_family_reference_phone || '',
          cosignerPersonalReferenceName: parsedData.cosigner_personal_reference_name || '',
          cosignerPersonalReferencePhone: parsedData.cosigner_personal_reference_phone || '',
          cosignerCommercialReferenceName: parsedData.cosigner_commercial_reference_name || '',
          cosignerCommercialReferencePhone: parsedData.cosigner_commercial_reference_phone || '',
          cosignerMainSupplierName: parsedData.cosigner_main_supplier_name || '',
          cosignerMainSupplierPhone: parsedData.cosigner_main_supplier_phone || '',
          cosignerMainClientName: parsedData.cosigner_main_client_name || '',
          cosignerMainClientPhone: parsedData.cosigner_main_client_phone || '',
          
          // Estudiante
          studentFullName: parsedData.student_full_name || '',
          studentDocumentType: parsedData.student_document_type || 'CC',
          studentDocumentNumber: parsedData.student_document_number || '',
          studentDocumentExpeditionDate: parsedData.student_document_expedition_date || '',
          studentBirthDate: parsedData.student_birth_date || '',
          studentPhone: parsedData.student_phone || '',
          studentEmail: parsedData.student_email || '',
          studentAddress: parsedData.student_address || '',
          studentNeighborhood: parsedData.student_neighborhood || '',
          studentCity: parsedData.student_city || 'Cartago',
          studentDepartment: parsedData.student_department || 'Valle del Cauca',
          studentProgram: parsedData.student_program || '',
          studentSemester: parsedData.student_semester || '',
          studentShift: parsedData.student_shift || 'Diurna',
          studentWorks: parsedData.student_works || false,
          studentCompanyName: parsedData.student_company_name || '',
          studentSalary: parsedData.student_salary || 0,
          studentCompanyAddress: parsedData.student_company_address || '',
          studentCompanyPhone: parsedData.student_company_phone || '',
          studentRelationshipToCosigner: parsedData.student_relationship_to_cosigner || '',
          
          // Pago estudio de crédito
          creditStudyReceiptNumber: parsedData.credit_study_receipt_number || '',
          creditStudyPaymentDate: parsedData.credit_study_payment_date || '',
          creditStudyAmount: parsedData.credit_study_amount || 0,
          
          // Plan de crédito
          semesterValue: parsedData.semester_value || 0,
          creditPlan: parsedData.credit_plan || '50/50',
          initialPayment: parsedData.initial_payment || undefined,
          numberOfInstallments: parsedData.number_of_installments || undefined,
          paymentDayOfMonth: parsedData.payment_day_of_month || 1,
          
          // Pago cuota inicial
          initialPaymentReceiptNumber: parsedData.initial_payment_receipt_number || '',
          initialPaymentDate: parsedData.initial_payment_date || '',
          initialPaymentAmount: parsedData.initial_payment_amount || 0,
          
          // Autorizaciones
          studentAuthorizationAccepted: false,
          cosignerAuthorizationAccepted: false,
        });
        
        // Restaurar paso
        const draftStep = parsedData.draft_current_step;
        if (typeof draftStep === 'number' && draftStep >= 1 && draftStep <= totalSteps) {
          setCurrentStep(draftStep);
        }
        
        const stepText = draftStep ? ` Continuando en el paso ${draftStep} de ${totalSteps}.` : '';
        toast.success(`Borrador ${savedDraftCode} cargado.${stepText}`);
        
        // Limpiar sessionStorage después de cargar
        sessionStorage.removeItem('draftData');
      } catch (error) {
        console.error('Error al cargar borrador:', error);
        toast.error('Error al cargar el borrador');
        sessionStorage.removeItem('draftData');
        sessionStorage.removeItem('draftCode');
        sessionStorage.removeItem('draftCurrentStep');
      }
    }
    // Caso 2: Auto-recuperación después de recarga (solo draftCode sin draftData)
    else if (savedDraftCode && !draftData) {
      const autoRecover = async () => {
        try {
          const result = await getDraftByCode(savedDraftCode);
          
          if (result.success && result.draft) {
            // Guardar en sessionStorage y recargar
            sessionStorage.setItem('draftData', JSON.stringify(result.draft));
            window.location.reload();
          } else {
            // Código inválido, limpiar
            sessionStorage.removeItem('draftCode');
            sessionStorage.removeItem('draftCurrentStep');
          }
        } catch (error) {
          console.error('Error en auto-recuperación:', error);
          sessionStorage.removeItem('draftCode');
          sessionStorage.removeItem('draftCurrentStep');
        }
      };
      
      autoRecover();
    }
  }, [form]);

  // Re-validar initialPayment cuando cambie creditPlan o semesterValue
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'creditPlan' || name === 'semesterValue') {
        form.trigger('initialPayment');
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof ApplicationFormData)[] = [];
    
    // Definir campos a validar según el paso actual (orden A-B-C-D-E-F)
    if (currentStep === 1) {
      // Paso 1: Información del Estudiante
      fieldsToValidate = [
        'studentFullName', 'studentDocumentType', 'studentDocumentNumber',
        'studentDocumentExpeditionDate', 'studentBirthDate',
        'studentPhone', 'studentEmail', 'studentAddress', 'studentNeighborhood',
        'studentCity', 'studentDepartment',
        'studentProgram', 'studentSemester', 'studentShift',
        'studentRelationshipToCosigner',
      ];
    } else if (currentStep === 2) {
      // Paso 2: Información del Deudor Solidario
      fieldsToValidate = [
        'cosignerFullName', 'cosignerDocumentType', 'cosignerDocumentNumber',
        'cosignerDocumentExpeditionDate', 'cosignerBirthDate', 'cosignerGender',
        'cosignerMaritalStatus', 'cosignerAddress', 'cosignerNeighborhood',
        'cosignerCity', 'cosignerDepartment', 'cosignerEducationLevel',
        'cosignerPhone', 'cosignerEmail', 'cosignerOccupation',
        'cosignerFamilyReferenceName', 'cosignerFamilyReferencePhone',
        'cosignerPersonalReferenceName', 'cosignerPersonalReferencePhone',
      ];
      
      // Validación adicional para Independiente
      const cosignerOccupation = form.getValues('cosignerOccupation');
      if (cosignerOccupation === 'Independiente') {
        const commercialName = form.getValues('cosignerCommercialReferenceName');
        const commercialPhone = form.getValues('cosignerCommercialReferencePhone');
        
        if (!commercialName || !commercialPhone) {
          toast.error('Complete la referencia comercial');
          return;
        }
      }
    } else if (currentStep === 3) {
      // Paso 3: Pago Estudio de Crédito Educativo
      fieldsToValidate = [
        'creditStudyReceiptNumber', 'creditStudyPaymentDate', 'creditStudyAmount',
      ];
    } else if (currentStep === 4) {
      // Paso 4: Selección Plan Crédito Educativo
      fieldsToValidate = [
        'creditPlan', 'semesterValue', 'initialPayment', 'numberOfInstallments',
        'paymentDayOfMonth'
      ];
    } else if (currentStep === 5) {
      // Paso 5: Pago Cuota Inicial
      fieldsToValidate = [
        'initialPaymentReceiptNumber', 'initialPaymentDate', 'initialPaymentAmount'
      ];
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Por favor complete todos los campos requeridos');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = async () => {
    const formData = form.getValues();
    
    // Validar campos mínimos requeridos
    const missingFields: string[] = [];
    
    if (!formData.studentDocumentNumber) missingFields.push('Cédula del estudiante');
    if (!formData.studentFullName) missingFields.push('Nombre del estudiante');
    if (!formData.studentEmail) missingFields.push('Email del estudiante');
    if (!formData.studentPhone) missingFields.push('Teléfono del estudiante');
    
    if (missingFields.length > 0) {
      toast.error(`Complete los siguientes campos para guardar el borrador: ${missingFields.join(', ')}`);
      return;
    }

    try {
      // Pasar los datos del formulario, el draft_code existente si hay, y el paso actual
      const result = await saveDraft(formData as Partial<Application>, draftCode || undefined, currentStep);
      
      if (result.success && result.draftCode) {
        // Guardar el draft_code para futuras actualizaciones
        setDraftCode(result.draftCode);
        
        // Persistir en sessionStorage para auto-recuperación
        sessionStorage.setItem('draftCode', result.draftCode);
        sessionStorage.setItem('draftCurrentStep', String(currentStep));
        
        // Mostrar toast con el código
        if (draftCode) {
          // Guardado posterior
          toast.success(`Borrador actualizado · Código: ${result.draftCode}`, {
            duration: 4000,
          });
        } else {
          // Primera vez - toast con botón copiar + correo de notificación
          toast.success(
            `Borrador guardado. Su código de recuperación es: ${result.draftCode} (cópielo y guárdelo). Puede continuar llenando el formulario.`,
            {
              duration: 8000,
              action: {
                label: 'Copiar',
                onClick: () => {
                  navigator.clipboard.writeText(result.draftCode!);
                  toast.success('Código copiado al portapapeles');
                },
              },
            }
          );
          // Enviar correo al estudiante con el código de borrador
          const emailSent = formData.studentEmail && formData.studentFullName;
          if (emailSent) {
            notifyDraftSaved({
              studentName: formData.studentFullName as string,
              studentEmail: formData.studentEmail as string,
              draftCode: result.draftCode,
            });
          }
        }
      } else {
        toast.error(result.error || 'Error al guardar el borrador');
      }
    } catch (error) {
      console.error('[handleSaveDraft] Error:', error);
      toast.error('Error al guardar el borrador');
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    
    try {
      // Preparar datos del formulario
      const formData: NewApplicationForm = {
        cosigner: {
          fullName: data.cosignerFullName,
          documentType: data.cosignerDocumentType,
          documentNumber: data.cosignerDocumentNumber,
          documentExpeditionDate: data.cosignerDocumentExpeditionDate,
          birthDate: data.cosignerBirthDate,
          gender: data.cosignerGender,
          maritalStatus: data.cosignerMaritalStatus,
          dependents: data.cosignerDependents,
          address: data.cosignerAddress,
          neighborhood: data.cosignerNeighborhood,
          city: data.cosignerCity,
          department: data.cosignerDepartment,
          educationLevel: data.cosignerEducationLevel as never,
          phone: data.cosignerPhone,
          email: data.cosignerEmail,
          occupation: data.cosignerOccupation as never,
          spouseName: data.cosignerSpouseName,
          spouseCompany: data.cosignerSpouseCompany,
          spouseCompanyAddress: data.cosignerSpouseCompanyAddress,
          spouseCompanyPhone: data.cosignerSpouseCompanyPhone,
          company: data.cosignerCompany,
          companyAddress: data.cosignerCompanyAddress,
          companyCity: data.cosignerCompanyCity,
          companyPhone: data.cosignerCompanyPhone,
          position: data.cosignerPosition,
          companyExtension: data.cosignerCompanyExtension,
          contractType: data.cosignerContractType as never,
          hireDate: data.cosignerHireDate,
          income: data.cosignerIncome,
          monthlyExpenses: data.cosignerMonthlyExpenses,
          familyReferenceName: data.cosignerFamilyReferenceName,
          familyReferencePhone: data.cosignerFamilyReferencePhone,
          personalReferenceName: data.cosignerPersonalReferenceName,
          personalReferencePhone: data.cosignerPersonalReferencePhone,
          commercialReferenceName: data.cosignerCommercialReferenceName,
          commercialReferencePhone: data.cosignerCommercialReferencePhone,
          mainSupplierName: data.cosignerMainSupplierName,
          mainSupplierPhone: data.cosignerMainSupplierPhone,
          mainClientName: data.cosignerMainClientName,
          mainClientPhone: data.cosignerMainClientPhone,
        },
        student: {
          fullName: data.studentFullName,
          documentType: data.studentDocumentType,
          documentNumber: data.studentDocumentNumber,
          documentExpeditionDate: data.studentDocumentExpeditionDate,
          birthDate: data.studentBirthDate,
          phone: data.studentPhone,
          email: data.studentEmail,
          address: data.studentAddress,
          neighborhood: data.studentNeighborhood,
          city: data.studentCity,
          department: data.studentDepartment,
          program: data.studentProgram,
          semester: data.studentSemester,
          shift: data.studentShift,
          works: data.studentWorks,
          companyName: data.studentCompanyName,
          salary: data.studentSalary,
          companyAddress: data.studentCompanyAddress,
          companyPhone: data.studentCompanyPhone,
          relationshipToCosigner: data.studentRelationshipToCosigner,
        },
        creditStudyPayment: {
          receiptNumber: data.creditStudyReceiptNumber,
          paymentDate: data.creditStudyPaymentDate,
          amount: data.creditStudyAmount,
        },
        creditPlan: data.creditPlan,
        semesterValue: data.semesterValue,
        initialPayment: data.initialPayment,
        numberOfInstallments: data.numberOfInstallments,
        paymentDayOfMonth: data.paymentDayOfMonth,
        initialPaymentReceiptNumber: data.initialPaymentReceiptNumber,
        initialPaymentDate: data.initialPaymentDate,
        initialPaymentAmount: data.initialPaymentAmount,
        studentAuthorizationAccepted: data.studentAuthorizationAccepted,
        cosignerAuthorizationAccepted: data.cosignerAuthorizationAccepted,
      };

      let result;
      
      // Si hay un draftCode, finalizar el borrador; si no, crear nueva solicitud
      if (draftCode) {
        result = await finalizeDraft(draftCode, formData);
      } else {
        result = await createApplication(formData);
      }

      if (result.success && result.applicationCode) {
        // Limpiar sessionStorage
        sessionStorage.removeItem('applicationDraft');
        
        // Enviar correos de notificación al estudiante y deudor solidario (en paralelo)
        const emailResults = await Promise.allSettled([
          notifyApplicationSubmitted({
            studentName: data.studentFullName,
            studentEmail: data.studentEmail,
            cosignerName: data.cosignerFullName,
            cosignerEmail: data.cosignerEmail,
            applicationCode: result.applicationCode,
            program: data.studentProgram,
            creditPlan: data.creditPlan,
            semesterValue: data.semesterValue,
          }),
        ]);
        
        console.log('[onSubmit] Resultado envío correos:', emailResults);

        // Mostrar diálogo de confirmación
        setApplicationCode(result.applicationCode);
        setShowConfirmationDialog(true);
      } else {
        toast.error(result.error || 'Error al crear la solicitud');
      }
    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmationDialog(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-3">
            <img 
              src="/images/brand/credinova-logo.svg" 
              alt="CrediNOVA Logo" 
              className="h-12 md:h-16 w-auto"
            />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-balance">{"Nueva Solicitud de Crédito Educativo"}</h1>
              <span className="text-sm text-muted-foreground">
                Paso {currentStep} de {totalSteps}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-3">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            
            {/* Banner de borrador persistente */}
            {draftCode && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Trabajando sobre un borrador. Código: <span className="font-mono font-semibold">{draftCode}</span>. 
                    Su avance se guarda al pulsar "Guardar Borrador".
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(draftCode);
                    toast.success('Código copiado al portapapeles');
                  }}
                  className="shrink-0 h-8 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar código
                </Button>
              </div>
            )}
            
            {/* Pestañas de navegación por pasos */}
            {(() => {
              // Campos requeridos por paso (para detectar si está incompleto)
              const stepFields: Record<number, (keyof ApplicationFormData)[]> = {
                1: ['studentFullName','studentDocumentNumber','studentDocumentExpeditionDate','studentBirthDate','studentPhone','studentEmail','studentAddress','studentNeighborhood','studentCity','studentDepartment','studentProgram','studentSemester','studentRelationshipToCosigner'],
                2: ['cosignerFullName','cosignerDocumentNumber','cosignerDocumentExpeditionDate','cosignerBirthDate','cosignerPhone','cosignerEmail','cosignerAddress','cosignerCity','cosignerDepartment','cosignerFamilyReferenceName','cosignerFamilyReferencePhone','cosignerPersonalReferenceName','cosignerPersonalReferencePhone'],
                3: ['creditStudyReceiptNumber','creditStudyPaymentDate','creditStudyAmount'],
                4: ['creditPlan','semesterValue','initialPayment','numberOfInstallments','paymentDayOfMonth'],
                5: ['initialPaymentReceiptNumber','initialPaymentDate','initialPaymentAmount'],
                6: ['studentAuthorizationAccepted','cosignerAuthorizationAccepted'],
              };

              const errors = form.formState.errors;
              const values = form.getValues();

              // Un paso está incompleto si alguno de sus campos requeridos tiene error o está vacío/falso
              const isStepIncomplete = (step: number): boolean => {
                const fields = stepFields[step] ?? [];
                return fields.some((field) => {
                  if (errors[field]) return true;
                  const val = values[field];
                  if (val === undefined || val === null || val === '') return true;
                  if (typeof val === 'boolean') return val === false;
                  if (typeof val === 'number') return isNaN(val);
                  return false;
                });
              };

              return (
                <div className="flex flex-wrap gap-2 justify-center">
                  {sectionNames.map((name, index) => {
                    const stepNumber = index + 1;
                    const isCurrentStep = stepNumber === currentStep;
                    const incomplete = isStepIncomplete(stepNumber);

                    return (
                      <button
                        key={index}
                        type="button"
                        title="Doble clic para ir a este paso"
                        onDoubleClick={() => {
                          setCurrentStep(stepNumber);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onClick={() => {
                          // Un solo clic solo navega si ya es accesible normalmente
                          if (stepNumber <= currentStep) {
                            setCurrentStep(stepNumber);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-full transition-all select-none ${
                          isCurrentStep
                            ? incomplete
                              ? 'bg-destructive text-white font-medium ring-2 ring-destructive/40'
                              : 'bg-primary text-primary-foreground font-medium'
                            : incomplete
                            ? 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 cursor-pointer'
                            : 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card className="p-6 md:p-8">
                {currentStep === 1 && <StudentSection form={form} />}
                {currentStep === 2 && <CosignerSection form={form} />}
                {currentStep === 3 && <CreditStudySection form={form} onSaveDraft={handleSaveDraft} />}
                {currentStep === 4 && <CreditPlanSection form={form} />}
                {currentStep === 5 && <InitialPaymentSection form={form} />}
                {currentStep === 6 && <AuthorizationsSection form={form} />}
              </Card>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>

                {/* Botón de Guardar Borrador - disponible en todos los pasos */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Borrador
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="w-full sm:w-auto"
                  >
                    Siguiente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
      {/* Application Confirmation Dialog */}
      <ApplicationConfirmationDialog
        open={showConfirmationDialog}
        applicationCode={applicationCode}
        onClose={handleConfirmationClose}
      />
    </div>
  );
}
