import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Plots - Desenho de Talhões',
    template: '%s',
  },
  description:
    'Ferramenta profissional para delimitação de talhões. Desenhe áreas com precisão no Google Maps e exporte seus dados instantaneamente nos formatos KML ou GeoJSON para uso em GPS e softwares de agricultura de precisão.',
  metadataBase: new URL('https://plots.thegibi.dev'),
  alternates: {
    canonical: '/',
    languages: {
      'pt-BR': '/pt-BR',
    },
  },
  appleWebApp: {
    title: 'Plots',
    statusBarStyle: 'default',
  },
  openGraph: {
    images: '/og-image.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={'pt-BR'}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
