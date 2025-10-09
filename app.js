const { useState, useEffect } = React;
const { createClient } = supabase;

const supabaseUrl = 'https://kkxypfqqndnexpzpkgch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHlwZnFxbmRuZXhwenBrZ2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM3NDgsImV4cCI6MjA3NTQ3OTc0OH0.hpUzqjo2F022omCsXCx8f0NwOtGnE_zr46xNdhMGr34';

const supabaseClient = createClient(supabaseUrl, supabaseKey);


function RifaDenize() {
  const [etapa, setEtapa] = useState('home');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [numerosSelecionados, setNumerosSelecionados] = useState([]);
  const [nomesPorNumero, setNomesPorNumero] = useState({});
  const [numerosStatus, setNumerosStatus] = useState({});
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, 5000);
    return () => clearInterval(intervalo);
  }, []);

  async function carregarDados() {
    await supabaseClient.rpc('liberar_holds_expirados');
    const { data: configData } = await supabaseClient.from('config').select('*').single();
    const { data: numerosData } = await supabaseClient.from('numeros').select('id, status, reserva_id');

    setConfig(configData);
    const statusMap = {};
    numerosData?.forEach(num => {
      statusMap[num.id] = num;
    });
    setNumerosStatus(statusMap);
  }
  function selecionarNumero(num) {
    const status = numerosStatus[num];
    if (status?.status === 'pago') return;
    let novos = [...numerosSelecionados];
    if (novos.includes(num)) {
      novos = novos.filter(n => n !== num);
      const nomes = { ...nomesPorNumero };
      delete nomes[num];
      setNomesPorNumero(nomes);
    } else {
      novos.push(num);
    }
    setNumerosSelecionados(novos.sort((a, b) => a - b));
  }

  function handleNomeNumeroChange(num, novoNome) {
    setNomesPorNumero(prev => ({
      ...prev,
      [num]: novoNome
    }));
  }
  async function confirmarReserva() {
    if (!nome.trim()) return setErro('Preencha seu nome!');
    if (numerosSelecionados.length === 0) return setErro('Selecione ao menos um número.');
    setErro('');
    setLoading(true);

    const { data: reserva, error: err1 } = await supabaseClient
      .from('reservas')
      .insert({
        nome,
        whatsapp,
        numeros: numerosSelecionados,
        status: 'confirmado'
      })
      .select()
      .single();

    if (err1) {
      setErro('Erro ao salvar reserva.');
      setLoading(false);
      return;
    }

    await supabaseClient
      .from('numeros')
      .update({ status: 'pago', reserva_id: reserva.id })
      .in('id', numerosSelecionados);

    const inserts = numerosSelecionados.map(n => ({
      reserva_id: reserva.id,
      numero: n,
      nome_exibido: nomesPorNumero[n] || nome
    }));

    await supabaseClient.from('numeros_comprados').insert(inserts);

    setEtapa('confirmacao');
    setLoading(false);
  }
  if (etapa === 'home') {
    return (
      <div className="container flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <img src="avatar.png" alt="Denize" style={{
            width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto'
          }} />
          <h1 className="text-4xl" style={{fontWeight: 'bold', color: '#5A5A5A'}}>Rifa da Denize</h1>
          <div className="card">
            <div style={{color: '#FF8B7A'}} className="animate-pulse">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <p className="text-2xl mb-2" style={{fontWeight: '600'}}>{config?.premio || 'Carregando...'}</p>
            <p className="text-lg" style={{color: '#8BA899'}}>R$ {config?.valor_numero?.toFixed(2) || '10.00'} por número</p>
          </div>
          <button onClick={() => setEtapa('selecao')} className="btn btn-primary">
            Escolher meus números ✨
          </button>
          <p className="text-sm mt-2" style={{ color: '#5A5A5A' }}>
            📅 Sorteio: 12/12/2025 às 17h
            </p>
        </div>
      </div>
    );
  }

  if (etapa === 'selecao') {
    return (
      <div className="container pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <input type="text" className="input mb-3" placeholder="Seu nome *"
              value={nome} onChange={e => setNome(e.target.value)} />
            <input type="text" className="input input-sage" placeholder="WhatsApp (opcional)"
              value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          </div>

          {erro && <div className="alert-error">{erro}</div>}

          <div className="card">
            <h3 className="text-xl mb-4" style={{fontWeight: 'bold'}}>Escolha seus números</h3>
            <div className="numbers-grid">
              {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                const status = numerosStatus[num];
                const selecionado = numerosSelecionados.includes(num);
                const indisponivel = status?.status === 'pago';

                let className = 'number-btn number-free';
                if (indisponivel) className = 'number-btn number-unavailable';
                if (selecionado) className = 'number-btn number-selected';

                return (
                  <button key={num} className={className} disabled={indisponivel}
                    onClick={() => selecionarNumero(num)}>
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {numerosSelecionados.length > 0 && (
            <div className="card">
              <h3 className="text-xl mb-2" style={{fontWeight: 'bold'}}>Quem representa cada número?</h3>
              {numerosSelecionados.map(num => (
                <div key={num} className="mb-2">
                  <label>Número {num}:</label>
                  <input
                    type="text"
                    className="input mt-1"
                    placeholder={`Deixe em branco para usar ${nome}`}
                    value={nomesPorNumero[num] || ''}
                    onChange={(e) => handleNomeNumeroChange(num, e.target.value)}
                    />
                </div>
              ))}
            </div>
          )}

          <button onClick={confirmarReserva} className="btn btn-primary fixed-bottom" disabled={loading}>
            {loading ? 'Confirmando...' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    );
  }

  if (etapa === 'confirmacao') {
    return (
      <div className="container flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="card">
            <div style={{color: '#FF8B7A'}} className="animate-pulse">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h2 className="text-3xl mb-4" style={{fontWeight: 'bold'}}>Reserva confirmada!</h2>
            <p className="mb-6">Envie o comprovante para a Denize no WhatsApp.</p>
            <a href={`https://wa.me/55${config?.whatsapp_admin}`} target="_blank" rel="noopener noreferrer"
              className="btn btn-whatsapp">
              Enviar comprovante
            </a>
            <button className="btn btn-secondary mt-4" onClick={() => window.location.reload()}>
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// Renderiza
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RifaDenize />);
