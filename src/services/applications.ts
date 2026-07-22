import { supabase } from '@/lib/supabase';
import type { 
  Application, 
  NewApplicationForm, 
  PhoneValidation, 
  PaymentPlan,
  EducationLevel,
  Occupation,
  ContractType,
  ApplicationStatus
} from '@/types/application';

/**
 * Genera un código único de 6 caracteres alfanuméricos
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Genera un código único de 6 caracteres para recuperar borradores
 */
function generateDraftCode(): string {
  return generateCode();
}

/**
 * Convierte los datos del formulario al formato de la base de datos
 */
function formToDbFormat(form: NewApplicationForm): Record<string, unknown> {
  return {
    // Deudor Solidario
    cosigner_full_name: form.cosigner.fullName,
    cosigner_document_type: form.cosigner.documentType,
    cosigner_document_number: form.cosigner.documentNumber,
    cosigner_document_expedition_date: form.cosigner.documentExpeditionDate,
    cosigner_birth_date: form.cosigner.birthDate,
    cosigner_gender: form.cosigner.gender,
    cosigner_marital_status: form.cosigner.maritalStatus,
    cosigner_dependents: form.cosigner.dependents,
    cosigner_address: form.cosigner.address,
    cosigner_neighborhood: form.cosigner.neighborhood,
    cosigner_city: form.cosigner.city,
    cosigner_department: form.cosigner.department,
    cosigner_education_level: form.cosigner.educationLevel,
    cosigner_phone: form.cosigner.phone,
    cosigner_email: form.cosigner.email,
    cosigner_occupation: form.cosigner.occupation,
    cosigner_spouse_name: form.cosigner.spouseName || null,
    cosigner_spouse_company: form.cosigner.spouseCompany || null,
    cosigner_spouse_company_address: form.cosigner.spouseCompanyAddress || null,
    cosigner_spouse_company_phone: form.cosigner.spouseCompanyPhone || null,
    cosigner_company: form.cosigner.company || null,
    cosigner_company_address: form.cosigner.companyAddress || null,
    cosigner_company_city: form.cosigner.companyCity || null,
    cosigner_company_phone: form.cosigner.companyPhone || null,
    cosigner_position: form.cosigner.position || null,
    cosigner_company_extension: form.cosigner.companyExtension || null,
    cosigner_contract_type: form.cosigner.contractType || null,
    cosigner_hire_date: form.cosigner.hireDate || null,
    cosigner_income: form.cosigner.income || null,
    cosigner_monthly_expenses: form.cosigner.monthlyExpenses || null,
    cosigner_family_reference_name: form.cosigner.familyReferenceName,
    cosigner_family_reference_phone: form.cosigner.familyReferencePhone,
    cosigner_personal_reference_name: form.cosigner.personalReferenceName,
    cosigner_personal_reference_phone: form.cosigner.personalReferencePhone,
    cosigner_commercial_reference_name: form.cosigner.commercialReferenceName || null,
    cosigner_commercial_reference_phone: form.cosigner.commercialReferencePhone || null,
    cosigner_main_supplier_name: form.cosigner.mainSupplierName || null,
    cosigner_main_supplier_phone: form.cosigner.mainSupplierPhone || null,
    cosigner_main_client_name: form.cosigner.mainClientName || null,
    cosigner_main_client_phone: form.cosigner.mainClientPhone || null,
    
    // Estudiante
    student_full_name: form.student.fullName,
    student_document_type: form.student.documentType,
    student_document_number: form.student.documentNumber,
    student_document_expedition_date: form.student.documentExpeditionDate,
    student_birth_date: form.student.birthDate,
    student_phone: form.student.phone,
    student_email: form.student.email,
    student_address: form.student.address,
    student_neighborhood: form.student.neighborhood,
    student_city: form.student.city,
    student_department: form.student.department,
    student_program: form.student.program,
    student_semester: form.student.semester,
    student_shift: form.student.shift,
    student_works: form.student.works,
    student_company_name: form.student.companyName || null,
    student_salary: form.student.salary || null,
    student_company_address: form.student.companyAddress || null,
    student_company_phone: form.student.companyPhone || null,
    student_relationship_to_cosigner: form.student.relationshipToCosigner,
    
    // Pago estudio de crédito
    credit_study_receipt_number: form.creditStudyPayment.receiptNumber,
    credit_study_payment_date: form.creditStudyPayment.paymentDate,
    credit_study_amount: form.creditStudyPayment.amount,
    
    // Plan de crédito
    credit_plan: form.creditPlan,
    semester_value: form.semesterValue,
    initial_payment: form.initialPayment || null,
    number_of_installments: form.numberOfInstallments || null,
    payment_day_of_month: form.paymentDayOfMonth || null,
    
    // Pago cuota inicial
    initial_payment_receipt_number: form.initialPaymentReceiptNumber || null,
    initial_payment_date: form.initialPaymentDate || null,
    initial_payment_amount: form.initialPaymentAmount || null,
    
    // Autorizaciones
    student_authorization_accepted: form.studentAuthorizationAccepted,
    cosigner_authorization_accepted: form.cosignerAuthorizationAccepted,
    
    // Estado inicial
    status: 'en_revision',
  };
}

/**
 * Convierte los datos parciales del formulario al formato de la base de datos
 * Usado para guardar borradores con campos incompletos
 */
function formToDbFormatPartial(form: Partial<Application>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // Helper para asignar valor o null
  const setValue = (key: string, value: any) => {
    if (value === undefined || value === '') {
      result[key] = null;
    } else {
      result[key] = value;
    }
  };
  
  // Deudor Solidario
  setValue('cosigner_full_name', form.cosignerFullName);
  setValue('cosigner_document_type', form.cosignerDocumentType);
  setValue('cosigner_document_number', form.cosignerDocumentNumber);
  setValue('cosigner_document_expedition_date', form.cosignerDocumentExpeditionDate);
  setValue('cosigner_birth_date', form.cosignerBirthDate);
  setValue('cosigner_gender', form.cosignerGender);
  setValue('cosigner_marital_status', form.cosignerMaritalStatus);
  setValue('cosigner_dependents', form.cosignerDependents);
  setValue('cosigner_address', form.cosignerAddress);
  setValue('cosigner_neighborhood', form.cosignerNeighborhood);
  setValue('cosigner_city', form.cosignerCity);
  setValue('cosigner_department', form.cosignerDepartment);
  setValue('cosigner_education_level', form.cosignerEducationLevel);
  setValue('cosigner_phone', form.cosignerPhone);
  setValue('cosigner_email', form.cosignerEmail);
  setValue('cosigner_occupation', form.cosignerOccupation);
  setValue('cosigner_spouse_name', form.cosignerSpouseName);
  setValue('cosigner_spouse_company', form.cosignerSpouseCompany);
  setValue('cosigner_spouse_company_address', form.cosignerSpouseCompanyAddress);
  setValue('cosigner_spouse_company_phone', form.cosignerSpouseCompanyPhone);
  setValue('cosigner_company', form.cosignerCompany);
  setValue('cosigner_company_address', form.cosignerCompanyAddress);
  setValue('cosigner_company_city', form.cosignerCompanyCity);
  setValue('cosigner_company_phone', form.cosignerCompanyPhone);
  setValue('cosigner_position', form.cosignerPosition);
  setValue('cosigner_company_extension', form.cosignerCompanyExtension);
  setValue('cosigner_contract_type', form.cosignerContractType);
  setValue('cosigner_hire_date', form.cosignerHireDate);
  setValue('cosigner_income', form.cosignerIncome);
  setValue('cosigner_monthly_expenses', form.cosignerMonthlyExpenses);
  setValue('cosigner_family_reference_name', form.cosignerFamilyReferenceName);
  setValue('cosigner_family_reference_phone', form.cosignerFamilyReferencePhone);
  setValue('cosigner_personal_reference_name', form.cosignerPersonalReferenceName);
  setValue('cosigner_personal_reference_phone', form.cosignerPersonalReferencePhone);
  setValue('cosigner_commercial_reference_name', form.cosignerCommercialReferenceName);
  setValue('cosigner_commercial_reference_phone', form.cosignerCommercialReferencePhone);
  setValue('cosigner_main_supplier_name', form.cosignerMainSupplierName);
  setValue('cosigner_main_supplier_phone', form.cosignerMainSupplierPhone);
  setValue('cosigner_main_client_name', form.cosignerMainClientName);
  setValue('cosigner_main_client_phone', form.cosignerMainClientPhone);
  
  // Estudiante
  setValue('student_full_name', form.studentFullName);
  setValue('student_document_type', form.studentDocumentType);
  setValue('student_document_number', form.studentDocumentNumber);
  setValue('student_document_expedition_date', form.studentDocumentExpeditionDate);
  setValue('student_birth_date', form.studentBirthDate);
  setValue('student_phone', form.studentPhone);
  setValue('student_email', form.studentEmail);
  setValue('student_address', form.studentAddress);
  setValue('student_neighborhood', form.studentNeighborhood);
  setValue('student_city', form.studentCity);
  setValue('student_department', form.studentDepartment);
  setValue('student_program', form.studentProgram);
  setValue('student_semester', form.studentSemester);
  setValue('student_shift', form.studentShift);
  setValue('student_works', form.studentWorks);
  setValue('student_company_name', form.studentCompanyName);
  setValue('student_salary', form.studentSalary);
  setValue('student_company_address', form.studentCompanyAddress);
  setValue('student_company_phone', form.studentCompanyPhone);
  setValue('student_relationship_to_cosigner', form.studentRelationshipToCosigner);
  
  // Pago estudio de crédito
  setValue('credit_study_receipt_number', form.creditStudyReceiptNumber);
  setValue('credit_study_payment_date', form.creditStudyPaymentDate);
  setValue('credit_study_amount', form.creditStudyAmount);
  
  // Plan de crédito
  setValue('credit_plan', form.creditPlan);
  setValue('semester_value', form.semesterValue);
  setValue('initial_payment', form.initialPayment);
  setValue('number_of_installments', form.numberOfInstallments);
  setValue('payment_day_of_month', form.paymentDayOfMonth);
  
  // Pago cuota inicial
  setValue('initial_payment_receipt_number', form.initialPaymentReceiptNumber);
  setValue('initial_payment_date', form.initialPaymentDate);
  setValue('initial_payment_amount', form.initialPaymentAmount);
  
  // Autorizaciones
  setValue('student_authorization_accepted', form.studentAuthorizationAccepted);
  setValue('cosigner_authorization_accepted', form.cosignerAuthorizationAccepted);
  
  return result;
}


/**
 * Genera un código de solicitud único (formato: CN-YYYYMM-XXXX)
 */
async function generateApplicationCode(): Promise<string> {
  // Generar código alfanumérico de 6 caracteres
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  // Verificar que el código no exista en application_code NI en draft_code
  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .or(`application_code.eq.${code},draft_code.eq.${code}`)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error('Error al generar código de solicitud');
    }
    
    // Si no existe, usar este código
    if (!data) {
      return code;
    }
    
    // Si existe, generar uno nuevo
    code = generateCode();
    attempts++;
  }
  
  throw new Error('No se pudo generar un código único');
}

/**
 * Crea una nueva solicitud de crédito
 */
export async function createApplication(form: NewApplicationForm): Promise<{ success: boolean; applicationCode?: string; application?: Application; error?: string }> {
  try {
    const applicationCode = await generateApplicationCode();
    const dbData = {
      ...formToDbFormat(form),
      application_code: applicationCode,
      is_draft: false,
    };
    
    const { data, error } = await supabase
      .from('applications')
      .insert(dbData)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error al crear solicitud:', JSON.stringify(error));
      return { success: false, error: `Error al crear la solicitud: ${error.message}` };
    }

    if (!data) {
      return { success: false, error: 'Error al crear la solicitud: no se obtuvo respuesta' };
    }
    
    return { 
      success: true, 
      applicationCode,
      application: dbToApplication(data)
    };
  } catch (err) {
    console.error('Error al crear solicitud:', err);
    return { success: false, error: 'Error al crear la solicitud' };
  }
}

/**
 * Obtiene una solicitud por código (sin validación de documento)
 */
export async function getApplicationByCode(
  applicationCode: string
): Promise<{ success: boolean; application?: Application; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('application_code', applicationCode)
      .maybeSingle();
    
    if (error) {
      console.error('Error al obtener solicitud:', error);
      return { success: false, error: 'Error al obtener la solicitud' };
    }
    
    if (!data) {
      return { success: false, error: 'Solicitud no encontrada' };
    }
    
    return { success: true, application: dbToApplication(data) };
  } catch (err) {
    console.error('Error al obtener solicitud:', err);
    return { success: false, error: 'Error al obtener la solicitud' };
  }
}

/**
 * Obtiene una solicitud por código y cédula del estudiante
 */
export async function getApplicationByCodeAndDocument(
  applicationCode: string,
  studentDocument: string
): Promise<{ success: boolean; application?: Application; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('application_code', applicationCode)
      .eq('student_document_number', studentDocument)
      .maybeSingle();
    
    if (error) {
      console.error('Error al obtener solicitud:', error);
      return { success: false, error: 'Error al obtener la solicitud' };
    }
    
    if (!data) {
      return { success: false, error: 'Solicitud no encontrada o datos incorrectos' };
    }
    
    return { success: true, application: dbToApplication(data) };
  } catch (err) {
    console.error('Error al obtener solicitud:', err);
    return { success: false, error: 'Error al obtener la solicitud' };
  }
}

/**
 * Obtiene una solicitud por ID (para usuarios internos)
 */
export async function getApplicationById(id: string): Promise<{ success: boolean; application?: Application; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Error al obtener solicitud:', error);
      return { success: false, error: 'Error al obtener la solicitud' };
    }
    
    if (!data) {
      return { success: false, error: 'Solicitud no encontrada' };
    }
    
    return { success: true, application: dbToApplication(data) };
  } catch (err) {
    console.error('Error al obtener solicitud:', err);
    return { success: false, error: 'Error al obtener la solicitud' };
  }
}

/**
 * Obtiene las validaciones telefónicas de una solicitud
 */
export async function getPhoneValidations(applicationId: string): Promise<PhoneValidation[]> {
  const { data, error } = await supabase
    .from('phone_validations')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error al obtener validaciones:', error);
    return [];
  }
  
  return Array.isArray(data) ? data.map(dbToPhoneValidation) : [];
}

/**
 * Obtiene el plan de pagos de una solicitud
 */
export async function getPaymentPlan(applicationId: string): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('application_id', applicationId)
    .order('installment_number', { ascending: true });
  
  if (error) {
    console.error('Error al obtener plan de pagos:', error);
    return [];
  }
  
  return Array.isArray(data) ? data.map(dbToPaymentPlan) : [];
}

/**
 * Actualiza el estado de una solicitud
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  additionalData?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = {
      status,
      ...additionalData,
    };
    
    const { error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', applicationId);
    
    if (error) {
      console.error('Error al actualizar estado:', error);
      return { success: false, error: 'Error al actualizar el estado' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    return { success: false, error: 'Error al actualizar el estado' };
  }
}

// Funciones de conversión de base de datos a tipos TypeScript
function dbToApplication(data: Record<string, unknown>): Application {
  return {
    id: data.id as string,
    applicationCode: data.application_code as string,
    cosignerFullName: data.cosigner_full_name as string,
    cosignerDocumentType: data.cosigner_document_type as 'CC' | 'CE',
    cosignerDocumentNumber: data.cosigner_document_number as string,
    cosignerDocumentExpeditionDate: data.cosigner_document_expedition_date as string,
    cosignerBirthDate: data.cosigner_birth_date as string,
    cosignerGender: data.cosigner_gender as string,
    cosignerMaritalStatus: data.cosigner_marital_status as string,
    cosignerDependents: data.cosigner_dependents as number,
    cosignerAddress: data.cosigner_address as string,
    cosignerNeighborhood: data.cosigner_neighborhood as string,
    cosignerCity: data.cosigner_city as string,
    cosignerDepartment: data.cosigner_department as string,
    cosignerEducationLevel: data.cosigner_education_level as EducationLevel,
    cosignerPhone: data.cosigner_phone as string,
    cosignerEmail: data.cosigner_email as string,
    cosignerOccupation: data.cosigner_occupation as Occupation,
    cosignerSpouseName: data.cosigner_spouse_name as string | undefined,
    cosignerSpouseCompany: data.cosigner_spouse_company as string | undefined,
    cosignerSpouseCompanyAddress: data.cosigner_spouse_company_address as string | undefined,
    cosignerSpouseCompanyPhone: data.cosigner_spouse_company_phone as string | undefined,
    cosignerCompany: data.cosigner_company as string | undefined,
    cosignerCompanyAddress: data.cosigner_company_address as string | undefined,
    cosignerCompanyCity: data.cosigner_company_city as string | undefined,
    cosignerCompanyPhone: data.cosigner_company_phone as string | undefined,
    cosignerPosition: data.cosigner_position as string | undefined,
    cosignerCompanyExtension: data.cosigner_company_extension as string | undefined,
    cosignerContractType: data.cosigner_contract_type as ContractType | undefined,
    cosignerHireDate: data.cosigner_hire_date as string | undefined,
    cosignerIncome: data.cosigner_income as number | undefined,
    cosignerMonthlyExpenses: data.cosigner_monthly_expenses as number | undefined,
    cosignerFamilyReferenceName: data.cosigner_family_reference_name as string,
    cosignerFamilyReferencePhone: data.cosigner_family_reference_phone as string,
    cosignerPersonalReferenceName: data.cosigner_personal_reference_name as string,
    cosignerPersonalReferencePhone: data.cosigner_personal_reference_phone as string,
    cosignerCommercialReferenceName: data.cosigner_commercial_reference_name as string | undefined,
    cosignerCommercialReferencePhone: data.cosigner_commercial_reference_phone as string | undefined,
    cosignerMainSupplierName: data.cosigner_main_supplier_name as string | undefined,
    cosignerMainSupplierPhone: data.cosigner_main_supplier_phone as string | undefined,
    cosignerMainClientName: data.cosigner_main_client_name as string | undefined,
    cosignerMainClientPhone: data.cosigner_main_client_phone as string | undefined,
    studentFullName: data.student_full_name as string,
    studentDocumentType: data.student_document_type as 'CC' | 'TI',
    studentDocumentNumber: data.student_document_number as string,
    studentDocumentExpeditionDate: data.student_document_expedition_date as string,
    studentBirthDate: data.student_birth_date as string,
    studentPhone: data.student_phone as string,
    studentEmail: data.student_email as string,
    studentAddress: data.student_address as string,
    studentNeighborhood: data.student_neighborhood as string,
    studentCity: data.student_city as string,
    studentDepartment: data.student_department as string,
    studentProgram: data.student_program as string,
    studentSemester: data.student_semester as string,
    studentShift: data.student_shift as 'Diurna' | 'Nocturna' | 'Sabatina',
    studentWorks: data.student_works as boolean,
    studentCompanyName: data.student_company_name as string | undefined,
    studentSalary: data.student_salary as number | undefined,
    studentCompanyAddress: data.student_company_address as string | undefined,
    studentCompanyPhone: data.student_company_phone as string | undefined,
    studentRelationshipToCosigner: data.student_relationship_to_cosigner as string,
    creditStudyReceiptNumber: data.credit_study_receipt_number as string,
    creditStudyPaymentDate: data.credit_study_payment_date as string,
    creditStudyAmount: data.credit_study_amount as number,
    creditPlan: data.credit_plan as '50/50' | '20/80',
    semesterValue: data.semester_value as number,
    initialPayment: data.initial_payment as number | undefined,
    numberOfInstallments: data.number_of_installments as number | undefined,
    financedAmount: data.financed_amount as number | undefined,
    paymentDayOfMonth: data.payment_day_of_month as number | undefined,
    studentAuthorizationAccepted: data.student_authorization_accepted as boolean,
    cosignerAuthorizationAccepted: data.cosigner_authorization_accepted as boolean,
    status: data.status as ApplicationStatus,
    rejectionReason: data.rejection_reason as string | undefined,
    assignedTo: data.assigned_to as string | undefined,
    isDraft: data.is_draft as boolean,
    draftCode: data.draft_code as string | undefined,
    initialPaymentReceiptNumber: data.initial_payment_receipt_number as string | undefined,
    initialPaymentDate: data.initial_payment_date as string | undefined,
    initialPaymentAmount: data.initial_payment_amount as number | undefined,
    paymentPlanAccepted: data.payment_plan_accepted as boolean,
    guaranteesSigned: data.guarantees_signed as boolean,
    guaranteesSignedDate: data.guarantees_signed_date as string | undefined,
    guaranteesObservations: data.guarantees_observations as string | undefined,
    zapsignSendLink: data.zapsign_send_link as string | undefined,
    zapsignCosignerSendLink: data.zapsign_cosigner_send_link as string | undefined,
    zapsignSignedLink: data.zapsign_signed_link as string | undefined,
    amortizationSchedule: data.amortization_schedule as import('@/types/application').AmortizationRow[] | undefined,
    deletionRequestedAt: data.deletion_requested_at as string | null | undefined,
    deletionRequestedBy: data.deletion_requested_by as string | null | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function dbToPhoneValidation(data: Record<string, unknown>): PhoneValidation {
  return {
    id: data.id as string,
    applicationId: data.application_id as string,
    validationType: data.validation_type as string,
    isVerified: data.is_verified as boolean,
    verificationDate: data.verification_date as string | undefined,
    observations: data.observations as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function dbToPaymentPlan(data: Record<string, unknown>): PaymentPlan {
  return {
    id: data.id as string,
    applicationId: data.application_id as string,
    installmentNumber: data.installment_number as number,
    dueDate: data.due_date as string,
    amount: data.amount as number,
    isPaid: data.is_paid as boolean,
    paidDate: data.paid_date as string | undefined,
    createdAt: data.created_at as string,
  };
}

/**
 * Guarda un borrador de solicitud
 */
/**
 * Valida si una transición de estado es permitida
 */
export function canTransitionStatus(from: ApplicationStatus, to: ApplicationStatus): boolean {
  const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    'borrador': ['en_revision', 'cancelado'],
    'en_revision': ['requiere_ajustes', 'aprobado', 'rechazado', 'cancelado'],
    'requiere_ajustes': ['en_revision', 'cancelado'],
    'aprobado': ['pendiente_firma', 'cancelado'],
    'pendiente_firma': ['matricula_autorizada', 'cancelado'],
    'matricula_autorizada': [], // terminal
    'rechazado': [], // terminal
    'cancelado': [], // terminal
  };

  return transitions[from]?.includes(to) || false;
}

/**
 * Guarda un borrador de solicitud con campos parciales
 * Si ya existe un draft_code, actualiza el borrador existente
 */
export async function saveDraft(
  form: Partial<Application>,
  existingDraftCode?: string,
  currentStep?: number
): Promise<{ success: boolean; draftCode?: string; error?: string }> {
  try {
    let draftCode = existingDraftCode;
    
    // Si no hay código existente, generar uno nuevo con validación de unicidad
    if (!draftCode) {
      let code = generateDraftCode();
      let attempts = 0;
      const maxAttempts = 10;
      
      // Verificar que el código no exista en application_code NI en draft_code
      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('applications')
          .select('id')
          .or(`application_code.eq.${code},draft_code.eq.${code}`)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          return { success: false, error: 'Error al validar código de borrador' };
        }
        
        // Si no existe, usar este código
        if (!data) {
          draftCode = code;
          break;
        }
        
        // Si existe, generar uno nuevo
        code = generateDraftCode();
        attempts++;
      }
      
      if (!draftCode) {
        return { success: false, error: 'No se pudo generar un código único para el borrador' };
      }
    }
    
    const dbData = {
      ...formToDbFormatPartial(form),
      application_code: draftCode,
      is_draft: true,
      draft_code: draftCode,
      status: 'borrador',
      draft_current_step: currentStep || null,
    };

    if (existingDraftCode) {
      // Actualizar borrador existente
      const { error } = await supabase
        .from('applications')
        .update(dbData)
        .eq('draft_code', existingDraftCode)
        .eq('is_draft', true);

      if (error) {
        console.error('[saveDraft] Supabase update error:', error.message, error.details, error.hint);
        return { success: false, error: `Error al actualizar el borrador: ${error.message}` };
      }
    } else {
      // Crear nuevo borrador
      const { error } = await supabase.from('applications').insert(dbData);

      if (error) {
        console.error('[saveDraft] Supabase insert error:', error.message, error.details, error.hint);
        return { success: false, error: `Error al guardar el borrador: ${error.message}` };
      }
    }
    
    return { success: true, draftCode };
  } catch (err) {
    console.error('[saveDraft] Exception:', err);
    return { success: false, error: 'Error al guardar el borrador' };
  }
}

/**
 * Recupera un borrador por código
 */
export async function getDraftByCode(draftCode: string): Promise<{ success: boolean; draft?: Record<string, unknown>; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('draft_code', draftCode)
      .eq('is_draft', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error al recuperar borrador:', error);
      return { success: false, error: 'Error al recuperar el borrador' };
    }
    
    if (!data) {
      return { success: false, error: 'Código de borrador no encontrado' };
    }
    
    return { success: true, draft: data };
  } catch (err) {
    console.error('Error al recuperar borrador:', err);
    return { success: false, error: 'Error al recuperar el borrador' };
  }
}

/**
 * Convierte un borrador en solicitud final
 * Valida que todos los campos requeridos estén completos
 */
export async function finalizeDraft(
  draftCode: string, 
  form: NewApplicationForm
): Promise<{ success: boolean; applicationCode?: string; applicationId?: string; error?: string }> {
  try {
    // Validar campos requeridos
    const missingFields: string[] = [];
    
    // Validar deudor
    if (!form.cosigner.fullName) missingFields.push('Nombre completo del deudor');
    if (!form.cosigner.documentNumber) missingFields.push('Cédula del deudor');
    if (!form.cosigner.phone) missingFields.push('Teléfono del deudor');
    if (!form.cosigner.email) missingFields.push('Email del deudor');
    
    // Validar estudiante
    if (!form.student.fullName) missingFields.push('Nombre completo del estudiante');
    if (!form.student.documentNumber) missingFields.push('Cédula del estudiante');
    if (!form.student.phone) missingFields.push('Teléfono del estudiante');
    if (!form.student.email) missingFields.push('Email del estudiante');
    
    // Validar pago de estudio
    if (!form.creditStudyPayment.receiptNumber) missingFields.push('Número de recibo');
    if (!form.creditStudyPayment.paymentDate) missingFields.push('Fecha de pago');
    
    // Validar plan de crédito
    if (!form.creditPlan) missingFields.push('Plan de crédito');
    if (!form.semesterValue || form.semesterValue <= 0) missingFields.push('Valor del semestre');
    
    // Validar autorizaciones
    if (!form.studentAuthorizationAccepted) missingFields.push('Autorización del estudiante');
    if (!form.cosignerAuthorizationAccepted) missingFields.push('Autorización del deudor');
    
    if (missingFields.length > 0) {
      return { 
        success: false, 
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}` 
      };
    }
    
    // Validar transición de estado
    if (!canTransitionStatus('borrador', 'en_revision')) {
      return { 
        success: false, 
        error: 'No se puede finalizar el borrador: transición de estado no permitida' 
      };
    }
    
    const applicationCode = await generateApplicationCode();
    const dbData = formToDbFormat(form);
    
    const { data, error } = await supabase
      .from('applications')
      .update({
        ...dbData,
        application_code: applicationCode,
        is_draft: false,
        draft_code: null,
        draft_current_step: null,
        status: 'en_revision',
        updated_at: new Date().toISOString(),
      })
      .eq('draft_code', draftCode)
      .eq('is_draft', true)
      .select('id')
      .maybeSingle();
    
    if (error) {
      console.error('[finalizeDraft] Error Supabase:', JSON.stringify(error));
      return { success: false, error: `Error al finalizar el borrador: ${error.message}` };
    }

    if (!data) {
      console.error('[finalizeDraft] No se encontró el borrador con código:', draftCode);
      return { success: false, error: 'No se encontró el borrador o ya fue finalizado anteriormente' };
    }
    
    return { success: true, applicationCode, applicationId: data.id };
  } catch (err) {
    console.error('[finalizeDraft] Excepción no controlada:', err);
    return { success: false, error: 'Error inesperado al finalizar el borrador' };
  }
}

/**
 * Cancela una solicitud o borrador
 * Solo permitido por gestores/administradores
 */
export async function cancelApplication(
  applicationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener el estado actual
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('status')
      .eq('id', applicationId)
      .single();
    
    if (fetchError || !app) {
      console.error('[cancelApplication] Error al obtener solicitud:', fetchError);
      return { success: false, error: 'Solicitud no encontrada' };
    }
    
    // Validar transición de estado
    if (!canTransitionStatus(app.status as ApplicationStatus, 'cancelado')) {
      return { 
        success: false, 
        error: `No se puede cancelar una solicitud en estado '${app.status}'` 
      };
    }
    
    // Actualizar a cancelado
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'cancelado',
        rejection_reason: reason || 'Cancelada por el gestor',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);
    
    if (error) {
      console.error('[cancelApplication] Error:', error);
      return { success: false, error: 'Error al cancelar la solicitud' };
    }
    
    return { success: true };
  } catch (err) {
    console.error('[cancelApplication] Exception:', err);
    return { success: false, error: 'Error al cancelar la solicitud' };
  }
}

/**
 * Guarda el link del documento firmado de ZapSign y actualiza el estado a matricula_autorizada
 */
export async function saveZapSignSendLink(
  applicationId: string,
  sendLink: string,
  cosignerSendLink?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({
        zapsign_send_link: sendLink,
        zapsign_cosigner_send_link: cosignerSendLink ?? null,
        status: 'pendiente_firma',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[saveZapSignSendLink] Error:', error);
      return { success: false, error: 'Error al guardar el link de envío' };
    }

    return { success: true };
  } catch (err) {
    console.error('[saveZapSignSendLink] Exception:', err);
    return { success: false, error: 'Error al guardar el link de envío' };
  }
}

export async function saveZapSignLink(
  applicationId: string,
  signedLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({
        zapsign_signed_link: signedLink,
        status: 'matricula_autorizada',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[saveZapSignLink] Error:', error);
      return { success: false, error: 'Error al guardar el link de ZapSign' };
    }

    return { success: true };
  } catch (err) {
    console.error('[saveZapSignLink] Exception:', err);
    return { success: false, error: 'Error al guardar el link de ZapSign' };
  }
}

/**
 * Guarda la tabla de amortización de una solicitud
 */
export async function saveAmortization(
  applicationId: string,
  schedule: import('@/types/application').AmortizationRow[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({
        amortization_schedule: schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[saveAmortization] Error:', error);
      return { success: false, error: 'Error al guardar la amortización' };
    }

    return { success: true };
  } catch (err) {
    console.error('[saveAmortization] Exception:', err);
    return { success: false, error: 'Error al guardar la amortización' };
  }
}

/**
 * Actualiza uno o más campos de una solicitud (para edición del gestor en Secciones A y B).
 * Los campos se pasan con sus nombres de columna en snake_case tal como están en la BD.
 */
export async function updateApplicationData(
  applicationId: string,
  fields: Record<string, string | number | boolean | null>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) {
      console.error('[updateApplicationData] Error:', error);
      return { success: false, error: 'Error al actualizar el campo' };
    }

    return { success: true };
  } catch (err) {
    console.error('[updateApplicationData] Exception:', err);
    return { success: false, error: 'Error al actualizar el campo' };
  }
}
export async function deleteApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-application', {
      body: { applicationId },
    });

    if (error) {
      const msg = await error?.context?.text();
      console.error('[deleteApplication] Error:', msg || error.message);
      return { success: false, error: msg || 'Error al eliminar la solicitud' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Error al eliminar la solicitud' };
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteApplication] Exception:', err);
    return { success: false, error: 'Error al eliminar la solicitud' };
  }
}

/**
 * El gestor solicita la eliminación de una solicitud.
 * Registra quién y cuándo pidió la eliminación; la aprobación la hace admin/rector.
 */
export async function requestDeletion(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: 'Usuario no autenticado' };

    const { error } = await supabase
      .from('applications')
      .update({
        deletion_requested_at: new Date().toISOString(),
        deletion_requested_by: user.email,
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[requestDeletion] Error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[requestDeletion] Exception:', err);
    return { success: false, error: 'Error al solicitar la eliminación' };
  }
}

/**
 * Admin/rector rechaza la solicitud de eliminación (limpia los campos).
 */
export async function rejectDeletion(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({
        deletion_requested_at: null,
        deletion_requested_by: null,
      })
      .eq('id', applicationId);

    if (error) {
      console.error('[rejectDeletion] Error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[rejectDeletion] Exception:', err);
    return { success: false, error: 'Error al rechazar la solicitud de eliminación' };
  }
}

// ─── Tipos para reportes ───────────────────────────────────────────────

export interface ReportFilters {
  statuses: string[];
  plans: string[];
  dateFrom: string;
  dateTo: string;
}

export interface ReportRow {
  id: string;
  applicationCode: string;
  studentFullName: string;
  studentDocumentNumber: string;
  studentEmail: string;
  studentPhone: string;
  studentProgram: string;
  studentSemester: string;
  creditPlan: string;
  semesterValue: number;
  initialPayment: number | null;
  financedAmount: number | null;
  numberOfInstallments: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  cosignerFullName: string;
  cosignerDocumentNumber: string;
  cosignerPhone: string;
  assignedTo: string | null;
  initialPaymentDate: string | null;
  guaranteesSignedDate: string | null;
}

export async function getApplicationsForReport(
  filters: ReportFilters
): Promise<{ data: ReportRow[]; error?: string }> {
  try {
    let query = supabase
      .from('applications')
      .select(
        'id, application_code, student_full_name, student_document_number, student_email, student_phone, student_program, student_semester, credit_plan, semester_value, initial_payment, financed_amount, number_of_installments, status, created_at, updated_at, cosigner_full_name, cosigner_document_number, cosigner_phone, assigned_to, initial_payment_date, guarantees_signed_date'
      )
      .eq('is_draft', false)
      .order('created_at', { ascending: false });

    if (filters.statuses.length > 0) {
      query = query.in('status', filters.statuses);
    }
    if (filters.plans.length > 0) {
      query = query.in('credit_plan', filters.plans);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom + 'T00:00:00');
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getApplicationsForReport] Error:', error);
      return { data: [], error: 'Error al obtener el reporte' };
    }

    const rows: ReportRow[] = (data ?? []).map((d) => ({
      id: d.id as string,
      applicationCode: d.application_code as string,
      studentFullName: d.student_full_name as string,
      studentDocumentNumber: d.student_document_number as string,
      studentEmail: d.student_email as string,
      studentPhone: d.student_phone as string,
      studentProgram: d.student_program as string,
      studentSemester: d.student_semester as string,
      creditPlan: d.credit_plan as string,
      semesterValue: d.semester_value as number,
      initialPayment: d.initial_payment as number | null,
      financedAmount: d.financed_amount as number | null,
      numberOfInstallments: d.number_of_installments as number | null,
      status: d.status as string,
      createdAt: d.created_at as string,
      updatedAt: d.updated_at as string,
      cosignerFullName: d.cosigner_full_name as string,
      cosignerDocumentNumber: d.cosigner_document_number as string,
      cosignerPhone: d.cosigner_phone as string,
      assignedTo: d.assigned_to as string | null,
      initialPaymentDate: d.initial_payment_date as string | null,
      guaranteesSignedDate: d.guarantees_signed_date as string | null,
    }));

    return { data: rows };
  } catch (err) {
    console.error('[getApplicationsForReport] Exception:', err);
    return { data: [], error: 'Error al obtener el reporte' };
  }
}

