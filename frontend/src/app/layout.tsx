import { Poppins } from 'next/font/google';
import ClientLayout from './ClientLayout';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata = {
  title: 'Nerd AI - Your Intelligent Learning Assistant',
  description: 'Nerd AI is an intelligent learning assistant powered by Gemini AI. Upload documents, chat with AI, get explanations, and improve your understanding of complex topics.',
  keywords: 'AI learning, artificial intelligence, document analysis, study assistant, Gemini AI, learning tool',
  authors: [{ name: 'Nerd AI' }],
  openGraph: {
    title: 'Nerd AI - Your Intelligent Learning Assistant',
    description: 'Chat with AI, upload documents, get explanations, and enhance your learning experience.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nerd AI - Your Intelligent Learning Assistant',
    description: 'Chat with AI, upload documents, get explanations, and enhance your learning experience.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className} suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
