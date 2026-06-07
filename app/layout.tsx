import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NodeWave PM',
  description: 'Frontend sederhana untuk project management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
