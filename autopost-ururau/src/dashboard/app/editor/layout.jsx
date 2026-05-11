import '../globals.css';

export const metadata = { title: 'Editor — AutoPost Ururau' };

export default function EditorLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/aileron" />
      </head>
      <body className="bg-background text-foreground antialiased overflow-hidden">{children}</body>
    </html>
  );
}
