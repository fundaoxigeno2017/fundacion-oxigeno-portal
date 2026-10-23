/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Permite que la construcción de producción se complete 
    // incluso si hay advertencias o errores de estilo de ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;