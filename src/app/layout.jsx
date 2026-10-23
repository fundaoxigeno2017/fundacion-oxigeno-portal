import './globals.css'

export const metadata = {
  title: 'Fundación Oxígeno - Certificaciones',
  description: 'Sistema de certificación laboral',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}