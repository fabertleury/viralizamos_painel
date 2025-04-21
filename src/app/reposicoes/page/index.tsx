// Este componente serve para redirecionar de /reposicoes/page para /reposicoes
// Foi criado para resolver um erro de build 
export default function ReposicoesPageRedirect() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecionando...</p>
      <meta httpEquiv="refresh" content="0;url=/reposicoes" />
    </div>
  );
} 