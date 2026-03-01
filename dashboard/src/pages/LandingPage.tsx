import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  Stack,
  IconButton,
  useTheme,
  alpha,
  Chip,
  Avatar,
  Rating,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery
} from '@mui/material';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import AnimatedBackground from '../components/AnimatedBackground';

// Icons
import {
  Business,
  CalendarMonth,
  People,
  Groups,
  Payment,
  Analytics,
  PhoneAndroid,
  CloudOff,
  Check,
  Star,
  ArrowForward,
  Speed,
  Security,
  Support,
  KeyboardArrowDown,
  Menu,
  Close,
  LightMode,
  DarkMode
} from '@mui/icons-material';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
    // Force page reload to apply theme
    window.location.reload();
  };
  
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 100], [0, -100]);
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.9]);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Features data
  const features = [
    {
      icon: <Business sx={{ fontSize: 40 }} />,
      title: 'إدارة متعددة الشركات',
      description: 'نظام واحد لإدارة عدة فروع وشركات بكفاءة عالية',
      color: theme.palette.primary.main
    },
    {
      icon: <CalendarMonth sx={{ fontSize: 40 }} />,
      title: 'نظام حجز المواعيد',
      description: 'حجز وإدارة المواعيد بسهولة مع تذكيرات تلقائية',
      color: theme.palette.secondary.main
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: 'إدارة الموظفين',
      description: 'تحكم كامل في الصلاحيات وجداول العمل',
      color: '#10B981'
    },
    {
      icon: <Groups sx={{ fontSize: 40 }} />,
      title: 'قاعدة بيانات العملاء',
      description: 'سجل شامل للعملاء مع تاريخ الزيارات والخدمات',
      color: '#F59E0B'
    },
    {
      icon: <Payment sx={{ fontSize: 40 }} />,
      title: 'دفع إلكتروني آمن',
      description: 'تكامل مع باي موب وفوري للدفع الإلكتروني',
      color: '#EF4444'
    },
    {
      icon: <Analytics sx={{ fontSize: 40 }} />,
      title: 'تقارير وإحصائيات',
      description: 'رؤى تفصيلية لأداء عملك وإيراداتك',
      color: '#8B5CF6'
    },
    {
      icon: <PhoneAndroid sx={{ fontSize: 40 }} />,
      title: 'تطبيق جوال',
      description: 'متوفر على iOS و Android للعملاء والموظفين',
      color: '#3B82F6'
    },
    {
      icon: <CloudOff sx={{ fontSize: 40 }} />,
      title: 'العمل بدون إنترنت',
      description: 'استمر في العمل حتى عند انقطاع الإنترنت',
      color: '#6B7280'
    }
  ];

  // Pricing plans
  const pricingPlans = [
    {
      name: 'تجريبي',
      price: '0',
      duration: '14 يوم',
      features: [
        'جميع المميزات الأساسية',
        'حتى 50 عميل',
        '2 موظفين',
        'دعم عبر البريد'
      ],
      color: theme.palette.grey[500],
      recommended: false
    },
    {
      name: 'أساسي',
      price: '99',
      duration: 'شهرياً',
      features: [
        'جميع مميزات التجريبي',
        'حتى 500 عميل',
        '5 موظفين',
        'دعم عبر الهاتف',
        'تقارير أساسية'
      ],
      color: theme.palette.primary.main,
      recommended: false
    },
    {
      name: 'متقدم',
      price: '299',
      duration: 'شهرياً',
      features: [
        'جميع مميزات الأساسي',
        'عملاء غير محدودين',
        '20 موظف',
        'دعم فوري 24/7',
        'تقارير متقدمة',
        'تكامل API'
      ],
      color: theme.palette.secondary.main,
      recommended: true
    },
    {
      name: 'مؤسسي',
      price: 'مخصص',
      duration: 'اتصل بنا',
      features: [
        'جميع المميزات',
        'موظفين غير محدودين',
        'دعم مخصص',
        'تدريب الفريق',
        'تخصيص كامل',
        'SLA مضمون'
      ],
      color: '#10B981',
      recommended: false
    }
  ];

  // How it works steps
  const steps = [
    { number: '1', title: 'سجل حسابك المجاني', description: 'أنشئ حسابك في دقائق' },
    { number: '2', title: 'أضف بيانات شركتك', description: 'أدخل معلومات عملك' },
    { number: '3', title: 'دعوة الموظفين', description: 'أضف فريق العمل' },
    { number: '4', title: 'ابدأ استقبال الحجوزات', description: 'شارك رابط الحجز' }
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'أحمد محمد',
      role: 'صاحب صالون',
      rating: 5,
      comment: 'نظام رائع ساعدني في تنظيم العمل وزيادة الإيرادات بنسبة 40%',
      avatar: 'AM'
    },
    {
      name: 'فاطمة أحمد',
      role: 'مديرة عيادة',
      rating: 5,
      comment: 'سهولة في الاستخدام وخدمة عملاء ممتازة. أنصح به بشدة',
      avatar: 'FA'
    },
    {
      name: 'محمد علي',
      role: 'صاحب سبا',
      rating: 5,
      comment: 'حل متكامل لإدارة الأعمال. وفر علينا الكثير من الوقت والجهد',
      avatar: 'MA'
    }
  ];

  // Stats
  const stats = [
    { number: 500, suffix: '+', label: 'عميل سعيد' },
    { number: 10000, suffix: '+', label: 'حجز شهرياً' },
    { number: 98, suffix: '%', label: 'رضا العملاء' },
    { number: 24, suffix: '/7', label: 'دعم فني' }
  ];

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <AnimatedBackground />
      
      {/* Header */}
      <motion.div
        style={{ y: headerY, opacity: headerOpacity }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}
        >
          <Container>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ py: 2 }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Clients+
              </Typography>

              {/* Desktop Navigation */}
              {!isMobile && (
                <Stack direction="row" spacing={4} alignItems="center">
                  <Button color="inherit" href="#features">المميزات</Button>
                  <Button color="inherit" href="#pricing">الأسعار</Button>
                  <Button color="inherit" href="#how-it-works">كيف يعمل</Button>
                  <IconButton onClick={toggleDarkMode} color="inherit">
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                  <Button variant="outlined" onClick={() => navigate('/login')}>
                    تسجيل الدخول
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={() => navigate('/signup')}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    }}
                  >
                    ابدأ مجاناً
                  </Button>
                </Stack>
              )}

              {/* Mobile Menu Button */}
              {isMobile && (
                <IconButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <Close /> : <Menu />}
                </IconButton>
              )}
            </Stack>
          </Container>
        </Box>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && isMobile && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween' }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '80%',
              background: theme.palette.background.paper,
              zIndex: 1001,
              padding: theme.spacing(3)
            }}
          >
            <Stack spacing={3} sx={{ mt: 8 }}>
              <Button fullWidth href="#features">المميزات</Button>
              <Button fullWidth href="#pricing">الأسعار</Button>
              <Button fullWidth href="#how-it-works">كيف يعمل</Button>
              <Button fullWidth variant="outlined" onClick={() => navigate('/login')}>
                تسجيل الدخول
              </Button>
              <Button fullWidth variant="contained" onClick={() => navigate('/signup')}>
                ابدأ مجاناً
              </Button>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <Box sx={{ pt: 15, pb: 10, position: 'relative' }}>
        <Container>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <motion.div variants={fadeInUp}>
                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: '2.5rem', md: '4rem' },
                      fontWeight: 'bold',
                      mb: 3,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    منصة إدارة الأعمال الشاملة
                  </Typography>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Typography variant="h5" sx={{ mb: 4, color: 'text.secondary' }}>
                    حلول متكاملة لإدارة المواعيد والعملاء والموظفين للصالونات والعيادات
                  </Typography>
                </motion.div>

                <motion.div variants={fadeInUp}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/signup')}
                      endIcon={<ArrowForward />}
                      sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        py: 2,
                        px: 4
                      }}
                    >
                      ابدأ تجربة مجانية
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      sx={{ py: 2, px: 4 }}
                    >
                      شاهد العرض التوضيحي
                    </Button>
                  </Stack>
                </motion.div>

                {/* Stats */}
                <motion.div variants={fadeInUp}>
                  <Grid container spacing={3} sx={{ mt: 6 }}>
                    {stats.map((stat, index) => (
                      <Grid item xs={6} sm={3} key={index}>
                        <Box textAlign="center">
                          <Typography variant="h4" fontWeight="bold">
                            <CountUp end={stat.number} duration={2} />
                            {stat.suffix}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stat.label}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -20,
                        left: -20,
                        right: 20,
                        bottom: 20,
                        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.main, 0.3)})`,
                        borderRadius: 4,
                        filter: 'blur(40px)'
                      }
                    }}
                  >
                    <Paper
                      elevation={10}
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src="https://via.placeholder.com/600x400/8B5CF6/FFFFFF?text=Dashboard+Preview"
                        alt="Dashboard Preview"
                        style={{
                          width: '100%',
                          borderRadius: theme.spacing(2)
                        }}
                      />
                    </Paper>
                  </Box>
                </motion.div>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" sx={{ py: 10, background: alpha(theme.palette.background.default, 0.5) }}>
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Typography
                variant="h2"
                textAlign="center"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 'bold'
                }}
              >
                مميزات لا محدودة
              </Typography>
              <Typography
                variant="h6"
                textAlign="center"
                color="text.secondary"
                sx={{ mb: 8 }}
              >
                كل ما تحتاجه لإدارة عملك في مكان واحد
              </Typography>
            </motion.div>

            <Grid container spacing={4}>
              {features.map((feature, index) => {
                const [ref, inView] = useInView({
                  threshold: 0.1,
                  triggerOnce: true
                });

                return (
                  <Grid item xs={12} sm={6} md={3} key={index} ref={ref}>
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -10 }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          background: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: `0 20px 40px ${alpha(feature.color, 0.2)}`,
                            border: `1px solid ${alpha(feature.color, 0.3)}`
                          }
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 4 }}>
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 3,
                              background: `linear-gradient(45deg, ${alpha(feature.color, 0.1)}, ${alpha(feature.color, 0.2)})`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 3,
                              color: feature.color
                            }}
                          >
                            {feature.icon}
                          </Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box id="pricing" sx={{ py: 10 }}>
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Typography
                variant="h2"
                textAlign="center"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 'bold'
                }}
              >
                أسعار تناسب الجميع
              </Typography>
              <Typography
                variant="h6"
                textAlign="center"
                color="text.secondary"
                sx={{ mb: 8 }}
              >
                اختر الباقة المناسبة لحجم عملك
              </Typography>
            </motion.div>

            <Grid container spacing={4} alignItems="stretch">
              {pricingPlans.map((plan, index) => {
                const [ref, inView] = useInView({
                  threshold: 0.1,
                  triggerOnce: true
                });

                return (
                  <Grid item xs={12} sm={6} md={3} key={index} ref={ref}>
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -10, scale: 1.02 }}
                      style={{ height: '100%' }}
                    >
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          background: plan.recommended 
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`
                            : alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                          border: plan.recommended 
                            ? `2px solid ${theme.palette.primary.main}`
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {plan.recommended && (
                          <Chip
                            label="الأكثر شعبية"
                            color="primary"
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -12,
                              left: '50%',
                              transform: 'translateX(-50%)'
                            }}
                          />
                        )}
                        
                        <CardContent sx={{ p: 4, flexGrow: 1 }}>
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            textAlign="center"
                            gutterBottom
                            color={plan.color}
                          >
                            {plan.name}
                          </Typography>
                          
                          <Box sx={{ textAlign: 'center', my: 3 }}>
                            {plan.price === 'مخصص' ? (
                              <Typography variant="h3" fontWeight="bold">
                                {plan.price}
                              </Typography>
                            ) : (
                              <>
                                <Typography variant="h3" fontWeight="bold">
                                  {plan.price}
                                  <Typography component="span" variant="h6" color="text.secondary">
                                    {' '}جنيه
                                  </Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {plan.duration}
                                </Typography>
                              </>
                            )}
                          </Box>

                          <List>
                            {plan.features.map((feature, i) => (
                              <ListItem key={i} sx={{ px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <Check sx={{ color: plan.color }} />
                                </ListItemIcon>
                                <ListItemText primary={feature} />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>

                        <Box sx={{ p: 3, pt: 0 }}>
                          <Button
                            fullWidth
                            variant={plan.recommended ? 'contained' : 'outlined'}
                            size="large"
                            onClick={() => navigate('/signup')}
                            sx={{
                              py: 1.5,
                              background: plan.recommended 
                                ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                                : 'transparent'
                            }}
                          >
                            {plan.price === 'مخصص' ? 'اتصل بنا' : 'ابدأ الآن'}
                          </Button>
                        </Box>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box id="how-it-works" sx={{ py: 10, background: alpha(theme.palette.background.default, 0.5) }}>
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Typography
                variant="h2"
                textAlign="center"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 'bold'
                }}
              >
                كيف يعمل؟
              </Typography>
              <Typography
                variant="h6"
                textAlign="center"
                color="text.secondary"
                sx={{ mb: 8 }}
              >
                ابدأ رحلتك معنا في 4 خطوات بسيطة
              </Typography>
            </motion.div>

            <Grid container spacing={4}>
              {steps.map((step, index) => {
                const [ref, inView] = useInView({
                  threshold: 0.1,
                  triggerOnce: true
                });

                return (
                  <Grid item xs={12} sm={6} md={3} key={index} ref={ref}>
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                    >
                      <Box textAlign="center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring' }}
                        >
                          <Avatar
                            sx={{
                              width: 100,
                              height: 100,
                              mx: 'auto',
                              mb: 3,
                              fontSize: '2rem',
                              fontWeight: 'bold',
                              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                            }}
                          >
                            {step.number}
                          </Avatar>
                        </motion.div>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </Box>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box sx={{ py: 10 }}>
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Typography
                variant="h2"
                textAlign="center"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 'bold'
                }}
              >
                ماذا يقول عملاؤنا
              </Typography>
              <Typography
                variant="h6"
                textAlign="center"
                color="text.secondary"
                sx={{ mb: 8 }}
              >
                آراء حقيقية من عملاء حقيقيين
              </Typography>
            </motion.div>

            <Grid container spacing={4}>
              {testimonials.map((testimonial, index) => {
                const [ref, inView] = useInView({
                  threshold: 0.1,
                  triggerOnce: true
                });

                return (
                  <Grid item xs={12} md={4} key={index} ref={ref}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card
                        sx={{
                          p: 4,
                          height: '100%',
                          background: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                      >
                        <Stack spacing={2}>
                          <Rating value={testimonial.rating} readOnly />
                          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                            "{testimonial.comment}"
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              {testimonial.avatar}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {testimonial.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {testimonial.role}
                              </Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <Box textAlign="center">
              <motion.div variants={fadeInUp}>
                <Typography
                  variant="h2"
                  sx={{
                    mb: 3,
                    fontSize: { xs: '2rem', md: '3rem' },
                    fontWeight: 'bold',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  ابدأ رحلتك معنا اليوم
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 5 }}>
                  انضم لآلاف الأعمال الناجحة التي تستخدم Clients+
                </Typography>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                  sx={{ maxWidth: 600, mx: 'auto' }}
                >
                  <TextField
                    fullWidth
                    placeholder="أدخل بريدك الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)'
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/signup')}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      px: 4,
                      py: 2,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ابدأ التجربة المجانية
                  </Button>
                </Stack>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Stack
                  direction="row"
                  spacing={4}
                  justifyContent="center"
                  sx={{ mt: 6 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Check sx={{ color: 'success.main' }} />
                    <Typography variant="body2">14 يوم تجربة مجانية</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Check sx={{ color: 'success.main' }} />
                    <Typography variant="body2">بدون بطاقة ائتمان</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Check sx={{ color: 'success.main' }} />
                    <Typography variant="body2">إلغاء في أي وقت</Typography>
                  </Stack>
                </Stack>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 6,
          background: theme.palette.background.paper,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Container>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Clients+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                منصة إدارة الأعمال الشاملة للصالونات والعيادات والسبا
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" gutterBottom>المنتج</Typography>
              <Stack spacing={1}>
                <Button size="small" color="inherit">المميزات</Button>
                <Button size="small" color="inherit">الأسعار</Button>
                <Button size="small" color="inherit">التكاملات</Button>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" gutterBottom>الشركة</Typography>
              <Stack spacing={1}>
                <Button size="small" color="inherit">عن الشركة</Button>
                <Button size="small" color="inherit">المدونة</Button>
                <Button size="small" color="inherit">الوظائف</Button>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" gutterBottom>الدعم</Typography>
              <Stack spacing={1}>
                <Button size="small" color="inherit">مركز المساعدة</Button>
                <Button size="small" color="inherit">اتصل بنا</Button>
                <Button size="small" color="inherit">الخصوصية</Button>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" gutterBottom>تابعنا</Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" color="inherit">
                  <Star />
                </IconButton>
                <IconButton size="small" color="inherit">
                  <Star />
                </IconButton>
                <IconButton size="small" color="inherit">
                  <Star />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6, pt: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              © 2024 Clients+. جميع الحقوق محفوظة.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Scroll to top indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{
          position: 'fixed',
          bottom: theme.spacing(4),
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <KeyboardArrowDown sx={{ fontSize: 30, color: alpha(theme.palette.text.primary, 0.5) }} />
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default LandingPage;