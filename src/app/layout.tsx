import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardPage } from '@/components/dashboard/dashboard-page';

export const metadata: Metadata = {
  title: 'OrderFlow',
  description: 'Smart product import and categorization.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet"></link>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <DashboardPage>
            {children}
          </DashboardPage>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
