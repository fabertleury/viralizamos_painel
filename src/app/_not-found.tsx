export default function NotFoundRedirect() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecionando para a página de erro 404...</p>
      <meta httpEquiv="refresh" content="0;url=/not-found" />
    </div>
  );
} 