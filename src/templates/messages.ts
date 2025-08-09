export interface MessageTemplate {
  id: string;
  name: string;
  type: 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation' | 'appointment_reschedule' | 'custom';
  content: {
    en: string;
    ar: string;
  };
  variables: string[];
  channels: ('SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH')[];
}

export const messageTemplates: Record<string, MessageTemplate> = {
  appointment_confirmation: {
    id: 'appointment_confirmation',
    name: 'Appointment Confirmation',
    type: 'appointment_confirmation',
    content: {
      en: 'Hi {{clientName}}, your appointment at {{businessName}} is confirmed for {{date}} at {{time}}. Service: {{serviceName}} with {{staffName}}. Address: {{businessAddress}}. Call {{businessPhone}} for changes.',
      ar: 'مرحبا {{clientName}}، تم تأكيد موعدك في {{businessName}} يوم {{date}} في {{time}}. الخدمة: {{serviceName}} مع {{staffName}}. العنوان: {{businessAddress}}. اتصل على {{businessPhone}} للتغييرات.'
    },
    variables: ['clientName', 'businessName', 'date', 'time', 'serviceName', 'staffName', 'businessAddress', 'businessPhone'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  appointment_reminder: {
    id: 'appointment_reminder',
    name: 'Appointment Reminder',
    type: 'appointment_reminder',
    content: {
      en: 'Reminder: Your appointment at {{businessName}} is {{reminderTime}} ({{time}}). Service: {{serviceName}} with {{staffName}}. Address: {{businessAddress}}.',
      ar: 'تذكير: موعدك في {{businessName}} {{reminderTime}} ({{time}}). الخدمة: {{serviceName}} مع {{staffName}}. العنوان: {{businessAddress}}.'
    },
    variables: ['clientName', 'businessName', 'reminderTime', 'time', 'serviceName', 'staffName', 'businessAddress'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH']
  },

  appointment_cancellation: {
    id: 'appointment_cancellation',
    name: 'Appointment Cancellation',
    type: 'appointment_cancellation',
    content: {
      en: 'Your appointment at {{businessName}} on {{date}} at {{time}} has been cancelled. Call {{businessPhone}} to reschedule.',
      ar: 'تم إلغاء موعدك في {{businessName}} يوم {{date}} في {{time}}. اتصل على {{businessPhone}} لإعادة الجدولة.'
    },
    variables: ['clientName', 'businessName', 'date', 'time', 'businessPhone'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  appointment_reschedule: {
    id: 'appointment_reschedule',
    name: 'Appointment Reschedule',
    type: 'appointment_reschedule',
    content: {
      en: 'Your appointment at {{businessName}} has been rescheduled to {{date}} at {{time}}. Service: {{serviceName}} with {{staffName}}.',
      ar: 'تم تغيير موعدك في {{businessName}} إلى {{date}} في {{time}}. الخدمة: {{serviceName}} مع {{staffName}}.'
    },
    variables: ['clientName', 'businessName', 'date', 'time', 'serviceName', 'staffName'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  payment_reminder: {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    type: 'custom',
    content: {
      en: 'Hi {{clientName}}, you have an outstanding balance of {{amount}} at {{businessName}}. Please visit us or call {{businessPhone}} to settle your account.',
      ar: 'مرحبا {{clientName}}، لديك مبلغ مستحق قدره {{amount}} في {{businessName}}. يرجى زيارتنا أو الاتصال على {{businessPhone}} لتسوية حسابك.'
    },
    variables: ['clientName', 'businessName', 'amount', 'businessPhone'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  birthday_greeting: {
    id: 'birthday_greeting',
    name: 'Birthday Greeting',
    type: 'custom',
    content: {
      en: 'Happy Birthday {{clientName}}! 🎉 As a birthday gift from {{businessName}}, enjoy a {{discount}}% discount on your next appointment. Book now!',
      ar: 'عيد ميلاد سعيد {{clientName}}! 🎉 كهدية عيد ميلاد من {{businessName}}، استمتع بخصم {{discount}}% على موعدك القادم. احجز الآن!'
    },
    variables: ['clientName', 'businessName', 'discount'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  promotion_announcement: {
    id: 'promotion_announcement',
    name: 'Promotion Announcement',
    type: 'custom',
    content: {
      en: 'Special offer at {{businessName}}! {{promotionDescription}}. Valid until {{expiryDate}}. Call {{businessPhone}} to book.',
      ar: 'عرض خاص في {{businessName}}! {{promotionDescription}}. صالح حتى {{expiryDate}}. اتصل على {{businessPhone}} للحجز.'
    },
    variables: ['businessName', 'promotionDescription', 'expiryDate', 'businessPhone'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  no_show_follow_up: {
    id: 'no_show_follow_up',
    name: 'No Show Follow Up',
    type: 'custom',
    content: {
      en: 'Hi {{clientName}}, we missed you at your appointment on {{date}}. At {{businessName}}, we value your time. Please call {{businessPhone}} to reschedule.',
      ar: 'مرحبا {{clientName}}، افتقدناك في موعدك يوم {{date}}. في {{businessName}}، نحن نقدر وقتك. يرجى الاتصال على {{businessPhone}} لإعادة الجدولة.'
    },
    variables: ['clientName', 'businessName', 'date', 'businessPhone'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  service_feedback_request: {
    id: 'service_feedback_request',
    name: 'Service Feedback Request',
    type: 'custom',
    content: {
      en: 'Hi {{clientName}}, thank you for visiting {{businessName}}. How was your experience with {{serviceName}}? Your feedback helps us improve. Rate us: {{reviewLink}}',
      ar: 'مرحبا {{clientName}}، شكرا لزيارة {{businessName}}. كيف كانت تجربتك مع {{serviceName}}؟ تقييمك يساعدنا على التحسن. قيمنا: {{reviewLink}}'
    },
    variables: ['clientName', 'businessName', 'serviceName', 'reviewLink'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  },

  welcome_new_client: {
    id: 'welcome_new_client',
    name: 'Welcome New Client',
    type: 'custom',
    content: {
      en: 'Welcome to {{businessName}}, {{clientName}}! 🎉 We\'re excited to have you. Your first appointment is on {{date}} at {{time}}. Looking forward to serving you!',
      ar: 'أهلا وسهلا في {{businessName}}، {{clientName}}! 🎉 نحن متحمسون لوجودك معنا. موعدك الأول في {{date}} في {{time}}. نتطلع لخدمتك!'
    },
    variables: ['businessName', 'clientName', 'date', 'time'],
    channels: ['SMS', 'EMAIL', 'WHATSAPP']
  }
};

export class MessageTemplateService {
  /**
   * Get all available templates
   */
  getAllTemplates(): MessageTemplate[] {
    return Object.values(messageTemplates);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): MessageTemplate | null {
    return messageTemplates[id] || null;
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: MessageTemplate['type']): MessageTemplate[] {
    return Object.values(messageTemplates).filter(template => template.type === type);
  }

  /**
   * Get templates by channel
   */
  getTemplatesByChannel(channel: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH'): MessageTemplate[] {
    return Object.values(messageTemplates).filter(template => 
      template.channels.includes(channel)
    );
  }

  /**
   * Render template with variables
   */
  renderTemplate(
    templateId: string, 
    variables: Record<string, string>, 
    language: 'en' | 'ar' = 'ar'
  ): string | null {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return null;
    }

    let content = template.content[language];
    
    // Replace variables in template
    template.variables.forEach(variable => {
      const value = variables[variable] || '';
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(templateId: string, variables: Record<string, string>): {
    valid: boolean;
    missingVariables: string[];
    extraVariables: string[];
  } {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return { valid: false, missingVariables: [], extraVariables: [] };
    }

    const providedVariables = Object.keys(variables);
    const requiredVariables = template.variables;

    const missingVariables = requiredVariables.filter(
      variable => !providedVariables.includes(variable)
    );

    const extraVariables = providedVariables.filter(
      variable => !requiredVariables.includes(variable)
    );

    return {
      valid: missingVariables.length === 0,
      missingVariables,
      extraVariables
    };
  }

  /**
   * Create custom template (for database storage)
   */
  createCustomTemplate(template: Omit<MessageTemplate, 'id'>): MessageTemplate {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ...template,
      id,
      type: 'custom'
    };
  }

  /**
   * Extract variables from template content
   */
  extractVariablesFromContent(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(templateId: string, language: 'en' | 'ar' = 'ar'): string | null {
    const sampleData = {
      clientName: language === 'ar' ? 'أحمد محمد' : 'Ahmed Mohammed',
      businessName: language === 'ar' ? 'صالون الجمال الملكي' : 'Royal Beauty Salon',
      date: language === 'ar' ? '١٥ مارس ٢٠٢٥' : 'March 15, 2025',
      time: '10:30',
      serviceName: language === 'ar' ? 'قص وتسريح شعر' : 'Hair Cut & Style',
      staffName: language === 'ar' ? 'سارة أحمد' : 'Sarah Ahmed',
      businessAddress: language === 'ar' ? 'شارع التحرير، القاهرة' : 'Tahrir Street, Cairo',
      businessPhone: '+201234567890',
      reminderTime: language === 'ar' ? 'خلال ساعة واحدة' : 'in 1 hour',
      amount: language === 'ar' ? '٢٠٠ جنيه' : '200 EGP',
      discount: '20',
      promotionDescription: language === 'ar' ? 'خصم ٣٠% على جميع الخدمات' : '30% off all services',
      expiryDate: language === 'ar' ? '٣١ مارس ٢٠٢٥' : 'March 31, 2025',
      reviewLink: 'https://example.com/review'
    };

    return this.renderTemplate(templateId, sampleData, language);
  }
}

export const messageTemplateService = new MessageTemplateService();