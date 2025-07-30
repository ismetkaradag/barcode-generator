import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Barkod Oluşturucu',
  description: 'Excel veya manuel veri ile barkod oluşturma ve yazdırma uygulaması',
  logo: '/logom.png',
  icons: {
    icon: '/logom.png',
    shortcut: '/logom.png',
    apple: '/logom.png',
  },
  openGraph: {
    title: 'Barkod Oluşturucu',
    description: 'Excel veya manuel veri ile barkod oluşturma ve yazdırma uygulaması',
    logo: '/logom.png',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}