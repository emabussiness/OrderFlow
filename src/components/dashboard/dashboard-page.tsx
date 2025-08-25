
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Home, ShoppingCart, Settings, User, ChevronDown, Building, Truck, ShoppingBasket, FileText, ClipboardList, Package, Boxes, Warehouse, Wrench, Receipt, DollarSign, BarChart3, FileDiff, Landmark, BookCopy, HandCoins, ArrowRightLeft, Banknote, HardHat, ListChecks, Hammer, Users, List, Tag, ArrowLeftRight, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import { usePathname } from 'next/navigation';

export function DashboardPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/inventario/stock-actual')) return 'Inventario - Stock Actual';
    if (pathname.startsWith('/inventario/ajustes')) return 'Inventario - Ajustes de Stock';
    if (pathname.startsWith('/inventario/transferencias')) return 'Inventario - Transferencias';
    if (pathname.startsWith('/inventario/informes/movimientos-stock')) return 'Informes - Movimientos de Stock';
    
    const pathParts = pathname.split('/');
    const module = pathParts[1] || '';
    let title = module.charAt(0).toUpperCase() + module.slice(1);
    
    if (pathParts.length > 2) {
      const section = pathParts[2].replace(/-/g, ' ');
      const page = pathParts[3]?.replace(/-/g, ' ') || '';
      const formattedSection = section.charAt(0).toUpperCase() + section.slice(1);
      const formattedPage = page.charAt(0).toUpperCase() + page.slice(1);

      if (formattedPage) {
        title = `${formattedSection} - ${formattedPage}`;
      } else {
        title = formattedSection;
      }
    }
    
    if(module === 'compras') return `Compras - ${title}`;
    if(module === 'servicios') return `Servicios - ${title}`;

    return title;
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold">OrderFlow</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive={pathname === '/'}>
                  <Home />
                  Dashboard
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBasket />
                        <span>Compras</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
              <CollapsibleContent>
                <Collapsible className="ml-4">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="justify-between">
                        <div className="flex items-center gap-2">
                          <FileText />
                          <span>Referenciales</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="ml-4">
                    <SidebarMenu>
                      <SidebarMenuItem><Link href="/compras/referenciales/productos"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/productos')}><Package />Productos</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/categorias"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/categorias')}><Boxes />Categorías</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/proveedores"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/proveedores')}><Truck />Proveedores</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/depositos"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/depositos')}><Warehouse />Depósitos</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/sucursales"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/sucursales')}><Building />Sucursales</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/unidades-medida"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/unidades-medida')}><FileText />Unidades de Medida</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/tipos-documento"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/tipos-documento')}><FileText />Tipos de Documento</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/formas-pago"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/formas-pago')}><DollarSign />Formas de Pago</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/referenciales/bancos"><SidebarMenuButton isActive={pathname.startsWith('/compras/referenciales/bancos')}><Landmark />Bancos</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible className="ml-4">
                   <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardList />
                          <span>Movimientos</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="ml-4">
                    <SidebarMenu>
                      <SidebarMenuItem><Link href="/compras/pedidos"><SidebarMenuButton isActive={pathname.startsWith('/compras/pedidos')}>Pedido</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/presupuestos"><SidebarMenuButton isActive={pathname.startsWith('/compras/presupuestos')}>Presupuesto proveedor</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/ordenes"><SidebarMenuButton isActive={pathname.startsWith('/compras/ordenes')}>Orden de compra</SidebarMenuButton></Link></SidebarMenuItem>
                      
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible className="ml-4">
                   <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt />
                          <span>Registros</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="ml-4">
                    <SidebarMenu>
                      <SidebarMenuItem><Link href="/compras/registros"><SidebarMenuButton isActive={pathname ==='/compras/registros'}>Compras</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/registros/notas-credito-debito"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros/notas-credito-debito')}>Notas de Crédito</SidebarMenuButton></Link></SidebarMenuItem>
                       <SidebarMenuItem><Link href="/compras/registros/notas-debito"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros/notas-debito')}>Notas de Débito</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/registros/cuentas-a-pagar"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros/cuentas-a-pagar')}><HandCoins />Cuentas a Pagar</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/registros/pagos"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros/pagos')}><Banknote />Pagos a Proveedores</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/compras/registros/libro-iva-compras"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros/libro-iva-compras')}><BookCopy />Libro IVA Compras</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
                 <Collapsible className="ml-4">
                   <SidebarMenuItem>
                    <Link href="/compras/informes">
                        <SidebarMenuButton className="justify-between" isActive={pathname.startsWith('/compras/informes')}>
                            <div className="flex items-center gap-2">
                            <BarChart3 />
                            <span>Informes</span>
                            </div>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>
            
            <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <Boxes />
                        <span>Inventario</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
               <CollapsibleContent className="ml-4">
                    <SidebarMenu>
                      <SidebarMenuItem><Link href="/inventario/stock-actual"><SidebarMenuButton isActive={pathname.startsWith('/inventario/stock-actual')}>Stock Actual</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/inventario/transferencias"><SidebarMenuButton isActive={pathname.startsWith('/inventario/transferencias')}><ArrowLeftRight />Transferencias</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/inventario/ajustes"><SidebarMenuButton isActive={pathname.startsWith('/inventario/ajustes')}><ArrowRightLeft />Ajustes de Stock</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="/inventario/informes/movimientos-stock"><SidebarMenuButton isActive={pathname.startsWith('/inventario/informes/movimientos-stock')}><BarChart3 />Movimientos de Stock</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
            </Collapsible>

             <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench />
                        <span>Servicios</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
               <CollapsibleContent className="ml-4">
                    <Collapsible>
                       <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="justify-between">
                            <div className="flex items-center gap-2">
                              <FileText />
                              <span>Referenciales</span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </SidebarMenuItem>
                      <CollapsibleContent className="ml-4">
                         <SidebarMenu>
                          <SidebarMenuItem><Link href="/servicios/referenciales/clientes"><SidebarMenuButton isActive={pathname.startsWith('/servicios/referenciales/clientes')}><Users/>Clientes</SidebarMenuButton></Link></SidebarMenuItem>
                          <SidebarMenuItem><Link href="/servicios/referenciales/tecnicos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/referenciales/tecnicos')}><User/>Técnicos</SidebarMenuButton></Link></SidebarMenuItem>
                          <SidebarMenuItem><Link href="/servicios/referenciales/marcas"><SidebarMenuButton isActive={pathname.startsWith('/servicios/referenciales/marcas')}><Tag/>Marcas</SidebarMenuButton></Link></SidebarMenuItem>
                          <SidebarMenuItem><Link href="/servicios/referenciales/tipos-equipo"><SidebarMenuButton isActive={pathname.startsWith('/servicios/referenciales/tipos-equipo')}><List/>Tipos de Equipos</SidebarMenuButton></Link></SidebarMenuItem>
                          <SidebarMenuItem><Link href="/servicios/referenciales/servicios"><SidebarMenuButton isActive={pathname.startsWith('/servicios/referenciales/servicios')}><Wrench/>Servicios</SidebarMenuButton></Link></SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                    <SidebarMenu>
                        <SidebarMenuItem><Link href="/servicios/recepcion-equipos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/recepcion-equipos')}>Recepción de Equipos</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/diagnostico"><SidebarMenuButton isActive={pathname.startsWith('/servicios/diagnostico')}>Diagnóstico</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/presupuesto"><SidebarMenuButton isActive={pathname.startsWith('/servicios/presupuesto')}>Presupuesto</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/orden-trabajo"><SidebarMenuButton isActive={pathname.startsWith('/servicios/orden-trabajo')}><HardHat />Orden de Trabajo</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/trabajos-realizados"><SidebarMenuButton isActive={pathname.startsWith('/servicios/trabajos-realizados')}><Hammer />Trabajos Realizados</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/retiro-equipos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/retiro-equipos')}>Retiro de Equipos</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/garantias"><SidebarMenuButton isActive={pathname.startsWith('/servicios/garantias')}><ListChecks/>Garantías</SidebarMenuButton></Link></SidebarMenuItem>
                        <SidebarMenuItem><Link href="/servicios/reclamos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/reclamos')}><FileDiff />Reclamos</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                     <Collapsible>
                       <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 />
                              <span>Informes</span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </SidebarMenuItem>
                      <CollapsibleContent className="ml-4">
                         <SidebarMenu>
                            <SidebarMenuItem><Link href="/servicios/informes/historial-diagnosticos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/informes/historial-diagnosticos')}>Historial de Diagnósticos</SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/servicios/informes/estadisticas-recepcion"><SidebarMenuButton isActive={pathname.startsWith('/servicios/informes/estadisticas-recepcion')}>Estadísticas de Recepción</SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/servicios/informes/analisis-presupuestos"><SidebarMenuButton isActive={pathname.startsWith('/servicios/informes/analisis-presupuestos')}>Análisis de Presupuestos</SidebarMenuButton></Link></SidebarMenuItem>
                            <SidebarMenuItem><Link href="/servicios/informes/analisis-rendimiento"><SidebarMenuButton isActive={pathname.startsWith('/servicios/informes/analisis-rendimiento')}><Clock/>Análisis de Rendimiento</SidebarMenuButton></Link></SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                  </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign />
                        <span>Ventas</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>

            <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt />
                        <span>Facturación</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>
             <Collapsible>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="justify-between">
                      <div className="flex items-center gap-2">
                        <FileDiff />
                        <span>Contabilidad</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/100x100.png" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">Usuario</span>
              <span className="text-xs text-muted-foreground">usuario@email.com</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
          </div>
        </header>
        <main className="flex-1 p-6 bg-muted/20">
            {children}
        </main>
      </SidebarInset>
    </>
  );
}
