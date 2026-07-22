// Tipos para la aplicación CrediNOVA

export type ApplicationStatus = 
  | 'borrador'
  | 'en_revision' 
  | 'requiere_ajustes' 
  | 'aprobado' 
  | 'pendiente_firma' 
  | 'matricula_autorizada' 
  | 'rechazado'
  | 'cancelado';

export type DocumentType = 'CC' | 'CE' | 'TI';

export type EducationLevel = 
  | 'Primaria' 
  | 'Secundaria' 
  | 'Técnica' 
  | 'Tecnológica' 
  | 'Universitaria' 
  | 'Posgrado' 
  | 'Ninguno';

export type Occupation = 'Empleado' | 'Pensionado' | 'Independiente' | 'Otro';

export type ContractType = 'Indefinido' | 'Fijo' | 'Prestación de servicios';

export type Shift = 'Diurna' | 'Nocturna' | 'Sabatina';

export type CreditPlan = '50/50' | '20/80';

export type UserRole = 'admin' | 'gestor' | 'rector';

// Tipos para documentos
export type ApplicationDocumentType =
  | 'cedula_estudiante'
  | 'certificado_matricula'
  | 'cedula_codeudor'
  | 'comprobante_ingresos'
  | 'recibo_servicios'
  | 'carta_laboral'
  | 'declaracion_renta'
  | 'extracto_bancario'
  | 'otro';

export type DocumentCategory = 'estudiante' | 'codeudor';

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: ApplicationDocumentType;
  documentCategory: DocumentCategory;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  cloudinarySecureUrl: string;
  fileName: string;
  fileSize: number;
  fileFormat: string;
  uploadedBy?: string;
  uploadedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  original_filename: string;
}

// Tipos para gestión de configuración
export interface CreditStudyCost {
  id: string;
  year: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicProgram {
  id: string;
  name: string;
  tuitionAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CosignerData {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  documentExpeditionDate: string;
  birthDate: string;
  gender: string;
  maritalStatus: string;
  dependents: number;
  address: string;
  neighborhood: string;
  city: string;
  department: string;
  educationLevel: EducationLevel;
  phone: string;
  email: string;
  occupation: Occupation;
  spouseName?: string;
  spouseCompany?: string;
  spouseCompanyAddress?: string;
  spouseCompanyPhone?: string;
  company?: string;
  companyAddress?: string;
  companyCity?: string;
  companyPhone?: string;
  position?: string;
  companyExtension?: string;
  contractType?: ContractType;
  hireDate?: string;
  income?: number;
  monthlyExpenses?: number;
  familyReferenceName: string;
  familyReferencePhone: string;
  personalReferenceName: string;
  personalReferencePhone: string;
  commercialReferenceName?: string;
  commercialReferencePhone?: string;
  mainSupplierName?: string;
  mainSupplierPhone?: string;
  mainClientName?: string;
  mainClientPhone?: string;
}

export interface StudentData {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  documentExpeditionDate: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  neighborhood: string;
  city: string;
  department: string;
  program: string;
  semester: string;
  shift: Shift;
  works: boolean;
  companyName?: string;
  salary?: number;
  companyAddress?: string;
  companyPhone?: string;
  relationshipToCosigner: string;
}

export interface CreditStudyPayment {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
}

// Fila de tabla de amortización
export interface AmortizationRow {
  installmentNumber: number;
  dueDate: string;       // formato YYYY-MM-DD
  amount: number;
}

export interface Application {
  id: string;
  applicationCode: string;
  
  // Deudor Solidario
  cosignerFullName: string;
  cosignerDocumentType: DocumentType;
  cosignerDocumentNumber: string;
  cosignerDocumentExpeditionDate: string;
  cosignerBirthDate: string;
  cosignerGender: string;
  cosignerMaritalStatus: string;
  cosignerDependents: number;
  cosignerAddress: string;
  cosignerNeighborhood: string;
  cosignerCity: string;
  cosignerDepartment: string;
  cosignerEducationLevel: EducationLevel;
  cosignerPhone: string;
  cosignerEmail: string;
  cosignerOccupation: Occupation;
  cosignerSpouseName?: string;
  cosignerSpouseCompany?: string;
  cosignerSpouseCompanyAddress?: string;
  cosignerSpouseCompanyPhone?: string;
  cosignerCompany?: string;
  cosignerCompanyAddress?: string;
  cosignerCompanyCity?: string;
  cosignerCompanyPhone?: string;
  cosignerPosition?: string;
  cosignerCompanyExtension?: string;
  cosignerContractType?: ContractType;
  cosignerHireDate?: string;
  cosignerIncome?: number;
  cosignerMonthlyExpenses?: number;
  cosignerFamilyReferenceName: string;
  cosignerFamilyReferencePhone: string;
  cosignerPersonalReferenceName: string;
  cosignerPersonalReferencePhone: string;
  cosignerCommercialReferenceName?: string;
  cosignerCommercialReferencePhone?: string;
  cosignerMainSupplierName?: string;
  cosignerMainSupplierPhone?: string;
  cosignerMainClientName?: string;
  cosignerMainClientPhone?: string;
  
  // Estudiante
  studentFullName: string;
  studentDocumentType: DocumentType;
  studentDocumentNumber: string;
  studentDocumentExpeditionDate: string;
  studentBirthDate: string;
  studentPhone: string;
  studentEmail: string;
  studentAddress: string;
  studentNeighborhood: string;
  studentCity: string;
  studentDepartment: string;
  studentProgram: string;
  studentSemester: string;
  studentShift: Shift;
  studentWorks: boolean;
  studentCompanyName?: string;
  studentSalary?: number;
  studentCompanyAddress?: string;
  studentCompanyPhone?: string;
  studentRelationshipToCosigner: string;
  
  // Pago estudio de crédito
  creditStudyReceiptNumber: string;
  creditStudyPaymentDate: string;
  creditStudyAmount: number;
  
  // Plan de crédito
  creditPlan: CreditPlan;
  semesterValue: number;
  initialPayment?: number;
  numberOfInstallments?: number;
  financedAmount?: number;
  paymentDayOfMonth?: number;
  
  // Autorizaciones
  studentAuthorizationAccepted: boolean;
  cosignerAuthorizationAccepted: boolean;
  
  // Estado
  status: ApplicationStatus;
  rejectionReason?: string;
  assignedTo?: string;
  
  // Borrador
  isDraft: boolean;
  draftCode?: string;
  
  // Pago cuota inicial
  initialPaymentReceiptNumber?: string;
  initialPaymentDate?: string;
  initialPaymentAmount?: number;
  paymentPlanAccepted: boolean;
  
  // Garantías
  guaranteesSigned: boolean;
  guaranteesSignedDate?: string;
  guaranteesObservations?: string;
  
  // ZapSign
  zapsignSendLink?: string;
  zapsignCosignerSendLink?: string;
  zapsignSignedLink?: string;

  // Tabla de amortización
  amortizationSchedule?: AmortizationRow[];

  // Solicitud de eliminación por gestor (pendiente de aprobación admin/rector)
  deletionRequestedAt?: string | null;
  deletionRequestedBy?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PhoneValidation {
  id: string;
  applicationId: string;
  validationType: string;
  isVerified: boolean;
  verificationDate?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPlan {
  id: string;
  applicationId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  createdAt: string;
}

export interface ApplicationHistory {
  id: string;
  applicationId: string;
  previousStatus?: ApplicationStatus;
  newStatus: ApplicationStatus;
  changedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface InternalUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OTP {
  id: string;
  email: string;
  code: string;
  applicationCode?: string;
  purpose: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// Formulario de nueva solicitud
export interface NewApplicationForm {
  cosigner: CosignerData;
  student: StudentData;
  creditStudyPayment: CreditStudyPayment;
  creditPlan: CreditPlan;
  semesterValue: number;
  initialPayment?: number;
  numberOfInstallments?: number;
  paymentDayOfMonth?: number;
  initialPaymentReceiptNumber?: string;
  initialPaymentDate?: string;
  initialPaymentAmount?: number;
  studentAuthorizationAccepted: boolean;
  cosignerAuthorizationAccepted: boolean;
}

// Estadísticas del dashboard
export interface DashboardStats {
  totalApplications: number;
  totalApplicationsThisMonth: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  totalApprovedAmount: number;
  totalApprovedAmountThisMonth: number;
  applicationsByPlan: Record<CreditPlan, number>;
  applicationsByProgram: Record<string, number>;
}
