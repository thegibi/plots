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

export async function generateMetadata() {
  return {
    title: {
      default: 'Plots',
      template: '%s',
    },
    description: '',
    metadataBase: new URL('https://plots.thegibi.dev'),
    alternates: {
      canonical: '/',
      languages: {
        'pt-BR': '/pt-BR',
        'en-US': '/en-US',
        'es-ES': '/es-ES',
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
