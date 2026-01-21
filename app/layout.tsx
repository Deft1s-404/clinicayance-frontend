import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Clínica Yance CRM',
  description: 'Plataforma CRM para gestão de clínica estética.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="theme-light">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
