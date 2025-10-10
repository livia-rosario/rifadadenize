const { useState, useEffect } = React;
const { createClient } = supabase;

const supabaseUrl = 'https://kkxypfqqndnexpzpkgch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHlwZnFxbmRuZXhwenBrZ2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM3NDgsImV4cCI6MjA3NTQ3OTc0OH0.hpUzqjo2F022omCsXCx8f0NwOtGnE_zr46xNdhMGr34';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Ícones SVG
const HeartIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const TimerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="13" r="9"></circle>
    <polyline points="12 7 12 13 16 13"></polyline>
    <path d="M16.51 3.5a1.5 1.5 0 0 1 0 3"></path>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const MessageCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const UserIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

// Componente Principal
function RifaDenize() {
  const [etapa, setEtapa] = useState('home'); // home | selecao | personalizacao | pagamento | confirmacao
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [numerosSelecionados, setNumerosSelecionados] = useState([]);
  const [nomesPorNumero, setNomesPorNumero] = useState({});
  const [numerosStatus, setNumerosStatus] = useState({});
  const [reservaId, setReservaId] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [holdTimer]);

  const carregarDados = async () => {
    try {
      await supabaseClient.rpc('liberar_holds_expirados');

      const { data: configData } = await supabaseClient
        .from('config')
        .select('*')
        .single();
      setConfig(configData);

      const { data: numerosData } = await supabaseClient
        .from('numeros')
        .select('id, status, reserva_id');
      
      const statusMap = {};
      numerosData?.forEach(num => {
        statusMap[num.id] = num;
      });
      setNumerosStatus(statusMap);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const criarReserva = async (numeros) => {
    try {
      const holdUntil = new Date();
      holdUntil.setMinutes(holdUntil.getMinutes() + 15);

      const { data, error } = await supabaseClient
        .from('reservas')
        .insert({
          nome,
          whatsapp,
          numeros,
          status: 'hold',
          hold_until: holdUntil.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabaseClient
        .from('numeros')
        .update({ status: 'reservado', reserva_id: data.id })
        .in('id', numeros);

      setReservaId(data.id);
      setHoldTimer(15 * 60);
      return data.id;
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      throw error;
    }
  };

  const atualizarReserva = async (novosNumeros) => {
    try {
      await supabaseClient
        .from('reservas')
        .update({ numeros: novosNumeros })
        .eq('id', reservaId);

      await supabaseClient
        .from('numeros')
        .update({ status: 'reservado', reserva_id: reservaId })
        .in('id', novosNumeros);
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
    }
  };

  const selecionarNumero = async (num) => {
    if (!nome.trim()) {
      setErro('Preencha seu nome primeiro!');
      return;
    }

    const status = numerosStatus[num];
    if (status?.status === 'pago' || (status?.status === 'reservado' && status?.reserva_id !== reservaId)) {
      setErro(`Número ${num} já está reservado!`);
      return;
    }

    setErro('');
    let novosNumeros;

    if (numerosSelecionados.includes(num)) {
      novosNumeros = numerosSelecionados.filter(n => n !== num);
      const novosNomes = { ...nomesPorNumero };
      delete novosNomes[num];
      setNomesPorNumero(novosNomes);
    } else {
      novosNumeros = [...numerosSelecionados, num].sort((a, b) => a - b);
    }

    setNumerosSelecionados(novosNumeros);

    if (novosNumeros.length > 0) {
      if (!reservaId) {
        await criarReserva(novosNumeros);
      } else {
        await atualizarReserva(novosNumeros);
      }
    }
  };

  const handleNomeNumeroChange = (num, novoNome) => {
    setNomesPorNumero(prev => ({
      ...prev,
      [num]: novoNome
    }));
  };

  const usarMeuNomeEmTodos = () => {
    const novosNomes = {};
    numerosSelecionados.forEach(num => {
      novosNomes[num] = '';
    });
    setNomesPorNumero(novosNomes);
  };

  const confirmarSelecao = async () => {
    if (numerosSelecionados.length === 0) {
      setErro('Selecione pelo menos um número!');
      return;
    }

    setLoading(true);
    try {
      const { data: numerosAtuais } = await supabaseClient
        .from('numeros')
        .select('id, status, reserva_id')
        .in('id', numerosSelecionados);

      const conflitos = numerosAtuais?.filter(n => 
        n.status === 'pago' || (n.status === 'reservado' && n.reserva_id !== reservaId)
      );

      if (conflitos && conflitos.length > 0) {
        setErro(`Números ${conflitos.map(c => c.id).join(', ')} foram reservados por outra pessoa. Escolha outros!`);
        setLoading(false);
        return;
      }

      await supabaseClient
        .from('reservas')
        .update({ status: 'aguardando' })
        .eq('id', reservaId);

      setEtapa('personalizacao'); // Nova etapa!
    } catch (error) {
      setErro('Erro ao confirmar seleção. Tente novamente.');
    }
    setLoading(false);
  };

  const confirmarPersonalizacao = () => {
    setEtapa('pagamento');
  };

  const copiarChavePix = () => {
    navigator.clipboard.writeText(config?.pix_chave || '');
    alert('Chave Pix copiada!');
  };

 const abrirWhatsApp = async () => {
  const total = numerosSelecionados.length * (config?.valor_numero || 10);

  try {
    await supabaseClient
      .from('reservas')
      .update({ status: 'confirmado' })
      .eq('id', reservaId);

    await supabaseClient
      .from('numeros')
      .update({ status: 'pago' })
      .in('id', numerosSelecionados);

    const inserts = numerosSelecionados.map(n => ({
      reserva_id: reservaId,
      numero: n,
      nome_exibido: nomesPorNumero[n]?.trim() || nome
    }));

    await supabaseClient.from('numeros_comprados').insert(inserts);

    let mensagemNumeros = '';
    numerosSelecionados.forEach(n => {
      const nomeExibido = nomesPorNumero[n]?.trim() || nome;
      mensagemNumeros += `\n  • ${n}: ${nomeExibido}`;
    });

    const mensagem = `Olá! Confirmei minha reserva na rifa:\n\n👤 Comprador: ${nome}\n🎯 Números:${mensagemNumeros}\n💰 Total: R$ ${total.toFixed(2)}\n\nVou enviar o comprovante do Pix!`;
    const url = `https://wa.me/55${config?.whatsapp_admin}?text=${encodeURIComponent(mensagem)}`;
    
    console.log('🔗 URL do WhatsApp:', url);
    alert(`Link gerado: ${url}`);

    // troquei window.open por:
    window.location.href = url;

  } catch (error) {
    console.error('Erro ao enviar comprovante:', error);
    alert('Sua reserva foi salva! Se o WhatsApp não abrir automaticamente, envie o comprovante manualmente.');

  }
};


  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  const voltarInicio = () => {
    setEtapa('home');
    setNome('');
    setWhatsapp('');
    setNumerosSelecionados([]);
    setNomesPorNumero({});
    setReservaId(null);
    setHoldTimer(null);
    setErro('');
  };

  // ========== TELA HOME ==========
  if (etapa === 'home') {
    return (
      <div className="container flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <img src="avatar.png" alt="Denize" style={{
            width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }} />
          <h1 className="text-4xl" style={{fontWeight: 'bold', color: '#5A5A5A'}}>Rifa da Denize</h1>
          <div className="card">

            <p className="text-2xl mb-2" style={{fontWeight: '600', color: '#5A5A5A'}}>
              {config?.premio || 'Carregando...'}
            </p>
            <p className="text-lg" style={{color: '#8BA899'}}>
              R$ {config?.valor_numero?.toFixed(2) || '10.00'} por número
            </p>
          </div>
          <button onClick={() => setEtapa('selecao')} className="btn btn-primary">
            Escolher meus números ✨
          </button>
          <p className="text-sm mt-2" style={{ color: '#5A5A5A' }}>
            📅 Sorteio: {config?.data_sorteio ? new Date(config.data_sorteio).toLocaleDateString('pt-BR') : '12/12/2025'} às 17h
          </p>
        </div>
      </div>
    );
  }

  // ========== TELA DE SELEÇÃO ==========
  if (etapa === 'selecao') {
    return (
      <div className="container pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card sticky">
            <h2 className="text-2xl mb-4" style={{fontWeight: 'bold', color: '#5A5A5A'}}>Seus dados</h2>
            <input
              type="text"
              placeholder="Seu nome (comprador) *"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input mb-3"
            />
            <input
              type="tel"
              placeholder="WhatsApp (opcional)"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="input input-sage"
            />
          </div>

          {numerosSelecionados.length > 0 && holdTimer && (
            <div className="timer-bar">
              <div className="flex items-center gap-2">
                <TimerIcon />
                <span style={{fontWeight: '600'}}>{formatarTempo(holdTimer)}</span>
              </div>
              <span style={{fontWeight: '600'}}>{numerosSelecionados.length} números</span>
            </div>
          )}

          {erro && (
            <div className="alert-error">
              <XIcon />
              <span>{erro}</span>
            </div>
          )}

          <div className="card">
            <h3 className="text-xl mb-4" style={{fontWeight: 'bold', color: '#5A5A5A'}}>
              Escolha seus números
            </h3>
            <div className="numbers-grid">
              {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                const status = numerosStatus[num];
                const selecionado = numerosSelecionados.includes(num);
                const indisponivel = status?.status === 'pago' || 
                  (status?.status === 'reservado' && status?.reserva_id !== reservaId);
                
                let className = 'number-btn number-free';
                if (indisponivel) className = 'number-btn number-unavailable';
                if (selecionado) className = 'number-btn number-selected';

                return (
                  <button
                    key={num}
                    onClick={() => selecionarNumero(num)}
                    disabled={!nome.trim() || indisponivel}
                    className={className}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={confirmarSelecao}
            disabled={numerosSelecionados.length === 0 || loading}
            className="btn btn-primary fixed-bottom"
          >
            {loading ? 'Confirmando...' : `Continuar com ${numerosSelecionados.length} números →`}
          </button>
        </div>
      </div>
    );
  }

  // ========== NOVA TELA: PERSONALIZAÇÃO ==========
  if (etapa === 'personalizacao') {
    return (
      <div className="container pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card text-center">
            <div style={{color: '#8BA899', marginBottom: '1rem'}}>
              <UserIcon />
            </div>
            <h2 className="text-2xl mb-2" style={{fontWeight: 'bold', color: '#5A5A5A'}}>
              Quem representa cada número?
            </h2>
            <p className="text-sm" style={{color: '#8BA899'}}>
              Personalize os nomes que vão aparecer nos bilhetes
            </p>
          </div>

          {holdTimer && (
            <div className="timer-bar">
              <div className="flex items-center gap-2">
                <TimerIcon />
                <span style={{fontWeight: '600'}}>Tempo restante: {formatarTempo(holdTimer)}</span>
              </div>
            </div>
          )}

          <button 
            onClick={usarMeuNomeEmTodos}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(139, 168, 153, 0.2)',
              border: '2px dashed #8BA899',
              borderRadius: '1rem',
              color: '#8BA899',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ✨ Usar "{nome}" em todos os números
          </button>

          <div className="space-y-4">
            {numerosSelecionados.map(num => (
              <div key={num} className="card" style={{
                background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)',
                padding: '1.25rem',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  background: 'rgba(255,255,255,0.9)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#5A5A5A',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {num}
                </div>
                
                <div style={{marginLeft: '64px'}}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'rgba(90,90,90,0.8)',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>
                    Nome que vai aparecer:
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={`Ex: João (neto), Maria (amiga)... ou deixe vazio para "${nome}"`}
                    value={nomesPorNumero[num] || ''}
                    onChange={(e) => handleNomeNumeroChange(num, e.target.value)}
                    style={{background: 'white', border: '2px solid rgba(90,90,90,0.2)'}}
                  />
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'rgba(90,90,90,0.7)',
                    fontWeight: '500'
                  }}>
                    📝 Vai aparecer: <strong>{nomesPorNumero[num]?.trim() || nome}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={confirmarPersonalizacao}
            className="btn btn-primary fixed-bottom"
          >
            Continuar para pagamento →
          </button>
        </div>
      </div>
    );
  }

  // ========== TELA DE PAGAMENTO ==========
  if (etapa === 'pagamento') {
    const total = numerosSelecionados.length * (config?.valor_numero || 10);
    
    return (
      <div className="container flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="card text-center">
            <div style={{color: '#8BA899', marginBottom: '1rem'}}>
              <CheckCircleIcon />
            </div>
            <h2 className="text-2xl mb-2" style={{fontWeight: 'bold', color: '#5A5A5A'}}>
              Números reservados!
            </h2>
            <p className="mb-4" style={{color: '#8BA899'}}>Complete o pagamento via Pix</p>
            
            <div className="info-box mb-4">
              <p className="text-sm mb-2">Seus números:</p>
              <div style={{fontSize: '0.875rem', marginBottom: '0.75rem'}}>
                {numerosSelecionados.map(n => {
                  const nomeExibido = nomesPorNumero[n]?.trim() || nome;
                  return <div key={n} style={{padding: '0.25rem 0'}}><strong>{n}</strong>: {nomeExibido}</div>;
                })}
              </div>
              <p className="text-3xl" style={{fontWeight: 'bold'}}>R$ {total.toFixed(2)}</p>
            </div>

            <div className="card-solid mb-4">
              <p className="text-sm mb-2" style={{color: '#5A5A5A'}}>Chave Pix:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1">{config?.pix_chave}</code>
                <button onClick={copiarChavePix} className="btn-copy">
                  <CopyIcon />
                </button>
              </div>
            </div>

            <button onClick={() => setEtapa('confirmacao')} className="btn btn-primary">
              Fiz o Pix! ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== TELA DE CONFIRMAÇÃO ==========
  if (etapa === 'confirmacao') {
    return (
      <div className="container flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="card">
            <h2 className="text-3xl mb-4" style={{fontWeight: 'bold', color: '#5A5A5A'}}>
              Quase lá!
            </h2>
            <p className="mb-6" style={{color: '#8BA899'}}>
              Clique no botão abaixo para enviar o comprovante e <strong>confirmar automaticamente</strong> seus números!
            </p>
            
            <button onClick={abrirWhatsApp} className="btn btn-whatsapp mb-4">
              <MessageCircleIcon />
              Enviar comprovante e confirmar
            </button>

            <button onClick={voltarInicio} className="btn btn-secondary">
              Voltar ao início
            </button>
          </div>

          <div className="card">
            <p className="text-sm" style={{color: '#5A5A5A'}}>
              ✨ <strong>Atenção:</strong> Ao clicar em "Enviar comprovante", seus números serão confirmados automaticamente!
            </p>
          </div>
        </div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RifaDenize />);