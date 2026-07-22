import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, Shield, DollarSign, AlertCircle,
  FileCheck, ExternalLink, Search, ChevronRight, CircleDot,
  CircleCheck, CircleX, PenLine, CircleAlert, Stamp, Ban,
  BookOpen, HelpCircle, Menu, Phone, Mail, MessageCircle, Clock3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getCreditStudyCosts } from '@/services/config';
import StartApplicationDialog from '@/components/application/StartApplicationDialog';

/** Anclas de navegación — coinciden con los id de cada sección */
const NAV_LINKS = [
  { label: 'Planes',     href: '#planes'     },
  { label: 'Requisitos', href: '#requisitos' },
  { label: 'Proceso',    href: '#proceso'    },
  { label: 'Guía',       href: '#guia'       },
  { label: 'Contacto',   href: '#contacto'   },
];

export default function LandingPage() {
  const [creditStudyCost, setCreditStudyCost] = useState<number | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function loadCreditStudyCost() {
      try {
        const costs = await getCreditStudyCosts();
        const currentYearCost = costs.find(cost => cost.year === currentYear);
        if (currentYearCost) {
          setCreditStudyCost(currentYearCost.amount);
        }
      } catch (error) {
        console.error('Error al cargar el costo del estudio de crédito educativo:', error);
      }
    }
    loadCreditStudyCost();
  }, [currentYear]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <a href="#" className="flex items-center shrink-0">
              <img
                src="https://miaoda-conversation-file.s3cdn.medo.dev/user-8u8uo5llzbwg/20260509/file-bia1hxjy835s.png"
                alt="CrediNOVA Logo"
                className="h-10 md:h-14 w-auto"
              />
            </a>

            {/* Navegación desktop */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Botones CTA desktop */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <Link to="/solicitud/consultar">
                <Button variant="outline" size="sm">
                  Consultar Solicitud
                </Button>
              </Link>
              <Button size="sm" onClick={() => setShowStartDialog(true)}>
                Solicitar Crédito
              </Button>
            </div>

            {/* Hamburguesa móvil */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 text-foreground"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 pt-10">
                <nav className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-3 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                  <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                    <Button
                      className="w-full"
                      onClick={() => { setMobileMenuOpen(false); setShowStartDialog(true); }}
                    >
                      Solicitar Crédito
                    </Button>
                    <Link to="/solicitud/consultar" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Consultar Solicitud
                      </Button>
                    </Link>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section
        className="text-white py-16 md:py-24"
        style={{ background: 'linear-gradient(135deg, #0d3d1e 0%, #1a5c30 45%, #c45e10 80%, #e07820 100%)' }}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-balance mb-6">
              Financia tu educación con Credi<span style={{ color: '#f07820' }}>NOVA</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90 text-pretty">{"Gestiona online tu proceso de crédito educativo. Solicítalo ahora de forma rápida y segura."}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full sm:w-auto"
                onClick={() => setShowStartDialog(true)}
              >{"Solicitar Crédito Educativo"}</Button>
              <Link to="/solicitud/consultar">
                <Button size="lg" variant="ghost" className="w-full sm:w-auto border border-white/60 text-white hover:bg-white/10">
                  <FileText className="mr-2 h-5 w-5" />
                  Consultar Solicitud
                </Button>
              </Link>
            </div>
            <div className="mt-4 text-center">

            </div>
          </div>
        </div>
      </section>
      {/* Planes de Crédito */}
      <section id="planes" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-balance mb-4">{"Solicitar Crédito Educativo"}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Elige el plan que mejor se adapte a tus necesidades financieras
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Plan 50/50 */}
            <Card className="h-full flex flex-col border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl text-balance">Plan 50/50</CardTitle>
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Corto Plazo
                  </div>
                </div>
                <CardDescription className="text-base text-pretty">
                  Ideal para quienes pueden realizar un pago inicial mayor
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-pretty">Cuota inicial del <strong>50%</strong> del valor del semestre</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-pretty">Máximo <strong>2 cuotas</strong> para el saldo restante</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-pretty"><strong>Sin intereses</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-pretty">Proceso de aprobación más rápido</span>
                  </li>
                </ul>
                <Link to="/solicitud/nueva" className="mt-auto">
                  <Button className="w-full" variant="outline">
                    Solicitar Plan 50/50
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plan 20/80 */}
            <Card className="h-full flex flex-col border-2 hover:border-secondary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl text-balance">Plan 20/80</CardTitle>
                  <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">
                    Mediano Plazo
                  </div>
                </div>
                <CardDescription className="text-base text-pretty">
                  Mayor flexibilidad en el pago inicial
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-pretty">Cuota inicial del <strong>20%</strong> del valor del semestre</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-pretty">Máximo <strong>3 cuotas</strong> para el saldo restante</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-pretty">Con tasa de interés competitiva</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-pretty">Mayor capacidad de financiamiento</span>
                  </li>
                </ul>
                <Link to="/solicitud/nueva" className="mt-auto">
                  <Button className="w-full" variant="outline">
                    Solicitar Plan 20/80
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Información Importante */}
      <section id="requisitos" className="py-16 md:py-24" style={{ backgroundColor: '#f07820' }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-balance mb-8 text-center text-white">{"Información y Requisitos"}</h2>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-balance">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                    Costo del Estudio de Crédito {currentYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty mb-2">
                    {creditStudyCost !== null ? (
                      <>
                        El valor del estudio de crédito educativo para el año {currentYear} es de{' '}
                        <span className="font-semibold">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(creditStudyCost)}
                        </span>
                        .
                      </>
                    ) : (
                      'Cargando información del costo del estudio de crédito educativo...'
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    <strong>Importante:</strong> Este valor NO es reembolsable en caso de que el crédito educativo no sea aprobado.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-balance">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Sanciones por Mora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty">
                    Si las cuotas NO se cancelan en los primeros 5 días del mes, se aplicará una sanción del 10% sobre el valor de cada cuota.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-balance">
                    <Shield className="h-5 w-5 text-orange-500" />
                    Política de Deserción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-pretty">
                    En caso de deserción pasadas 2 semanas del inicio del semestre, se debe cancelar la totalidad del crédito educativo.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-balance">
                    <FileCheck className="h-5 w-5 text-orange-500" />
                    Requisitos del Proceso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-pretty">
                    <li>Número de cédula del estudiante y deudor solidario</li>
                    <li>Recibo de pago del estudio de crédito educativo</li>
                    <li>Foto de identificación (solo al firmar el pagaré)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3 text-pretty">
                    <strong>No se requiere presentar documentos físicos.</strong> El proceso es 100% online.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-balance">
                    <ExternalLink className="h-5 w-5 text-orange-500" />
                    Otras Opciones de Financiación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium mb-1">Valcredit</p>
                      <a 
                        href="https://cotecnova.edu.co/index.php/credito-educativo/#tab-id-3" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Más información sobre Valcredit →
                      </a>
                    </div>
                    <div>
                      <p className="font-medium mb-1">ICETEX</p>
                      <a 
                        href="https://cotecnova.edu.co/index.php/credito-educativo/#tab-id-4" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Más información sobre ICETEX →
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Proceso */}
      <section id="proceso" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-balance mb-4">Proceso Simple y Transparente</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Sigue estos pasos para obtener tu crédito educativo
            </p>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg max-w-3xl mx-auto">
              <p className="text-base font-medium text-primary">
                ✨ <strong>Proceso 100% Online - Sin Presentar Documentos</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2 text-pretty">
                Solo necesitas tu cédula y la del deudor solidario. La foto de identificación será solicitada únicamente al momento de firmar el pagaré.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-balance">1. Solicita</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Completa el formulario en línea con tus datos y los del deudor solidario
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-balance">2. Revisión</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Nuestro equipo valida tu información y referencias en un plazo de 3 a 5 días hábiles
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-balance">3. Aprobación</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Recibe la aprobación y el plan de pagos personalizado
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-balance">4. Firma</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Firma las garantías y recibe tu autorización de matrícula
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ── Guía / Instructivo ── */}
      <section id="guia" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Encabezado de sección */}
            <div className="flex items-start gap-4 mb-10">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-balance mb-2">Guía del Proceso</h2>
                <p className="text-muted-foreground text-pretty">
                  Todo lo que necesitas saber: cómo solicitar tu crédito, cómo consultar el estado de tu solicitud
                  y qué información encontrarás en cada etapa del proceso.
                </p>
              </div>
            </div>

            {/* Tabs: Cómo Solicitar / Cómo Consultar / Estados */}
            <Tabs defaultValue="solicitar" className="w-full">
              <TabsList className="w-full mb-8 h-auto flex flex-col sm:flex-row gap-1 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="solicitar" className="flex-1 py-2.5 text-sm">
                  <FileText className="h-4 w-4 mr-2 shrink-0" />
                  Cómo Solicitar
                </TabsTrigger>
                <TabsTrigger value="consultar" className="flex-1 py-2.5 text-sm">
                  <Search className="h-4 w-4 mr-2 shrink-0" />
                  Cómo Consultar
                </TabsTrigger>
                <TabsTrigger value="estados" className="flex-1 py-2.5 text-sm">
                  <CircleDot className="h-4 w-4 mr-2 shrink-0" />
                  Estados de la Solicitud
                </TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Cómo Solicitar ────────────────────────────── */}
              <TabsContent value="solicitar" className="mt-0">
                <div className="space-y-4">
                  <p className="text-muted-foreground text-pretty text-sm mb-6">
                    El proceso de solicitud es completamente en línea. Sigue estos pasos detallados para completar
                    tu solicitud de crédito educativo sin inconvenientes.
                  </p>

                  <Accordion type="multiple" className="space-y-2">
                    {/* Paso 1 */}
                    <AccordionItem value="paso-1" className="border rounded-lg px-5 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0">1</span>
                          <span className="font-medium text-sm">Pagar el Estudio de Crédito Educativo</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="ml-10 space-y-2 text-sm text-muted-foreground text-pretty">
                          <p>Antes de iniciar la solicitud en línea, debes cancelar el valor del estudio de crédito educativo vigente para el año en curso.</p>
                          <ul className="space-y-1.5 mt-2">
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Acércate a caja o realiza el pago por los canales autorizados por la institución.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Guarda el comprobante de pago: necesitarás el <strong>número de recibo</strong> y la <strong>fecha de pago</strong>.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span className="font-medium text-foreground">Este valor NO es reembolsable si el crédito no es aprobado.</span></li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Paso 2 */}
                    <AccordionItem value="paso-2" className="border rounded-lg px-5 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0">2</span>
                          <span className="font-medium text-sm">Iniciar la Solicitud en Línea</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="ml-10 space-y-2 text-sm text-muted-foreground text-pretty">
                          <p>Haz clic en el botón <strong>"Solicitar Crédito Educativo"</strong> en la parte superior de esta página y elige el plan que más se ajusta a tu situación:</p>
                          <ul className="space-y-1.5 mt-2">
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span><strong>Plan 50/50:</strong> Pagas el 50% al inicio del semestre y el resto en máximo 2 cuotas. Sin intereses.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span><strong>Plan 20/80:</strong> Pagas el 20% al inicio y el resto en máximo 3 cuotas, con tasa de interés.</span></li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Paso 3 */}
                    <AccordionItem value="paso-3" className="border rounded-lg px-5 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0">3</span>
                          <span className="font-medium text-sm">Completar el Formulario</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="ml-10 space-y-2 text-sm text-muted-foreground text-pretty">
                          <p>El formulario se divide en varias secciones. Ten a la mano la siguiente información:</p>
                          <div className="grid md:grid-cols-2 gap-4 mt-3">
                            <div className="space-y-1.5">
                              <p className="font-medium text-foreground text-xs uppercase tracking-wide">Datos del Estudiante</p>
                              <ul className="space-y-1">
                                {['Número y fecha de expedición de cédula o TI', 'Fecha de nacimiento', 'Dirección, barrio, ciudad y departamento', 'Teléfono y correo electrónico', 'Programa académico y semestre'].map(item => (
                                  <li key={item} className="flex items-start gap-1.5"><ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><span className="text-xs">{item}</span></li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1.5">
                              <p className="font-medium text-foreground text-xs uppercase tracking-wide">Datos del Deudor Solidario</p>
                              <ul className="space-y-1">
                                {['Datos personales completos', 'Información laboral o de ingresos', 'Referencias familiares y personales', 'Datos de cónyuge (si aplica)'].map(item => (
                                  <li key={item} className="flex items-start gap-1.5"><ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><span className="text-xs">{item}</span></li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <p className="mt-3 text-xs bg-primary/5 rounded px-3 py-2 border border-primary/10">
                            <strong>Tip:</strong> Si necesitas salir antes de terminar, puedes guardar un borrador. El sistema te generará un <strong>código de borrador</strong> que puedes usar para recuperar y continuar tu solicitud más tarde.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Paso 4 */}
                    <AccordionItem value="paso-4" className="border rounded-lg px-5 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0">4</span>
                          <span className="font-medium text-sm">Enviar la Solicitud</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="ml-10 space-y-2 text-sm text-muted-foreground text-pretty">
                          <p>Antes de enviar, revisa que todos los datos sean correctos. Al confirmar el envío:</p>
                          <ul className="space-y-1.5 mt-2">
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>El sistema genera un <strong>código único de solicitud</strong> (ej: <code className="bg-muted px-1 rounded text-xs">ABC123</code>). Guárdalo con tu número de documento.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>La solicitud pasa al estado <strong>En Revisión</strong> y el equipo de CrediNOVA comenzará a evaluarla.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>El tiempo de revisión es de <strong>3 a 5 días hábiles</strong>. Consulta el estado en cualquier momento usando el botón "Consultar Solicitud".</span></li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Paso 5 */}
                    <AccordionItem value="paso-5" className="border rounded-lg px-5 overflow-hidden">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="bg-primary text-primary-foreground text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0">5</span>
                          <span className="font-medium text-sm">Firma Digital y Autorización de Matrícula</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="ml-10 space-y-2 text-sm text-muted-foreground text-pretty">
                          <p>Una vez aprobada la solicitud y realizado el pago de la cuota inicial, recibirás el acceso para firmar digitalmente el pagaré y garantías:</p>
                          <ul className="space-y-1.5 mt-2">
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>El proceso de firma es <strong>100% digital</strong> mediante la plataforma ZapSign.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Necesitarás tomarte una <strong>foto de tu cédula por ambas caras</strong> y una <strong>selfie</strong> sosteniendo la cédula. Asegúrate de tener buena iluminación.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>El deudor solidario también recibirá su enlace de firma por separado.</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>Al completar las firmas, el estado pasará a <strong>Matrícula Autorizada</strong> y podrás presentarte a Registro.</span></li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* ── Tab 2: Cómo Consultar ────────────────────────────── */}
              <TabsContent value="consultar" className="mt-0">
                <div className="space-y-6">
                  <p className="text-muted-foreground text-pretty text-sm">
                    Puedes verificar el estado de tu solicitud en cualquier momento usando el botón
                    <strong> "Consultar Solicitud"</strong> de esta página. Solo necesitas dos datos.
                  </p>

                  {/* Pasos de consulta */}
                  <div className="relative pl-8 space-y-8">
                    {/* Línea vertical */}
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />

                    {[
                      {
                        icon: <Search className="h-4 w-4 text-primary" />,
                        title: 'Accede a "Consultar Solicitud"',
                        body: 'Haz clic en el botón "Consultar Solicitud" en la parte superior de esta página o en el menú de navegación.',
                      },
                      {
                        icon: <FileText className="h-4 w-4 text-primary" />,
                        title: 'Ingresa tu Código y Documento',
                        body: <>
                          Debes ingresar:
                          <ul className="mt-2 space-y-1">
                            <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><span><strong>Código de solicitud:</strong> código de 6 caracteres que recibiste al enviar la solicitud (ej: <code className="bg-muted px-1 rounded text-xs">ABC123</code>).</span></li>
                            <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /><span><strong>Número de documento:</strong> el número de cédula o TI del estudiante registrado en la solicitud.</span></li>
                          </ul>
                        </>,
                      },
                      {
                        icon: <CircleDot className="h-4 w-4 text-primary" />,
                        title: 'Visualiza la Información de tu Solicitud',
                        body: 'Se mostrará una página con el estado actual de tu solicitud, el detalle de la información registrada y, si fue aprobada, el plan de pagos con las fechas y montos de cada cuota.',
                      },
                      {
                        icon: <CheckCircle className="h-4 w-4 text-primary" />,
                        title: '¿Perdiste el Código?',
                        body: <>
                          Si guardaste un borrador, puedes recuperarlo con el <strong>código de borrador</strong> usando la opción "Recuperar Borrador". Si ya enviaste la solicitud y no recuerdas el código, comunícate con la oficina de crédito educativo de Cotecnova.
                        </>,
                      },
                    ].map((step, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-8 bg-background border-2 border-primary/30 w-7 h-7 rounded-full flex items-center justify-center">
                          {step.icon}
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-foreground">{step.title}</p>
                          <div className="text-sm text-muted-foreground text-pretty">{step.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    <Link to="/solicitud/consultar">
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Consultar mi Solicitud Ahora
                      </Button>
                    </Link>
                  </div>
                </div>
              </TabsContent>

              {/* ── Tab 3: Estados ───────────────────────────────────── */}
              <TabsContent value="estados" className="mt-0">
                <div className="space-y-4">
                  <p className="text-muted-foreground text-pretty text-sm mb-6">
                    Cada estado indica en qué etapa del proceso se encuentra tu solicitud y qué información
                    encontrarás al consultarla. Presta atención especialmente a los estados que requieren
                    acción de tu parte.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        status: 'Borrador',
                        badge: 'bg-zinc-500',
                        icon: <PenLine className="h-5 w-5 text-zinc-500 shrink-0" />,
                        action: false,
                        desc: 'Iniciaste la solicitud pero no la has enviado todavía. La información está guardada temporalmente.',
                        details: [
                          'Al consultar verás los datos que llenaste hasta el momento.',
                          'Puedes recuperar el borrador usando el código de borrador que se generó al guardar.',
                          'Los borradores pueden expirar si pasa mucho tiempo sin enviar.',
                          'Para enviar la solicitud, accede al borrador y completa el proceso de envío.',
                        ],
                      },
                      {
                        status: 'En Revisión',
                        badge: 'bg-blue-500',
                        icon: <Clock className="h-5 w-5 text-blue-500 shrink-0" />,
                        action: false,
                        desc: 'Tu solicitud fue enviada exitosamente. El equipo de CrediNOVA la está evaluando.',
                        details: [
                          'El equipo verifica la información del estudiante y del deudor solidario.',
                          'Se validan las referencias y la información laboral/económica.',
                          'El tiempo de revisión es de 3 a 5 días hábiles.',
                          'No necesitas hacer nada en este momento; solo espera la respuesta.',
                        ],
                      },
                      {
                        status: 'Requiere Ajustes',
                        badge: 'bg-yellow-500',
                        icon: <CircleAlert className="h-5 w-5 text-yellow-600 shrink-0" />,
                        action: true,
                        actionLabel: 'Requiere tu atención',
                        desc: 'El equipo revisó la solicitud y necesita que corrijas o completes alguna información.',
                        details: [
                          'Al consultar la solicitud verás el detalle de los ajustes solicitados.',
                          'Comunícate con la oficina de crédito educativo para hacer las correcciones necesarias.',
                          'Una vez corregida, la solicitud vuelve a estado "En Revisión".',
                        ],
                      },
                      {
                        status: 'Aprobado',
                        badge: 'bg-green-500',
                        icon: <CircleCheck className="h-5 w-5 text-green-600 shrink-0" />,
                        action: true,
                        actionLabel: 'Requiere pago de cuota inicial',
                        desc: '¡Felicitaciones! Tu crédito educativo fue aprobado. Debes realizar el pago de la cuota inicial.',
                        details: [
                          'Al consultar verás el plan de pagos completo con la tabla de amortización.',
                          'Verás el valor exacto de la cuota inicial que debes pagar.',
                          'Encontrarás el calendario de fechas y montos de cada cuota mensual.',
                          'Podrás agregar las fechas de pago a tu calendario (Google Calendar o iPhone).',
                          'Una vez realizado el pago inicial, notifícalo en la oficina de crédito para avanzar al proceso de firma.',
                        ],
                      },
                      {
                        status: 'Pendiente Firma',
                        badge: 'bg-purple-500',
                        icon: <FileCheck className="h-5 w-5 text-purple-600 shrink-0" />,
                        action: true,
                        actionLabel: 'Requiere firma digital',
                        desc: 'La cuota inicial fue registrada. Debes firmar digitalmente el pagaré y las garantías.',
                        details: [
                          'Al consultar verás el enlace para acceder a la plataforma ZapSign y firmar.',
                          'Necesitarás foto de tu cédula por ambas caras y una selfie sosteniéndola.',
                          'El deudor solidario también debe firmar; recibirá su propio enlace.',
                          'Asegúrate de tener buena iluminación para las fotos de identificación.',
                          'El proceso de firma es completamente digital; no necesitas presentarte.',
                        ],
                      },
                      {
                        status: 'Matrícula Autorizada',
                        badge: 'bg-primary',
                        icon: <Stamp className="h-5 w-5 text-primary shrink-0" />,
                        action: true,
                        actionLabel: 'Preséntate a Registro',
                        desc: 'El proceso está completo. Las garantías fueron firmadas y tienes autorización para formalizar tu matrícula.',
                        details: [
                          'Al consultar verás el documento de Matrícula Financiera que acredita la autorización.',
                          'Preséntate en la oficina de Registro y Admisiones con tu documento de identidad.',
                          'Puedes descargar e imprimir el documento de Matrícula Financiera si lo necesitas.',
                          'Recuerda cumplir con las fechas de pago establecidas en el plan de pagos.',
                        ],
                      },
                      {
                        status: 'Rechazado',
                        badge: 'bg-red-500',
                        icon: <CircleX className="h-5 w-5 text-red-500 shrink-0" />,
                        action: false,
                        desc: 'La solicitud fue evaluada y no cumplió con los criterios de aprobación del crédito educativo.',
                        details: [
                          'Al consultar verás el motivo por el cual fue rechazada la solicitud.',
                          'El valor del estudio de crédito no es reembolsable.',
                          'Puedes explorar otras opciones de financiación como Valcredit o ICETEX.',
                          'Si crees que hubo un error, comunícate con la oficina de crédito educativo.',
                        ],
                      },
                      {
                        status: 'Cancelado',
                        badge: 'bg-rose-900',
                        icon: <Ban className="h-5 w-5 text-rose-800 shrink-0" />,
                        action: false,
                        desc: 'La solicitud fue cancelada, ya sea por solicitud del estudiante o por decisión administrativa.',
                        details: [
                          'Al consultar verás la información registrada al momento de la cancelación.',
                          'Si la cancelación fue un error, comunícate con la oficina de crédito educativo.',
                        ],
                      },
                    ].map((item) => (
                      <Card key={item.status} className="overflow-hidden">
                        <CardContent className="p-0">
                          {/* Cabecera del estado */}
                          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                            {item.icon}
                            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                              <span className="font-semibold text-sm text-balance">{item.status}</span>
                              <span className={`inline-flex text-white text-xs px-2 py-0.5 rounded-full font-medium ${item.badge}`}>
                                {item.status}
                              </span>
                              {item.action && item.actionLabel && (
                                <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                                  {item.actionLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* Cuerpo */}
                          <div className="px-5 py-4 space-y-3">
                            <p className="text-sm text-muted-foreground text-pretty">{item.desc}</p>
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-foreground uppercase tracking-wide">Qué encontrarás al consultar:</p>
                              <ul className="space-y-1">
                                {item.details.map((d, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span className="text-pretty">{d}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Preguntas frecuentes rápidas */}
            <div className="mt-12 pt-10 border-t border-border">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                <h3 className="font-semibold text-base">Preguntas Frecuentes</h3>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {[
                  {
                    q: '¿Puedo solicitar el crédito si ya tengo una solicitud rechazada?',
                    a: 'Sí, puedes presentar una nueva solicitud en un período académico diferente. Recuerda que deberás pagar nuevamente el valor del estudio de crédito.',
                  },
                  {
                    q: '¿El deudor solidario puede ser un familiar?',
                    a: 'Sí, el deudor solidario puede ser un familiar mayor de edad (padres, hermanos, tíos, etc.) o cualquier persona que cumpla con los requisitos económicos establecidos.',
                  },
                  {
                    q: '¿Qué pasa si no pago una cuota a tiempo?',
                    a: 'Si las cuotas no se cancelan en los primeros 5 días del mes, se aplica una sanción del 10% sobre el valor de la cuota en mora. Adicionalmente, el incumplimiento puede afectar futuros procesos de crédito.',
                  },
                  {
                    q: '¿Cuánto tiempo tengo para firmar el pagaré una vez aprobado?',
                    a: 'El plazo es definido por la institución según el calendario académico. Te recomendamos realizar las firmas lo antes posible para no retrasar tu proceso de matrícula.',
                  },
                  {
                    q: '¿Puedo cambiar de plan (50/50 a 20/80 o viceversa) después de enviar la solicitud?',
                    a: 'No es posible cambiar el plan una vez enviada la solicitud. Si necesitas un plan diferente, deberás cancelar la solicitud actual e iniciar una nueva.',
                  },
                ].map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-5 overflow-hidden">
                    <AccordionTrigger className="hover:no-underline py-4 text-left text-sm font-medium">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <p className="text-sm text-muted-foreground text-pretty">{item.a}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer id="contacto" className="bg-primary text-primary-foreground mt-auto">
        {/* Banda de contacto */}
        <div className="border-b border-primary-foreground/15">
          <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

              {/* WhatsApp */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <MessageCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60 mb-1">WhatsApp</p>
                  <a
                    href="https://wa.me/573154338604"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-foreground hover:text-primary-foreground/80 transition-colors"
                  >
                    (+57) 315 433 8604
                  </a>
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <Phone className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60 mb-1">Teléfono</p>
                  <p className="text-sm font-medium text-primary-foreground">
                    (602) 213 4421 <span className="text-primary-foreground/70 font-normal">Ext. 104</span>
                  </p>
                </div>
              </div>

              {/* Correo */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <Mail className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60 mb-1">Correo</p>
                  <a
                    href="mailto:credinova@cotecnova.edu.co"
                    className="text-sm font-medium text-primary-foreground hover:text-primary-foreground/80 transition-colors break-all"
                  >
                    credinova@cotecnova.edu.co
                  </a>
                </div>
              </div>

              {/* Horario */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <Clock3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60 mb-1">Horario de Atención</p>
                  <p className="text-sm text-primary-foreground leading-relaxed">
                    Lun–Vie: 8 am – 12 m y 2 pm – 7 pm
                  </p>
                  <p className="text-sm text-primary-foreground leading-relaxed">
                    Sábados: 8 am – 12 m
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Banda inferior: logo + derechos + enlace admin */}
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img
              src="https://miaoda-edit-image.s3cdn.medo.dev/bia2hvw84flt/IMG-bitn54l08o3k.png"
              alt="CrediNOVA Icono"
              className="h-14 w-auto"
              data-editor-config="%7B%22defaultSrc%22%3A%22https%3A%2F%2Fmiaoda-edit-image.s3cdn.medo.dev%2Fbia2hvw84flt%2FIMG-bitn54l08o3k.png%22%7D"
            />
            <div className="text-center sm:text-right space-y-1">
              <p className="text-sm text-primary-foreground/80 font-medium">
                Corporación de Estudios Tecnológicos del Norte del Valle
              </p>
              <p className="text-xs text-primary-foreground/55">
                © {currentYear} Todos los derechos reservados.
              </p>
              <a
                href="/admin/login"
                className="inline-block text-xs text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
              >
                Acceso Panel Administrativo
              </a>
            </div>
          </div>
        </div>
      </footer>
      {/* Diálogo de inicio de solicitud */}
      <StartApplicationDialog 
        open={showStartDialog}
        onClose={() => setShowStartDialog(false)}
      />
    </div>
  );
}
