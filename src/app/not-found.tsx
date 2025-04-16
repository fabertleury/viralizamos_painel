export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      flexDirection: 'column',
      height: '100vh'
    }}>
      <h1 style={{ fontSize: '4rem', color: '#E53E3E' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Página não encontrada</h2>
      <p style={{ fontSize: '1.25rem', color: '#718096', marginBottom: '2rem' }}>
        A página que você está procurando não existe ou foi removida.
      </p>
      <a 
        href="/" 
        style={{
          backgroundColor: '#3182CE',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}
      >
        Voltar para a página inicial
      </a>
    </div>
  );
} 