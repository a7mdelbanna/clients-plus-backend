/**
 * Setup Wizard Types
 * Comprehensive type definitions for the setup process
 */

// Re-export existing setup types for backward compatibility
export type { CompanySetupData, Branch, BusinessType, Service } from './index';

// Extended business information
export interface ExtendedBusinessInfo {
  businessName: string;
  businessType: string;
  businessCategory: string;
  industry?: string;
  description?: string;
  founded?: string;
  website?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: BusinessAddress;
  logo?: string;
  businessHours?: BusinessHours;
  languages: string[];
  currency: string;
  timezone: string;
  socialMedia?: SocialMediaLinks;
  businessLicense?: string;
  taxNumber?: string;
  registrationNumber?: string;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface BusinessHours {
  [key: string]: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
  is24Hours?: boolean;
  specialNotes?: string;
}

export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  snapchat?: string;
}

// Extended branch information
export interface ExtendedBranch {
  id?: string;
  name: string;
  displayName?: string;
  code?: string;
  address: BusinessAddress;
  contactInfo: ContactInfo;
  isMain: boolean;
  isActive: boolean;
  businessHours?: BusinessHours;
  services: string[];
  staff: string[];
  capacity: number;
  amenities: string[];
  equipment?: Equipment[];
  images?: string[];
  description?: string;
  specialNotes?: string;
  parkingAvailable?: boolean;
  accessibleFacilities?: boolean;
  wifiAvailable?: boolean;
  paymentMethods?: PaymentMethod[];
}

export interface ContactInfo {
  phone: string;
  email?: string;
  whatsapp?: string;
  landline?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'cryptocurrency';
  provider?: string;
  isActive: boolean;
  processingFee?: number;
}

// Team and staff information
export interface ExtendedTeamInfo {
  owner: OwnerInfo;
  members: TeamMember[];
  roles: Role[];
  departments?: Department[];
  invitations: TeamInvitation[];
  organizationChart?: OrganizationNode[];
}

export interface OwnerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialMediaLinks;
  certifications?: Certification[];
  emergencyContact?: EmergencyContact;
}

export interface TeamMember {
  id?: string;
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  role: string;
  permissions: string[];
  branchIds: string[];
  services: string[];
  workSchedule?: WorkSchedule;
  employment: EmploymentInfo;
  professional: ProfessionalInfo;
  isActive: boolean;
  notes?: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationalId?: string;
  passport?: string;
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface EmploymentInfo {
  employeeId?: string;
  department?: string;
  position: string;
  startDate: string;
  endDate?: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'intern';
  salary?: SalaryInfo;
  benefits?: string[];
}

export interface SalaryInfo {
  amount: number;
  currency: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  commission?: CommissionInfo;
}

export interface CommissionInfo {
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  services?: string[];
  targets?: Target[];
}

export interface Target {
  metric: string;
  value: number;
  period: string;
  reward?: number;
}

export interface ProfessionalInfo {
  specializations: string[];
  skills: string[];
  certifications: Certification[];
  experience: number;
  languages: string[];
  education?: Education[];
  awards?: Award[];
}

export interface Certification {
  name: string;
  issuer: string;
  dateIssued: string;
  expiryDate?: string;
  credentialId?: string;
  verificationUrl?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear?: number;
  gpa?: number;
}

export interface Award {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface WorkSchedule {
  [key: string]: WorkDay;
}

export interface WorkDay {
  isWorking: boolean;
  shifts: Shift[];
}

export interface Shift {
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  location?: string;
  notes?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  level: number;
  department?: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  parentId?: string;
  branchIds: string[];
  isActive: boolean;
}

export interface TeamInvitation {
  id?: string;
  email: string;
  role: string;
  branchIds?: string[];
  permissions?: string[];
  sentAt: string;
  sentBy: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
}

export interface OrganizationNode {
  id: string;
  memberId?: string;
  title: string;
  level: number;
  parentId?: string;
  children?: OrganizationNode[];
}

// Theme and branding
export interface ExtendedThemeConfig {
  id: string;
  name: string;
  nameAr: string;
  category: ThemeCategory;
  colors: ColorPalette;
  typography: Typography;
  layout: LayoutConfig;
  components: ComponentStyling;
  branding: BrandingConfig;
  customCss?: string;
  preview?: ThemePreview;
  isPremium: boolean;
  isCustom: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export type ThemeCategory = 'modern' | 'classic' | 'minimal' | 'elegant' | 'vibrant' | 'professional' | 'creative';

export interface ColorPalette {
  primary: ColorVariant;
  secondary: ColorVariant;
  accent?: ColorVariant;
  background: ColorVariant;
  surface: ColorVariant;
  text: ColorVariant;
  success: ColorVariant;
  warning: ColorVariant;
  error: ColorVariant;
  info: ColorVariant;
}

export interface ColorVariant {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}

export interface Typography {
  fontFamily: {
    primary: string;
    secondary?: string;
    mono?: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface LayoutConfig {
  container: {
    maxWidth: string;
    padding: string;
  };
  grid: {
    columns: number;
    gap: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    base: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
}

export interface ComponentStyling {
  button: ButtonStyling;
  input: InputStyling;
  card: CardStyling;
  navigation: NavigationStyling;
  table: TableStyling;
}

export interface ButtonStyling {
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  transition: string;
  variants: {
    primary: ComponentVariant;
    secondary: ComponentVariant;
    outline: ComponentVariant;
  };
}

export interface InputStyling {
  borderRadius: string;
  padding: string;
  fontSize: string;
  borderColor: string;
  focusBorderColor: string;
  backgroundColor: string;
}

export interface CardStyling {
  borderRadius: string;
  padding: string;
  shadow: string;
  backgroundColor: string;
  borderColor?: string;
}

export interface NavigationStyling {
  backgroundColor: string;
  textColor: string;
  activeColor: string;
  hoverColor: string;
  fontSize: string;
  padding: string;
}

export interface TableStyling {
  headerBackgroundColor: string;
  headerTextColor: string;
  rowHoverColor: string;
  borderColor: string;
  fontSize: string;
  padding: string;
}

export interface ComponentVariant {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  activeBackgroundColor?: string;
  activeTextColor?: string;
}

export interface BrandingConfig {
  logo: LogoConfig;
  favicon?: string;
  appleTouchIcon?: string;
  brandName: string;
  tagline?: string;
  description?: string;
  keywords?: string[];
  socialImage?: string;
}

export interface LogoConfig {
  light: string;
  dark?: string;
  icon?: string;
  width?: number;
  height?: number;
}

export interface ThemePreview {
  thumbnail: string;
  screenshots: string[];
  demoUrl?: string;
}

// Setup process types
export interface SetupStepConfig {
  step: number;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  component: string;
  isRequired: boolean;
  validationRules?: ValidationRule[];
  dependencies?: string[];
  estimatedTime: number; // in minutes
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'url' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
  messageAr: string;
}

export interface SetupWizardConfig {
  steps: SetupStepConfig[];
  theme: {
    primaryColor: string;
    logo?: string;
  };
  features: {
    allowSkip: boolean;
    showProgress: boolean;
    saveProgress: boolean;
    validateOnNext: boolean;
    showEstimatedTime: boolean;
  };
  texts: {
    title: string;
    titleAr: string;
    subtitle: string;
    subtitleAr: string;
    skipText: string;
    skipTextAr: string;
    nextText: string;
    nextTextAr: string;
    backText: string;
    backTextAr: string;
    completeText: string;
    completeTextAr: string;
  };
}

// API response types
export interface SetupApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// Setup state management
export interface SetupState {
  currentStep: number;
  completedSteps: number[];
  data: Partial<SetupData>;
  isLoading: boolean;
  errors: Record<string, string[]>;
  isDirty: boolean;
  lastSaved?: string;
}

export interface SetupAction {
  type: 'SET_STEP' | 'SET_DATA' | 'SET_LOADING' | 'SET_ERRORS' | 'CLEAR_ERRORS' | 'RESET' | 'MARK_SAVED';
  payload?: any;
}

// Complete setup data type
export interface CompleteSetupData {
  businessInfo: ExtendedBusinessInfo;
  branches: ExtendedBranch[];
  teamInfo: ExtendedTeamInfo;
  theme: ExtendedThemeConfig;
  preferences: SetupPreferences;
}

export interface SetupPreferences {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartDay: number;
  notifications: NotificationPreferences;
  features: FeaturePreferences;
  integrations: IntegrationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  marketing: boolean;
  reminders: boolean;
  reports: boolean;
}

export interface FeaturePreferences {
  analytics: boolean;
  inventory: boolean;
  payroll: boolean;
  marketing: boolean;
  loyalty: boolean;
  packages: boolean;
  memberships: boolean;
  onlineBooking: boolean;
  mobileApp: boolean;
  pos: boolean;
}

export interface IntegrationPreferences {
  whatsapp: WhatsAppIntegration;
  googleCalendar: GoogleCalendarIntegration;
  payments: PaymentIntegration[];
  accounting: AccountingIntegration;
  marketing: MarketingIntegration[];
}

export interface WhatsAppIntegration {
  enabled: boolean;
  businessPhone?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  features: {
    notifications: boolean;
    booking: boolean;
    reminders: boolean;
    marketing: boolean;
  };
}

export interface GoogleCalendarIntegration {
  enabled: boolean;
  calendarId?: string;
  syncAppointments: boolean;
  syncAvailability: boolean;
}

export interface PaymentIntegration {
  provider: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface AccountingIntegration {
  provider?: string;
  enabled: boolean;
  syncInvoices: boolean;
  syncExpenses: boolean;
  configuration: Record<string, any>;
}

export interface MarketingIntegration {
  provider: string;
  enabled: boolean;
  features: string[];
  configuration: Record<string, any>;
}

// Utility types
export type SetupStep = 'business-info' | 'branches' | 'team-info' | 'theme' | 'preferences' | 'review';

export interface SetupNavigationItem {
  step: SetupStep;
  label: string;
  labelAr: string;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
}

export interface SetupValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Constants
export const SETUP_STEPS: Record<SetupStep, SetupStepConfig> = {
  'business-info': {
    step: 1,
    name: 'Business Information',
    nameAr: 'معلومات العمل',
    description: 'Basic information about your business',
    descriptionAr: 'المعلومات الأساسية عن عملك',
    component: 'BusinessInfoStep',
    isRequired: true,
    estimatedTime: 5,
  },
  'branches': {
    step: 2,
    name: 'Branches & Locations',
    nameAr: 'الفروع والمواقع',
    description: 'Setup your business locations',
    descriptionAr: 'إعداد مواقع عملك',
    component: 'BranchesStep',
    isRequired: true,
    estimatedTime: 10,
  },
  'team-info': {
    step: 3,
    name: 'Team & Staff',
    nameAr: 'الفريق والموظفين',
    description: 'Add your team members',
    descriptionAr: 'إضافة أعضاء فريقك',
    component: 'TeamInfoStep',
    isRequired: false,
    estimatedTime: 15,
  },
  'theme': {
    step: 4,
    name: 'Theme & Branding',
    nameAr: 'التصميم والهوية',
    description: 'Customize your brand appearance',
    descriptionAr: 'تخصيص مظهر علامتك التجارية',
    component: 'ThemeStep',
    isRequired: true,
    estimatedTime: 5,
  },
  'preferences': {
    step: 5,
    name: 'Preferences',
    nameAr: 'التفضيلات',
    description: 'Configure system preferences',
    descriptionAr: 'تكوين تفضيلات النظام',
    component: 'PreferencesStep',
    isRequired: false,
    estimatedTime: 5,
  },
  'review': {
    step: 6,
    name: 'Review & Complete',
    nameAr: 'مراجعة وإكمال',
    description: 'Review and finalize your setup',
    descriptionAr: 'مراجعة وإنهاء الإعداد',
    component: 'ReviewStep',
    isRequired: true,
    estimatedTime: 3,
  },
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  sunday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  friday: { isOpen: false, openTime: '09:00', closeTime: '18:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
};

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  sunday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
  monday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
  tuesday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
  wednesday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
  thursday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
  friday: { isWorking: false, shifts: [] },
  saturday: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '18:00' }] },
};