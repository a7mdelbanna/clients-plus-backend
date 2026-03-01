export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface CompanySetupData {
  businessName: string;
  businessType: string;
  mainServices: string[];
  ownerPosition: string;
  branches: Branch[];
  employeeCount: number;
  themeId: string;
  setupCompleted: boolean;
  setupCompletedAt?: Date;
}

export interface BusinessType {
  id: string;
  name: string;
  nameAr: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: string;
  nameAr: string;
}

export const businessTypes: BusinessType[] = [
  {
    id: 'barbershop',
    name: 'Barbershop',
    nameAr: 'صالون حلاقة رجالي',
    services: [
      { id: 'haircut', name: 'Haircut', nameAr: 'قص شعر' },
      { id: 'beard', name: 'Beard Trim', nameAr: 'تهذيب اللحية' },
      { id: 'shave', name: 'Shave', nameAr: 'حلاقة' },
      { id: 'hair-color', name: 'Hair Coloring', nameAr: 'صبغ الشعر' }
    ]
  },
  {
    id: 'beauty-salon',
    name: 'Beauty Salon',
    nameAr: 'صالون تجميل نسائي',
    services: [
      { id: 'hair-style', name: 'Hair Styling', nameAr: 'تصفيف الشعر' },
      { id: 'hair-treatment', name: 'Hair Treatment', nameAr: 'علاج الشعر' },
      { id: 'makeup', name: 'Makeup', nameAr: 'مكياج' },
      { id: 'manicure', name: 'Manicure', nameAr: 'العناية بالأظافر' }
    ]
  },
  {
    id: 'beauty-center',
    name: 'Beauty Center',
    nameAr: 'مركز تجميل',
    services: [
      { id: 'facial', name: 'Facial Treatment', nameAr: 'علاج الوجه' },
      { id: 'body-treatment', name: 'Body Treatment', nameAr: 'علاج الجسم' },
      { id: 'laser', name: 'Laser Treatment', nameAr: 'علاج بالليزر' },
      { id: 'botox', name: 'Botox', nameAr: 'بوتوكس' }
    ]
  },
  {
    id: 'aesthetic-clinic',
    name: 'Aesthetic Clinic',
    nameAr: 'عيادة تجميل',
    services: [
      { id: 'consultation', name: 'Consultation', nameAr: 'استشارة' },
      { id: 'filler', name: 'Filler', nameAr: 'فيلر' },
      { id: 'skin-treatment', name: 'Skin Treatment', nameAr: 'علاج البشرة' },
      { id: 'plastic-surgery', name: 'Plastic Surgery', nameAr: 'جراحة تجميل' }
    ]
  },
  {
    id: 'spa',
    name: 'Spa & Massage',
    nameAr: 'سبا ومساج',
    services: [
      { id: 'massage', name: 'Massage', nameAr: 'مساج' },
      { id: 'sauna', name: 'Sauna', nameAr: 'ساونا' },
      { id: 'hammam', name: 'Hammam', nameAr: 'حمام مغربي' },
      { id: 'relaxation', name: 'Relaxation', nameAr: 'استرخاء' }
    ]
  },
  {
    id: 'nail-salon',
    name: 'Nail Salon',
    nameAr: 'صالون أظافر',
    services: [
      { id: 'manicure', name: 'Manicure', nameAr: 'مانيكير' },
      { id: 'pedicure', name: 'Pedicure', nameAr: 'باديكير' },
      { id: 'nail-art', name: 'Nail Art', nameAr: 'فن الأظافر' },
      { id: 'gel-nails', name: 'Gel Nails', nameAr: 'أظافر جل' }
    ]
  },
  {
    id: 'skin-care',
    name: 'Skin Care Center',
    nameAr: 'مركز العناية بالبشرة',
    services: [
      { id: 'deep-cleaning', name: 'Deep Cleaning', nameAr: 'تنظيف عميق' },
      { id: 'peeling', name: 'Peeling', nameAr: 'تقشير' },
      { id: 'hydration', name: 'Hydration', nameAr: 'ترطيب' },
      { id: 'anti-aging', name: 'Anti-Aging', nameAr: 'مكافحة الشيخوخة' }
    ]
  }
];

export const positions = [
  { id: 'owner', name: 'Owner', nameAr: 'مالك' },
  { id: 'manager', name: 'Manager', nameAr: 'مدير' },
  { id: 'receptionist', name: 'Receptionist', nameAr: 'موظف استقبال' }
];