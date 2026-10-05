import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/globals.css'

export const metadata: Metadata = { title: 'Terre 3D', description: 'Terre, ISS, fusées et astres en 3D (three.js)' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#000000' }

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="fr">
    <body>{children}</body>
  </html>
)

export default RootLayout
