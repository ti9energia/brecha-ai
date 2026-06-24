// Evita FOUC: aplica o tema salvo antes da pintura. Padrão: escuro.
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('brecha-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
