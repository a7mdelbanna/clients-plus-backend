/**
 * CSV Template Generator Utility
 * Provides template generation for all import features across the app
 */

export interface CSVTemplateConfig {
  headers: string[];
  sampleRows?: string[][];
  fileName: string;
  instructions?: string[];
}

/**
 * Generates and downloads a CSV template file
 */
export function downloadCSVTemplate(config: CSVTemplateConfig) {
  const { headers, sampleRows = [], fileName, instructions = [] } = config;
  
  // Add BOM for proper UTF-8 encoding (important for Arabic)
  const BOM = '\uFEFF';
  
  // Build CSV content
  const rows = [headers];
  
  // Add instructions as comments if provided
  if (instructions.length > 0) {
    rows.unshift(...instructions.map(instruction => [`# ${instruction}`]));
  }
  
  // Add sample rows
  rows.push(...sampleRows);
  
  // Convert to CSV string
  const csvContent = BOM + rows
    .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============= TEMPLATE DEFINITIONS =============

/**
 * Contacts Import Template
 */
export const CONTACTS_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'الاسم المعروض *',
    'النوع *',
    'الحالة',
    'الاسم الأول',
    'الاسم الأخير',
    'اسم الشركة',
    'الهاتف',
    'البريد الإلكتروني',
    'الرقم الضريبي',
    'العنوان',
    'الملاحظات',
    'العلامات'
  ],
  sampleRows: [
    [
      'أحمد محمد',
      'عميل',
      'نشط',
      'أحمد',
      'محمد',
      '',
      '01234567890',
      'ahmed@example.com',
      '',
      'القاهرة، مصر',
      'عميل مهم',
      'VIP, قاهرة'
    ],
    [
      'شركة النور للتوريدات',
      'مورد',
      'نشط',
      '',
      '',
      'شركة النور للتوريدات',
      '01098765432',
      'info@alnoor.com',
      '123456789',
      'الإسكندرية، مصر',
      'مورد رئيسي للمواد الخام',
      'موردين, إسكندرية'
    ],
    [
      'محمد علي',
      'موظف',
      'نشط',
      'محمد',
      'علي',
      '',
      '01555555555',
      'mohamed.ali@company.com',
      '',
      '',
      'مدير المبيعات',
      'مبيعات, إدارة'
    ]
  ],
  fileName: `contacts_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: الاسم المعروض، النوع',
    'أنواع جهات الاتصال المتاحة: عميل، مورد، موظف، مزود، شريك، مقاول، أخرى',
    'الحالات المتاحة: نشط، غير نشط',
    'استخدم الفاصلة لفصل العلامات المتعددة'
  ]
};

/**
 * Clients Import Template
 */
export const CLIENTS_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'الاسم الأول *',
    'الاسم الأخير',
    'رقم الهاتف *',
    'البريد الإلكتروني',
    'تاريخ الميلاد',
    'الجنس',
    'العنوان',
    'المدينة',
    'الملاحظات',
    'الفئة',
    'العلامات'
  ],
  sampleRows: [
    [
      'فاطمة',
      'أحمد',
      '01234567890',
      'fatma@example.com',
      '1990-05-15',
      'أنثى',
      'شارع التحرير',
      'القاهرة',
      'عميلة منتظمة',
      'VIP',
      'منتظم, قاهرة'
    ],
    [
      'محمد',
      'حسن',
      '01098765432',
      'mohamed@example.com',
      '1985-08-20',
      'ذكر',
      'شارع الجامعة',
      'الإسكندرية',
      '',
      'عادي',
      'جديد'
    ]
  ],
  fileName: `clients_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: الاسم الأول، رقم الهاتف',
    'تنسيق التاريخ: YYYY-MM-DD',
    'الجنس: ذكر أو أنثى',
    'استخدم الفاصلة لفصل العلامات المتعددة'
  ]
};

/**
 * Products Import Template
 */
export const PRODUCTS_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'اسم المنتج *',
    'رمز المنتج (SKU) *',
    'الباركود',
    'الفئة',
    'سعر الشراء',
    'سعر البيع *',
    'الكمية المتاحة',
    'الحد الأدنى للمخزون',
    'الوحدة',
    'الوصف',
    'المورد',
    'العلامات'
  ],
  sampleRows: [
    [
      'شامبو للشعر الجاف',
      'SHMP-001',
      '6281234567890',
      'منتجات الشعر',
      '25.00',
      '45.00',
      '50',
      '10',
      'قطعة',
      'شامبو مرطب للشعر الجاف والتالف',
      'شركة النور للتوريدات',
      'شامبو, شعر جاف'
    ],
    [
      'كريم ترطيب البشرة',
      'CRM-002',
      '6289876543210',
      'منتجات البشرة',
      '30.00',
      '55.00',
      '30',
      '5',
      'قطعة',
      'كريم ترطيب يومي للبشرة الجافة',
      'مؤسسة الجمال',
      'كريم, بشرة'
    ]
  ],
  fileName: `products_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: اسم المنتج، رمز المنتج، سعر البيع',
    'الأسعار بالجنيه المصري',
    'الباركود يجب أن يكون رقمًا فريدًا',
    'استخدم الفاصلة لفصل العلامات المتعددة'
  ]
};

/**
 * Inventory Import Template
 */
export const INVENTORY_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'رمز المنتج (SKU) *',
    'اسم المنتج',
    'الكمية الحالية *',
    'نوع الحركة *',
    'السبب',
    'التاريخ',
    'رقم الفاتورة',
    'المورد/العميل',
    'الملاحظات'
  ],
  sampleRows: [
    [
      'SHMP-001',
      'شامبو للشعر الجاف',
      '20',
      'إضافة',
      'شراء',
      '2024-01-15',
      'INV-2024-001',
      'شركة النور للتوريدات',
      'دفعة جديدة'
    ],
    [
      'CRM-002',
      'كريم ترطيب البشرة',
      '5',
      'خصم',
      'بيع',
      '2024-01-16',
      'SALE-2024-050',
      'فاطمة أحمد',
      ''
    ]
  ],
  fileName: `inventory_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: رمز المنتج، الكمية الحالية، نوع الحركة',
    'أنواع الحركة المتاحة: إضافة، خصم، تعديل',
    'تنسيق التاريخ: YYYY-MM-DD',
    'رمز المنتج يجب أن يكون موجودًا في النظام'
  ]
};

/**
 * Staff/Employees Import Template
 */
export const STAFF_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'الاسم الأول *',
    'الاسم الأخير *',
    'البريد الإلكتروني *',
    'رقم الهاتف',
    'المنصب *',
    'القسم',
    'تاريخ التعيين',
    'الراتب الأساسي',
    'العمولة %',
    'الفرع',
    'الحالة'
  ],
  sampleRows: [
    [
      'سارة',
      'محمود',
      'sara.mahmoud@salon.com',
      '01234567890',
      'أخصائية تجميل',
      'قسم التجميل',
      '2023-06-01',
      '5000',
      '10',
      'الفرع الرئيسي',
      'نشط'
    ],
    [
      'أحمد',
      'حسن',
      'ahmed.hassan@salon.com',
      '01098765432',
      'مصفف شعر',
      'قسم الشعر',
      '2023-08-15',
      '4500',
      '15',
      'فرع المعادي',
      'نشط'
    ]
  ],
  fileName: `staff_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: الاسم الأول، الاسم الأخير، البريد الإلكتروني، المنصب',
    'تنسيق التاريخ: YYYY-MM-DD',
    'الراتب بالجنيه المصري',
    'العمولة كنسبة مئوية (0-100)'
  ]
};

/**
 * Services Import Template
 */
export const SERVICES_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'اسم الخدمة *',
    'الفئة *',
    'المدة (دقائق) *',
    'السعر *',
    'السعر المخفض',
    'الوصف',
    'متاح للحجز أونلاين',
    'يتطلب موارد',
    'الموظفون المؤهلون',
    'العلامات'
  ],
  sampleRows: [
    [
      'قص شعر رجالي',
      'خدمات الشعر',
      '30',
      '50',
      '',
      'قص شعر احترافي للرجال',
      'نعم',
      'كرسي حلاقة',
      'أحمد حسن, محمد علي',
      'شعر, رجالي'
    ],
    [
      'جلسة فيشل',
      'العناية بالبشرة',
      '60',
      '200',
      '150',
      'جلسة تنظيف عميق للبشرة',
      'نعم',
      'غرفة علاج',
      'سارة محمود, فاطمة أحمد',
      'بشرة, فيشل'
    ]
  ],
  fileName: `services_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: اسم الخدمة، الفئة، المدة، السعر',
    'المدة بالدقائق',
    'الأسعار بالجنيه المصري',
    'متاح للحجز أونلاين: نعم أو لا',
    'استخدم الفاصلة لفصل الموظفين والعلامات'
  ]
};

/**
 * Expenses Import Template
 */
export const EXPENSES_TEMPLATE: CSVTemplateConfig = {
  headers: [
    'التاريخ *',
    'الفئة *',
    'المبلغ *',
    'المورد',
    'رقم الفاتورة',
    'طريقة الدفع',
    'الحساب',
    'الوصف',
    'الملاحظات',
    'العلامات'
  ],
  sampleRows: [
    [
      '2024-01-15',
      'مشتريات',
      '1500',
      'شركة النور للتوريدات',
      'INV-2024-001',
      'نقدي',
      'الصندوق الرئيسي',
      'شراء منتجات تجميل',
      'دفعة شهرية',
      'مشتريات, منتجات'
    ],
    [
      '2024-01-16',
      'إيجار',
      '10000',
      'شركة العقارات المتحدة',
      'RENT-2024-01',
      'تحويل بنكي',
      'البنك الأهلي',
      'إيجار شهر يناير',
      '',
      'إيجار, شهري'
    ]
  ],
  fileName: `expenses_template_${new Date().toISOString().split('T')[0]}.csv`,
  instructions: [
    'الحقول المطلوبة: التاريخ، الفئة، المبلغ',
    'تنسيق التاريخ: YYYY-MM-DD',
    'المبلغ بالجنيه المصري',
    'طرق الدفع: نقدي، شيك، تحويل بنكي، بطاقة ائتمان'
  ]
};

/**
 * Get all available templates
 */
export const ALL_TEMPLATES = {
  contacts: CONTACTS_TEMPLATE,
  clients: CLIENTS_TEMPLATE,
  products: PRODUCTS_TEMPLATE,
  inventory: INVENTORY_TEMPLATE,
  staff: STAFF_TEMPLATE,
  services: SERVICES_TEMPLATE,
  expenses: EXPENSES_TEMPLATE
};

/**
 * Helper to get template by type
 */
export function getTemplate(type: keyof typeof ALL_TEMPLATES): CSVTemplateConfig {
  return ALL_TEMPLATES[type];
}