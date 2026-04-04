import type { Metadata } from 'next'
import { Fredoka } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-playful',
})

export const metadata: Metadata = {
  title: 'dolympia',
  description: 'Mini-jeux multijoueur en temps réel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${fredoka.variable} font-playful bg-fiesta-bg min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
