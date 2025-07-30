
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
import { Button } from "@/components/ui/button";

export function DashboardPage() {
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
              <SidebarMenuButton href="/" isActive>
                <Home />
                Dashboard
              </SidebarMenuButton>
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
                      <SidebarMenuItem><SidebarMenuButton href="#"><Package />Productos</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#"><Boxes />Categoría</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#"><Truck />Proveedor</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#"><Warehouse />Depósitos</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#"><Building />Sucursal</SidebarMenuButton></SidebarMenuItem>
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
                      <SidebarMenuItem><SidebarMenuButton href="/compras/pedidos">Pedido</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="/compras/presupuestos">Presupuesto proveedor</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="/compras/ordenes">Orden de compra</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="/compras/registros">Compra</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#">Notas Crédito/Débito</SidebarMenuButton></SidebarMenuItem>
                      <SidebarMenuItem><SidebarMenuButton href="#">Ajustes de Stock</SidebarMenuButton></SidebarMenuItem>
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
                      <SidebarMenuItem><SidebarMenuButton href="/compras/informes">Informes de Compras</SidebarMenuButton></SidebarMenuItem>
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
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
        </header>
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">Visión General</h3>
              <p className="text-muted-foreground">
                Bienvenido a tu panel de control.
              </p>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
