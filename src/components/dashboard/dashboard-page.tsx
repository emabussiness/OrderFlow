
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
import { Home, ShoppingCart, Settings, User, ChevronDown, Building, Truck, ShoppingBasket, FileText, ClipboardList, Package, Boxes, Warehouse, Wrench, Receipt, DollarSign, BarChart3, FileDiff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import { usePathname } from 'next/navigation';

export function DashboardPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/compras')) {
      const pathParts = pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      const title = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
      if (pathname.includes('referenciales')) return `Referenciales - ${title}`;
      if (pathname.includes('movimientos')) return `Movimientos - ${title}`;
      if (pathname.includes('informes')) return `Informes - ${title}`;
      return title;
    }
    return 'Dashboard';
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
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><Boxes />Categorías</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><Truck />Proveedores</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><Warehouse />Depósitos</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><Building />Sucursales</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><FileText />Unidades de Medida</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><FileText />Tipos de Documento</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><DollarSign />Formas de Pago</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton><Building />Bancos</SidebarMenuButton></Link></SidebarMenuItem>
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
                      <SidebarMenuItem><Link href="/compras/registros"><SidebarMenuButton isActive={pathname.startsWith('/compras/registros')}>Compra</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton>Notas Crédito/Débito</SidebarMenuButton></Link></SidebarMenuItem>
                      <SidebarMenuItem><Link href="#"><SidebarMenuButton>Ajustes de Stock</SidebarMenuButton></Link></SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
                 <Collapsible className="ml-4">
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
                      <SidebarMenuItem><Link href="/compras/informes"><SidebarMenuButton isActive={pathname.startsWith('/compras/informes')}>Informes de Compras</SidebarMenuButton></Link></SidebarMenuItem>
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
                        <Wrench />
                        <span>Servicios</span>
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
