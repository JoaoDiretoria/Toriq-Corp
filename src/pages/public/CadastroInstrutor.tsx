import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Loader2, User, MapPin, Briefcase, FileSignature, CheckCircle2, AlertCircle, Send, Plus, Trash2, Upload, HelpCircle, FileText, Pencil, GraduationCap, FileWarning, Image as ImageIcon } from 'lucide-react';
import { isDocumentFile, convertDocumentToJpg, getFileExtension } from '@/utils/documentToImage';
import { cn } from '@/lib/utils';

const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const FORMACOES_ACADEMICAS = ['Técnico(a) em Segurança do Trabalho','Engenheiro de Segurança do Trabalho','Engenheiro(a) Eletricista','Engenheiro(a) Mecânico(a)','Eletrotécnico(a)','Enfermeiro(a)'];
const TIPOS_REGISTRO = [{value:'CREA',label:'CREA'},{value:'MTE',label:'MTE'},{value:'CRM',label:'CRM'},{value:'COREN',label:'COREN'},{value:'CRQ',label:'CRQ'},{value:'CFT',label:'CFT'},{value:'OUTRO',label:'Outro'}];
const CAMPOS_FORMULARIO = [{value:'nome',label:'Nome'},{value:'cpf',label:'CPF'},{value:'email',label:'E-mail'},{value:'telefone',label:'Telefone'},{value:'endereco',label:'Endereço'},{value:'formacoes',label:'Formações'},{value:'assinatura',label:'Assinatura'},{value:'outro',label:'Outro'}];

interface FormacaoData { id:string; nome:string; registro_tipo:string; registro_numero:string; registro_estado:string; anexo_url:string|null; treinamentos:{id:string;treinamento_id:string;nome:string;norma:string;anexo_url:string|null}[]; }
interface Treinamento { id:string; nome:string; norma:string; }
interface Pergunta { id:string; campo:string; pergunta:string; resposta:string|null; status:string; created_at:string; }

export default function CadastroInstrutor() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [treinamentosDisponiveis, setTreinamentosDisponiveis] = useState<Treinamento[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [informarVeiculo, setInformarVeiculo] = useState<'sim'|'nao'>('nao');
  const [veiculo, setVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [formacoes, setFormacoes] = useState<FormacaoData[]>([]);
  const [formacaoSelecionada, setFormacaoSelecionada] = useState<string|null>(null);
  const [novaFormacaoNome, setNovaFormacaoNome] = useState('');
  const [novaFormacaoTipo, setNovaFormacaoTipo] = useState('');
  const [novaFormacaoNumero, setNovaFormacaoNumero] = useState('');
  const [novaFormacaoEstado, setNovaFormacaoEstado] = useState('');
  const [showAddFormacao, setShowAddFormacao] = useState(false);
  const [showAddTreinamento, setShowAddTreinamento] = useState(false);
  const [treinamentoSelecionado, setTreinamentoSelecionado] = useState('');
  const [assinaturaUrl, setAssinaturaUrl] = useState('');
  const [assinaturaTipo, setAssinaturaTipo] = useState<'upload'|'desenho'>('upload');
  
  // Equipamentos próprios
  const [possuiEquipamentos, setPossuiEquipamentos] = useState<'sim'|'nao'>('nao');
  const [equipamentosPorTreinamento, setEquipamentosPorTreinamento] = useState<Record<string, { nome: string; quantidade: number }[]>>({});
  const [treinamentoEquipSelecionado, setTreinamentoEquipSelecionado] = useState('');
  const [novoEquipNome, setNovoEquipNome] = useState('');
  const [novoEquipQtd, setNovoEquipQtd] = useState(1);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploadingAssinatura, setUploadingAssinatura] = useState(false);
  const [perguntaDialogOpen, setPerguntaDialogOpen] = useState(false);
  const [novaPerguntaCampo, setNovaPerguntaCampo] = useState('');
  const [novaPerguntaTexto, setNovaPerguntaTexto] = useState('');
  const [enviandoPergunta, setEnviandoPergunta] = useState(false);

  // Estados para confirmação de upload de documento (PDF/DOCX)
  const [documentConfirmOpen, setDocumentConfirmOpen] = useState(false);
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null);
  const [pendingDocumentType, setPendingDocumentType] = useState<'formacao' | 'treinamento' | null>(null);
  const [pendingDocumentIds, setPendingDocumentIds] = useState<{ fId: string; tId?: string } | null>(null);
  const [convertingDocument, setConvertingDocument] = useState(false);

  const formatCpf = (v:string) => v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  const formatTelefone = (v:string) => { const n=v.replace(/\D/g,''); return n.length<=10?n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'):n.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2'); };
  const formatCep = (v:string) => v.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2');

  const fetchSolicitacao = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const db = supabase as any;
      const { data, error } = await db.from('instrutor_solicitacoes').select('*').eq('token', token).single();
      if (error) throw error;
      if (!data) { toast.error('Link inválido'); return; }
      setSolicitacao(data);
      setNome(data.nome||''); setCpf(data.cpf_cnpj?formatCpf(data.cpf_cnpj):''); setTelefone(data.telefone?formatTelefone(data.telefone):'');
      setEmail(data.email||''); setDataNascimento(data.data_nascimento||''); setInformarVeiculo(data.possui_veiculo?'sim':'nao');
      setVeiculo(data.tipo_veiculo||''); setPlaca(data.placa||''); setCep(data.cep?formatCep(data.cep):'');
      setLogradouro(data.logradouro||''); setBairro(data.bairro||''); setNumero(data.numero||'');
      setComplemento(data.complemento||''); setCidade(data.cidade||''); setUf(data.estado||'');
      setAssinaturaUrl(data.assinatura_url||'');
      if (data.formacoes && Array.isArray(data.formacoes)) setFormacoes(data.formacoes);
      setPossuiEquipamentos(data.possui_equipamentos_proprios ? 'sim' : 'nao');
      if (data.equipamentos && typeof data.equipamentos === 'object') setEquipamentosPorTreinamento(data.equipamentos);
      const { data: pData } = await db.from('instrutor_solicitacao_perguntas').select('*').eq('solicitacao_id', data.id).order('created_at',{ascending:false});
      setPerguntas(pData||[]);
      const { data: tData } = await supabase.from('catalogo_treinamentos').select('id,nome,norma').eq('empresa_id', data.empresa_id);
      if (tData) { const t=tData.map((x:any)=>({id:x.id,nome:x.nome,norma:x.norma})); t.sort((a:any,b:any)=>(parseInt(a.norma.replace(/\D/g,''))||999)-(parseInt(b.norma.replace(/\D/g,''))||999)); setTreinamentosDisponiveis(t); }
    } catch (e) { console.error(e); toast.error('Erro ao carregar'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSolicitacao(); }, [token]);

  const saveData = useCallback(async () => {
    if (!solicitacao || solicitacao.status==='enviado' || solicitacao.status==='aprovado') return;
    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from('instrutor_solicitacoes').update({
        nome: nome.trim()||null, 
        cpf_cnpj: cpf.replace(/\D/g,'')||null, 
        email: email.trim()||null,
        telefone: telefone.replace(/\D/g,'')||null, 
        data_nascimento: dataNascimento && dataNascimento.trim() !== '' ? dataNascimento : null,
        possui_veiculo: informarVeiculo==='sim', 
        tipo_veiculo: informarVeiculo==='sim' ? veiculo.trim() || null : null,
        placa: informarVeiculo==='sim' ? placa.trim() || null : null,
        cep: cep.replace(/\D/g,'')||null,
        logradouro: logradouro.trim()||null, 
        bairro: bairro.trim()||null, 
        numero: numero.trim()||null,
        complemento: complemento.trim()||null, 
        cidade: cidade.trim()||null, 
        estado: uf||null,
        assinatura_url: assinaturaUrl||null, 
        formacoes,
        possui_equipamentos_proprios: possuiEquipamentos === 'sim',
        equipamentos: possuiEquipamentos === 'sim' ? equipamentosPorTreinamento : null
      }).eq('id', solicitacao.id);
      if (error) {
        console.error('Erro ao salvar:', error);
        toast.error('Erro ao salvar dados');
      }
    } catch (e) { console.error('Erro ao salvar:', e); toast.error('Erro ao salvar dados'); } finally { setSaving(false); }
  }, [solicitacao,nome,cpf,email,telefone,dataNascimento,informarVeiculo,veiculo,placa,cep,logradouro,bairro,numero,complemento,cidade,uf,assinaturaUrl,formacoes,possuiEquipamentos,equipamentosPorTreinamento]);

  useEffect(() => {
    if (!solicitacao || solicitacao.status==='enviado' || solicitacao.status==='aprovado') return;
    const t = setTimeout(saveData, 2000);
    return () => clearTimeout(t);
  }, [nome,cpf,email,telefone,dataNascimento,informarVeiculo,veiculo,placa,cep,logradouro,bairro,numero,complemento,cidade,uf,assinaturaUrl,formacoes,possuiEquipamentos,equipamentosPorTreinamento,saveData]);

  const buscarCep = async (v:string) => {
    const c=v.replace(/\D/g,''); if(c.length!==8)return; setLoadingCep(true);
    try { 
      // Usar BrasilAPI como alternativa ao ViaCEP (sem problemas de CORS)
      const r=await fetch(`https://brasilapi.com.br/api/cep/v1/${c}`); 
      if (!r.ok) { toast.error('CEP não encontrado'); return; }
      const d=await r.json(); 
      setLogradouro(d.street||'');
      setBairro(d.neighborhood||'');
      setCidade(d.city||'');
      setUf(d.state||''); 
    } catch(e){
      toast.error('Erro ao buscar CEP');
    } finally{
      setLoadingCep(false);
    }
  };

  const handleAddFormacao = () => {
    if(!novaFormacaoNome){toast.error('Selecione formação');return;}
    setFormacoes([...formacoes,{id:crypto.randomUUID(),nome:novaFormacaoNome,registro_tipo:novaFormacaoTipo,registro_numero:novaFormacaoNumero,registro_estado:novaFormacaoEstado,anexo_url:null,treinamentos:[]}]);
    setNovaFormacaoNome('');setNovaFormacaoTipo('');setNovaFormacaoNumero('');setNovaFormacaoEstado('');setShowAddFormacao(false);
  };

  const handleRemoveFormacao = (id:string) => { setFormacoes(formacoes.filter(f=>f.id!==id)); if(formacaoSelecionada===id)setFormacaoSelecionada(null); };

  const handleAddTreinamento = () => {
    if(!formacaoSelecionada||!treinamentoSelecionado)return;
    const t=treinamentosDisponiveis.find(x=>x.id===treinamentoSelecionado); if(!t)return;
    setFormacoes(formacoes.map(f=>{
      if(f.id===formacaoSelecionada){
        if(f.treinamentos.some(x=>x.treinamento_id===t.id)){toast.error('Já adicionado');return f;}
        return {...f,treinamentos:[...f.treinamentos,{id:crypto.randomUUID(),treinamento_id:t.id,nome:t.nome,norma:t.norma,anexo_url:null}]};
      } return f;
    }));
    setTreinamentoSelecionado('');setShowAddTreinamento(false);
  };

  const handleRemoveTreinamento = (fId:string,tId:string) => { setFormacoes(formacoes.map(f=>f.id===fId?{...f,treinamentos:f.treinamentos.filter(t=>t.id!==tId)}:f)); };

  // Validar arquivo (aceita imagens e documentos)
  const validateFile = (file: File): boolean => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const documentTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    const validTypes = [...imageTypes, ...documentTypes];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Formatos aceitos: JPEG, PNG, PDF ou DOCX.');
      return false;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return false;
    }
    return true;
  };

  // Processar arquivo - se for documento, pedir confirmação
  const processFormacaoFile = (fId: string, file: File) => {
    if (!validateFile(file)) return;
    if (isDocumentFile(file)) {
      setPendingDocumentFile(file);
      setPendingDocumentType('formacao');
      setPendingDocumentIds({ fId });
      setDocumentConfirmOpen(true);
      return;
    }
    handleUploadFormacaoAnexo(fId, file);
  };

  const processTreinamentoFile = (fId: string, tId: string, file: File) => {
    if (!validateFile(file)) return;
    if (isDocumentFile(file)) {
      setPendingDocumentFile(file);
      setPendingDocumentType('treinamento');
      setPendingDocumentIds({ fId, tId });
      setDocumentConfirmOpen(true);
      return;
    }
    handleUploadTreinamentoAnexo(fId, tId, file);
  };

  // Confirmar e processar documento (PDF/DOCX)
  const handleConfirmDocumentUpload = async () => {
    if (!pendingDocumentFile || !pendingDocumentType || !pendingDocumentIds) return;
    setConvertingDocument(true);
    try {
      const jpgFile = await convertDocumentToJpg(pendingDocumentFile);
      if (pendingDocumentType === 'formacao') {
        await handleUploadFormacaoAnexo(pendingDocumentIds.fId, jpgFile);
      } else if (pendingDocumentIds.tId) {
        await handleUploadTreinamentoAnexo(pendingDocumentIds.fId, pendingDocumentIds.tId, jpgFile);
      }
      toast.success('Documento convertido e enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao converter documento:', error);
      toast.error('Erro ao converter documento. Tente enviar como imagem.');
    } finally {
      setConvertingDocument(false);
      setDocumentConfirmOpen(false);
      setPendingDocumentFile(null);
      setPendingDocumentType(null);
      setPendingDocumentIds(null);
    }
  };

  const handleCancelDocumentUpload = () => {
    setDocumentConfirmOpen(false);
    setPendingDocumentFile(null);
    setPendingDocumentType(null);
    setPendingDocumentIds(null);
  };

  const handleUploadFormacaoAnexo = async (fId:string,file:File) => {
    if(!solicitacao)return;
    try {
      const ext=file.name.split('.').pop(); const name=`solicitacao_${solicitacao.id}/formacao_${fId}.${ext}`;
      const {error}=await supabase.storage.from('instrutor-documentos').upload(name,file,{upsert:true}); if(error)throw error;
      const {data:{publicUrl}}=supabase.storage.from('instrutor-documentos').getPublicUrl(name);
      setFormacoes(formacoes.map(f=>f.id===fId?{...f,anexo_url:publicUrl}:f)); toast.success('Anexo enviado');
    } catch(e){console.error(e);toast.error('Erro upload');}
  };

  const handleUploadTreinamentoAnexo = async (fId:string,tId:string,file:File) => {
    if(!solicitacao)return;
    try {
      const ext=file.name.split('.').pop(); const name=`solicitacao_${solicitacao.id}/treinamento_${tId}.${ext}`;
      const {error}=await supabase.storage.from('instrutor-documentos').upload(name,file,{upsert:true}); if(error)throw error;
      const {data:{publicUrl}}=supabase.storage.from('instrutor-documentos').getPublicUrl(name);
      setFormacoes(formacoes.map(f=>f.id===fId?{...f,treinamentos:f.treinamentos.map(t=>t.id===tId?{...t,anexo_url:publicUrl}:t)}:f)); toast.success('Anexo enviado');
    } catch(e){console.error(e);toast.error('Erro upload');}
  };

  const handleUploadAssinatura = async (file:File) => {
    if(!solicitacao)return; setUploadingAssinatura(true);
    try {
      const ext=file.name.split('.').pop(); const name=`solicitacao_${solicitacao.id}/assinatura.${ext}`;
      const {error}=await supabase.storage.from('instrutor-documentos').upload(name,file,{upsert:true}); if(error)throw error;
      const {data:{publicUrl}}=supabase.storage.from('instrutor-documentos').getPublicUrl(name);
      setAssinaturaUrl(publicUrl); toast.success('Assinatura enviada');
    } catch(e){console.error(e);toast.error('Erro upload');} finally{setUploadingAssinatura(false);}
  };

  const handleSaveSignature = async (dataUrl:string) => {
    if(!solicitacao)return; setUploadingAssinatura(true);
    try {
      const r=await fetch(dataUrl); const b=await r.blob(); const file=new File([b],'assinatura.png',{type:'image/png'});
      const name=`solicitacao_${solicitacao.id}/assinatura.png`;
      const {error}=await supabase.storage.from('instrutor-documentos').upload(name,file,{upsert:true}); if(error)throw error;
      const {data:{publicUrl}}=supabase.storage.from('instrutor-documentos').getPublicUrl(name);
      setAssinaturaUrl(publicUrl); setShowSignaturePad(false); toast.success('Assinatura salva');
    } catch(e){console.error(e);toast.error('Erro');} finally{setUploadingAssinatura(false);}
  };

  const handleEnviarPergunta = async () => {
    if(!solicitacao||!novaPerguntaCampo||!novaPerguntaTexto.trim())return; setEnviandoPergunta(true);
    try {
      const db=supabase as any;
      await db.from('instrutor_solicitacao_perguntas').insert({solicitacao_id:solicitacao.id,campo:novaPerguntaCampo,pergunta:novaPerguntaTexto.trim()});
      toast.success('Pergunta enviada'); setPerguntaDialogOpen(false); setNovaPerguntaCampo(''); setNovaPerguntaTexto(''); fetchSolicitacao();
    } catch(e){console.error(e);toast.error('Erro');} finally{setEnviandoPergunta(false);}
  };

  const hasFormacaoComTreinamento = () => formacoes.length > 0 && formacoes.some(f => f.treinamentos.length > 0);

  const isFormComplete = () => nome.trim()&&cpf.replace(/\D/g,'')&&telefone.replace(/\D/g,'')&&email.trim()&&cep.replace(/\D/g,'')&&logradouro.trim()&&bairro.trim()&&numero.trim()&&cidade.trim()&&uf&&hasFormacaoComTreinamento()&&assinaturaUrl&&(informarVeiculo==='nao'||(veiculo.trim()&&placa.trim()));

  const getAnexosPendentes = (): { tipo: string; nome: string }[] => {
    const pendentes: { tipo: string; nome: string }[] = [];
    formacoes.forEach(f => {
      if (!f.anexo_url) {
        pendentes.push({ tipo: 'Formação', nome: f.nome });
      }
      f.treinamentos.forEach(t => {
        if (!t.anexo_url) {
          pendentes.push({ tipo: 'Treinamento', nome: `${t.nome} (${f.nome})` });
        }
      });
    });
    return pendentes;
  };

  const hasAnexosPendentes = () => getAnexosPendentes().length > 0;

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (formacoes.length === 0) {
      errors.push('Adicione pelo menos 1 formação acadêmica');
    } else if (!formacoes.some(f => f.treinamentos.length > 0)) {
      errors.push('Vincule pelo menos 1 treinamento a uma formação');
    }
    if (possuiEquipamentos === 'sim') {
      const treinamentosComEquip = Object.keys(equipamentosPorTreinamento).filter(k => equipamentosPorTreinamento[k]?.length > 0);
      if (treinamentosComEquip.length === 0) {
        errors.push('Informe pelo menos 1 equipamento para algum treinamento');
      }
    }
    return errors;
  };

  const handleEnviarParaAvaliacao = async () => {
    if(!solicitacao||!isFormComplete())return;
    
    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('\n'), { duration: 8000 });
      return;
    }
    
    const anexosPendentes = getAnexosPendentes();
    if (anexosPendentes.length > 0) {
      const listaAnexos = anexosPendentes.map(a => `• ${a.tipo}: ${a.nome}`).join('\n');
      toast.error(`Existem anexos pendentes de envio:\n${listaAnexos}`, { duration: 8000 });
      return;
    }
    
    setSaving(true);
    try {
      await saveData();
      const db=supabase as any;
      await db.from('instrutor_solicitacoes').update({status:'enviado',enviado_em:new Date().toISOString()}).eq('id',solicitacao.id);
      toast.success('Enviado para avaliação!'); fetchSolicitacao();
    } catch(e){console.error(e);toast.error('Erro');} finally{setSaving(false);}
  };

  const isLocked = solicitacao?.status==='enviado'||solicitacao?.status==='aprovado';
  const formacaoAtual = formacoes.find(f=>f.id===formacaoSelecionada);
  const treinamentosDisponiveisParaFormacao = treinamentosDisponiveis.filter(t=>!formacaoAtual?.treinamentos.some(ft=>ft.treinamento_id===t.id));

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  if(!solicitacao) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Card className="max-w-md"><CardContent className="pt-6 text-center"><AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4"/><h2 className="text-xl font-semibold mb-2">Link Inválido</h2></CardContent></Card></div>;

  const steps = [{n:1,t:'Dados Pessoais',i:User},{n:2,t:'Endereço',i:MapPin},{n:3,t:'Formações',i:Briefcase},{n:4,t:'Assinatura',i:FileSignature}];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Cadastro de Instrutor</h1>
          <div className="mt-4 flex justify-center gap-2">
            {solicitacao.status==='rascunho'&&<Badge variant="outline"><Pencil className="h-3 w-3 mr-1"/>Rascunho</Badge>}
            {solicitacao.status==='enviado'&&<Badge variant="outline" className="bg-blue-50 text-blue-700"><Send className="h-3 w-3 mr-1"/>Aguardando Avaliação</Badge>}
            {solicitacao.status==='aprovado'&&<Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1"/>Aprovado</Badge>}
            {solicitacao.status==='rejeitado'&&<Badge variant="outline" className="bg-red-50 text-red-700"><AlertCircle className="h-3 w-3 mr-1"/>Rejeitado</Badge>}
            {saving&&<Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Salvando...</Badge>}
          </div>
          {solicitacao.status==='rejeitado'&&solicitacao.motivo_rejeicao&&<Card className="mt-4 border-red-200 bg-red-50"><CardContent className="py-3"><p className="text-sm text-red-700"><strong>Motivo:</strong> {solicitacao.motivo_rejeicao}</p></CardContent></Card>}
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {steps.map((s,i)=>(
              <React.Fragment key={s.n}>
                <button onClick={()=>!isLocked&&setCurrentStep(s.n)} disabled={isLocked} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",currentStep===s.n?"bg-primary text-primary-foreground":"bg-white border hover:bg-slate-50",isLocked&&"opacity-50 cursor-not-allowed")}>
                  <s.i className="h-4 w-4"/><span className="hidden sm:inline">{s.t}</span><span className="sm:hidden">{s.n}</span>
                </button>
                {i<steps.length-1&&<div className="w-8 h-0.5 bg-slate-200"/>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {currentStep===1&&(
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label>Nome Completo *</Label><Input value={nome} onChange={e=>setNome(e.target.value)} disabled={isLocked}/></div>
                  <div><Label>CPF *</Label><Input value={cpf} onChange={e=>setCpf(formatCpf(e.target.value))} maxLength={14} disabled={isLocked}/></div>
                  <div><Label>Data de Nascimento</Label><Input type="date" value={dataNascimento} onChange={e=>setDataNascimento(e.target.value)} disabled={isLocked}/></div>
                  <div><Label>Telefone *</Label><Input value={telefone} onChange={e=>setTelefone(formatTelefone(e.target.value))} maxLength={15} disabled={isLocked}/></div>
                  <div><Label>E-mail *</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={isLocked}/></div>
                </div>
                <div className="border-t pt-4">
                  <Label className="mb-3 block">Possui veículo próprio?</Label>
                  <RadioGroup value={informarVeiculo} onValueChange={v=>setInformarVeiculo(v as 'sim'|'nao')} disabled={isLocked} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="v-sim"/><Label htmlFor="v-sim">Sim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="v-nao"/><Label htmlFor="v-nao">Não</Label></div>
                  </RadioGroup>
                  {informarVeiculo==='sim'&&(
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div><Label>Veículo *</Label><Input value={veiculo} onChange={e=>setVeiculo(e.target.value)} disabled={isLocked}/></div>
                      <div><Label>Placa *</Label><Input value={placa} onChange={e=>setPlaca(e.target.value.toUpperCase())} maxLength={8} disabled={isLocked}/></div>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <Label className="mb-3 block">Possui equipamentos próprios para treinamentos?</Label>
                  <RadioGroup value={possuiEquipamentos} onValueChange={v=>setPossuiEquipamentos(v as 'sim'|'nao')} disabled={isLocked} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="eq-sim"/><Label htmlFor="eq-sim">Sim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="eq-nao"/><Label htmlFor="eq-nao">Não</Label></div>
                  </RadioGroup>
                  {possuiEquipamentos==='sim'&&(
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                      <p className="text-sm text-purple-700">Informe os equipamentos que você possui para cada treinamento</p>
                      <div>
                        <Label className="text-purple-700 text-sm">Selecione o treinamento</Label>
                        <Select value={treinamentoEquipSelecionado} onValueChange={setTreinamentoEquipSelecionado} disabled={isLocked}>
                          <SelectTrigger className="bg-white mt-1"><SelectValue placeholder="Selecione um treinamento..."/></SelectTrigger>
                          <SelectContent>{treinamentosDisponiveis.map(t=><SelectItem key={t.id} value={t.id}>{t.norma} - {t.nome}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {treinamentoEquipSelecionado&&!isLocked&&(
                        <div className="flex gap-2">
                          <div className="flex-1"><Label className="text-xs text-purple-700">Nome do equipamento</Label><Input placeholder="Ex: Multímetro, EPI..." value={novoEquipNome} onChange={e=>setNovoEquipNome(e.target.value)} className="bg-white"/></div>
                          <div className="w-20"><Label className="text-xs text-purple-700">Qtd</Label><Input type="number" min={1} value={novoEquipQtd} onChange={e=>setNovoEquipQtd(parseInt(e.target.value)||1)} className="bg-white"/></div>
                          <div className="flex items-end"><Button type="button" size="sm" onClick={()=>{if(novoEquipNome.trim()){setEquipamentosPorTreinamento(prev=>{const c=prev[treinamentoEquipSelecionado]||[];return{...prev,[treinamentoEquipSelecionado]:[...c,{nome:novoEquipNome.trim(),quantidade:novoEquipQtd}]};});setNovoEquipNome('');setNovoEquipQtd(1);}}} disabled={!novoEquipNome.trim()} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4"/></Button></div>
                        </div>
                      )}
                      {treinamentoEquipSelecionado&&(equipamentosPorTreinamento[treinamentoEquipSelecionado]||[]).length>0&&(
                        <div className="bg-white rounded border border-purple-200 p-2">
                          <p className="text-xs text-purple-600 mb-2">Equipamentos cadastrados:</p>
                          <div className="space-y-1">{equipamentosPorTreinamento[treinamentoEquipSelecionado].map((eq,i)=>(
                            <div key={i} className="flex items-center justify-between bg-purple-50 px-2 py-1 rounded text-sm">
                              <span>{eq.nome} <span className="text-purple-600">(x{eq.quantidade})</span></span>
                              {!isLocked&&<button type="button" onClick={()=>setEquipamentosPorTreinamento(prev=>({...prev,[treinamentoEquipSelecionado]:prev[treinamentoEquipSelecionado].filter((_,idx)=>idx!==i)}))} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3"/></button>}
                            </div>
                          ))}</div>
                        </div>
                      )}
                      {Object.keys(equipamentosPorTreinamento).filter(k=>(equipamentosPorTreinamento[k]||[]).length>0).length>0&&(
                        <div className="pt-3 border-t border-purple-200">
                          <p className="text-xs font-medium text-purple-800 mb-2">Resumo de equipamentos:</p>
                          <div className="space-y-2">{Object.entries(equipamentosPorTreinamento).filter(([_,eqs])=>eqs.length>0).map(([tid,eqs])=>{
                            const t=treinamentosDisponiveis.find(x=>x.id===tid);
                            return <div key={tid} className="bg-white rounded p-2 text-xs"><p className="font-medium text-purple-700">{t?.norma} - {t?.nome}</p><div className="flex flex-wrap gap-1 mt-1">{eqs.map((eq,i)=><span key={i} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{eq.nome} (x{eq.quantidade})</span>)}</div></div>;
                          })}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep===2&&(
              <div className="space-y-4">
                <div><Label>CEP *</Label><div className="flex gap-2"><Input value={cep} onChange={e=>{const f=formatCep(e.target.value);setCep(f);if(f.replace(/\D/g,'').length===8)buscarCep(f);}} maxLength={9} disabled={isLocked}/>{loadingCep&&<Loader2 className="h-4 w-4 animate-spin self-center"/>}</div></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3"><Label>Logradouro *</Label><Input value={logradouro} onChange={e=>setLogradouro(e.target.value)} disabled={isLocked}/></div>
                  <div><Label>Número *</Label><Input value={numero} onChange={e=>setNumero(e.target.value)} disabled={isLocked}/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Complemento</Label><Input value={complemento} onChange={e=>setComplemento(e.target.value)} disabled={isLocked}/></div>
                  <div><Label>Bairro *</Label><Input value={bairro} onChange={e=>setBairro(e.target.value)} disabled={isLocked}/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Cidade *</Label><Input value={cidade} onChange={e=>setCidade(e.target.value)} disabled={isLocked}/></div>
                  <div><Label>UF *</Label><Select value={uf} onValueChange={setUf} disabled={isLocked}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{ESTADOS_BR.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
            )}

            {currentStep===3&&(
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><h3 className="font-semibold">Formações Acadêmicas</h3><p className="text-sm text-muted-foreground">Adicione suas formações e vincule treinamentos</p></div>
                  {!isLocked&&<Button onClick={()=>setShowAddFormacao(true)}><Plus className="h-4 w-4 mr-2"/>Adicionar</Button>}
                </div>
                {formacoes.length===0?<Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground"><Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50"/><p>Nenhuma formação</p></CardContent></Card>:(
                  <div className="space-y-4">
                    {formacoes.map(f=>(
                      <Card key={f.id} className="transition-colors border-primary/30">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{f.nome}</CardTitle>
                              {f.registro_tipo&&<CardDescription>{f.registro_tipo} {f.registro_numero} - {f.registro_estado}</CardDescription>}
                            </div>
                            <div className="flex items-center gap-1">
                              {!isLocked&&<label className="cursor-pointer"><input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{const file=e.target.files?.[0];if(file){processFormacaoFile(f.id,file);e.target.value='';};}}/><Button variant="outline" size="sm" className={f.anexo_url?"text-green-600 border-green-200":"text-amber-600 border-amber-200"} asChild><span>{f.anexo_url?<><FileText className="h-4 w-4 mr-1"/>Trocar</>:<><Upload className="h-4 w-4 mr-1"/>Anexar</>}</span></Button></label>}
                              {f.anexo_url&&<a href={f.anexo_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50"><FileText className="h-4 w-4 mr-1"/>Ver</Button></a>}
                              {!isLocked&&<Button variant="ghost" size="sm" onClick={()=>handleRemoveFormacao(f.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>}
                            </div>
                          </div>
                        </CardHeader>
                        {/* Treinamentos sempre visíveis - sem precisar clicar */}
                        <CardContent className="border-t pt-4 bg-slate-50/50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-primary"/>
                              <Label className="text-sm font-medium">Treinamentos Vinculados</Label>
                              <Badge variant="secondary" className="text-xs">{f.treinamentos.length}</Badge>
                            </div>
                            {!isLocked&&<Button variant="default" size="sm" onClick={()=>{setFormacaoSelecionada(f.id);setShowAddTreinamento(true);}} className="bg-primary hover:bg-primary/90"><Plus className="h-3 w-3 mr-1"/>Vincular Treinamento</Button>}
                          </div>
                          {f.treinamentos.length===0?(
                            <div className="text-center py-4 border-2 border-dashed rounded-lg bg-white">
                              <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2"/>
                              <p className="text-sm text-muted-foreground mb-2">Nenhum treinamento vinculado</p>
                              {!isLocked&&<Button variant="outline" size="sm" onClick={()=>{setFormacaoSelecionada(f.id);setShowAddTreinamento(true);}}><Plus className="h-3 w-3 mr-1"/>Adicionar primeiro treinamento</Button>}
                            </div>
                          ):(
                            <div className="space-y-2">
                              {f.treinamentos.map(t=>(
                                <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono">{t.norma}</Badge>
                                    <span className="text-sm">{t.nome}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!isLocked&&<label className="cursor-pointer"><input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>{const file=e.target.files?.[0];if(file){processTreinamentoFile(f.id,t.id,file);e.target.value='';};}}/><Button variant="outline" size="sm" className={t.anexo_url?"text-green-600 border-green-200 h-7":"text-amber-600 border-amber-200 h-7"} asChild><span className="text-xs">{t.anexo_url?<><FileText className="h-3 w-3 mr-1"/>Trocar</>:<><Upload className="h-3 w-3 mr-1"/>Anexar</>}</span></Button></label>}
                                    {t.anexo_url&&<a href={t.anexo_url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7"><FileText className="h-3 w-3 mr-1"/><span className="text-xs">Ver</span></Button></a>}
                                    {!isLocked&&<Button variant="ghost" size="sm" className="h-7" onClick={()=>handleRemoveTreinamento(f.id,t.id)}><Trash2 className="h-3 w-3 text-red-500"/></Button>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep===4&&(
              <div className="space-y-6">
                <div><h3 className="font-semibold mb-2">Assinatura Digital *</h3><p className="text-sm text-muted-foreground mb-4">Upload ou desenhe sua assinatura</p>
                  <RadioGroup value={assinaturaTipo} onValueChange={v=>setAssinaturaTipo(v as 'upload'|'desenho')} disabled={isLocked} className="flex gap-4 mb-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="upload" id="a-up"/><Label htmlFor="a-up">Upload</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="desenho" id="a-dr"/><Label htmlFor="a-dr">Desenhar</Label></div>
                  </RadioGroup>
                  {assinaturaTipo==='upload'?(
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      {assinaturaUrl?(<div className="space-y-4"><img src={assinaturaUrl} alt="Assinatura" className="max-h-32 mx-auto border rounded"/>{!isLocked&&<label className="cursor-pointer"><input type="file" className="hidden" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)handleUploadAssinatura(f);}}/><Button variant="outline" asChild><span><Upload className="h-4 w-4 mr-2"/>Trocar</span></Button></label>}</div>):(<label className="cursor-pointer"><input type="file" className="hidden" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)handleUploadAssinatura(f);}} disabled={isLocked}/><div className="space-y-2"><Upload className="h-12 w-12 mx-auto text-muted-foreground"/><p className="text-muted-foreground">Clique para upload</p></div></label>)}
                      {uploadingAssinatura&&<div className="mt-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    </div>
                  ):(
                    <div className="space-y-4">
                      {assinaturaUrl?(<div className="space-y-4"><img src={assinaturaUrl} alt="Assinatura" className="max-h-32 mx-auto border rounded"/>{!isLocked&&<Button variant="outline" onClick={()=>setShowSignaturePad(true)}><Pencil className="h-4 w-4 mr-2"/>Redesenhar</Button>}</div>):(<Button variant="outline" onClick={()=>setShowSignaturePad(true)} disabled={isLocked} className="w-full py-8"><FileSignature className="h-8 w-8 mr-2"/>Clique para desenhar</Button>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-4 border-t">
              <div>{currentStep>1&&<Button variant="outline" onClick={()=>setCurrentStep(currentStep-1)} disabled={isLocked}>Anterior</Button>}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={()=>setPerguntaDialogOpen(true)}><HelpCircle className="h-4 w-4 mr-2"/>Dúvidas{perguntas.length>0&&<Badge variant="secondary" className="ml-2">{perguntas.length}</Badge>}</Button>
                {currentStep<4?<Button onClick={()=>setCurrentStep(currentStep+1)} disabled={isLocked}>Próximo</Button>:<Button onClick={handleEnviarParaAvaliacao} disabled={!isFormComplete()||isLocked||saving||hasAnexosPendentes()} className="bg-green-600 hover:bg-green-700" title={hasAnexosPendentes()?'Existem anexos pendentes de envio':''}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:<Send className="h-4 w-4 mr-2"/>}Enviar para Avaliação</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Campos Obrigatórios</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className={cn("flex items-center gap-1",nome.trim()?"text-green-600":"text-muted-foreground")}>{nome.trim()?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}Nome</div>
          <div className={cn("flex items-center gap-1",cpf.replace(/\D/g,'')?"text-green-600":"text-muted-foreground")}>{cpf.replace(/\D/g,'')?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}CPF</div>
          <div className={cn("flex items-center gap-1",telefone.replace(/\D/g,'')?"text-green-600":"text-muted-foreground")}>{telefone.replace(/\D/g,'')?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}Telefone</div>
          <div className={cn("flex items-center gap-1",email.trim()?"text-green-600":"text-muted-foreground")}>{email.trim()?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}E-mail</div>
          <div className={cn("flex items-center gap-1",cep.replace(/\D/g,'')?"text-green-600":"text-muted-foreground")}>{cep.replace(/\D/g,'')?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}CEP</div>
          <div className={cn("flex items-center gap-1",logradouro.trim()?"text-green-600":"text-muted-foreground")}>{logradouro.trim()?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}Endereço</div>
          <div className={cn("flex items-center gap-1",hasFormacaoComTreinamento()?"text-green-600":"text-muted-foreground")}>{hasFormacaoComTreinamento()?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}Formação + Treinamento</div>
          <div className={cn("flex items-center gap-1",assinaturaUrl?"text-green-600":"text-muted-foreground")}>{assinaturaUrl?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}Assinatura</div>
          <div className={cn("flex items-center gap-1",!hasAnexosPendentes()?"text-green-600":"text-orange-500")}>{!hasAnexosPendentes()?<CheckCircle2 className="h-3 w-3"/>:<Upload className="h-3 w-3"/>}Anexos ({getAnexosPendentes().length} pendentes)</div>
        </div></CardContent></Card>
      </div>

      <Dialog open={showAddFormacao} onOpenChange={setShowAddFormacao}><DialogContent><DialogHeader><DialogTitle>Adicionar Formação</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Formação *</Label><Select value={novaFormacaoNome} onValueChange={setNovaFormacaoNome}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{FORMACOES_ACADEMICAS.map(f=><SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Tipo de Registro</Label><Select value={novaFormacaoTipo} onValueChange={setNovaFormacaoTipo}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{TIPOS_REGISTRO.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Número</Label><Input value={novaFormacaoNumero} onChange={e=>setNovaFormacaoNumero(e.target.value)}/></div><div><Label>Estado</Label><Select value={novaFormacaoEstado} onValueChange={setNovaFormacaoEstado}><SelectTrigger><SelectValue placeholder="UF"/></SelectTrigger><SelectContent>{ESTADOS_BR.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowAddFormacao(false)}>Cancelar</Button><Button onClick={handleAddFormacao}>Adicionar</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={showAddTreinamento} onOpenChange={setShowAddTreinamento}><DialogContent><DialogHeader><DialogTitle>Vincular Treinamento</DialogTitle></DialogHeader>
        <div><Label>Treinamento</Label><Select value={treinamentoSelecionado} onValueChange={setTreinamentoSelecionado}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{treinamentosDisponiveisParaFormacao.map(t=><SelectItem key={t.id} value={t.id}>{t.norma} - {t.nome}</SelectItem>)}</SelectContent></Select></div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowAddTreinamento(false)}>Cancelar</Button><Button onClick={handleAddTreinamento} disabled={!treinamentoSelecionado}>Vincular</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={perguntaDialogOpen} onOpenChange={setPerguntaDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dúvidas e Suporte</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {perguntas.length>0&&<div className="space-y-3 max-h-60 overflow-y-auto">{perguntas.map(p=><div key={p.id} className="border rounded-lg p-3"><div className="flex items-center justify-between mb-1"><Badge variant="outline">{CAMPOS_FORMULARIO.find(c=>c.value===p.campo)?.label||p.campo}</Badge><Badge variant={p.status==='respondido'?'default':'secondary'}>{p.status==='respondido'?'Respondido':'Pendente'}</Badge></div><p className="text-sm">{p.pergunta}</p>{p.resposta&&<div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800"><strong>Resposta:</strong> {p.resposta}</div>}</div>)}</div>}
          <div className="border-t pt-4"><h4 className="font-medium mb-3">Nova Pergunta</h4><div className="space-y-3"><div><Label>Campo relacionado</Label><Select value={novaPerguntaCampo} onValueChange={setNovaPerguntaCampo}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{CAMPOS_FORMULARIO.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Sua dúvida</Label><Textarea value={novaPerguntaTexto} onChange={e=>setNovaPerguntaTexto(e.target.value)} rows={3}/></div></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setPerguntaDialogOpen(false)}>Fechar</Button><Button onClick={handleEnviarPergunta} disabled={!novaPerguntaCampo||!novaPerguntaTexto.trim()||enviandoPergunta}>{enviandoPergunta?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:<Send className="h-4 w-4 mr-2"/>}Enviar Pergunta</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}><DialogContent><DialogHeader><DialogTitle>Desenhar Assinatura</DialogTitle></DialogHeader>
        <SignaturePad onSave={handleSaveSignature} onCancel={()=>setShowSignaturePad(false)}/>
      </DialogContent></Dialog>

      {/* Dialog de confirmação para upload de PDF/DOCX */}
      <AlertDialog open={documentConfirmOpen} onOpenChange={setDocumentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <FileWarning className="h-5 w-5" />
              Funcionalidade Experimental
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está enviando um arquivo <strong>{pendingDocumentFile ? getFileExtension(pendingDocumentFile).toUpperCase() : ''}</strong>.
              </p>
              <p>
                Vamos extrair apenas a <strong>primeira página</strong> do documento e convertê-la para imagem (JPG) como comprovante.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                <p className="text-sm flex items-start gap-2">
                  <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
                  <span>
                    <strong>Recomendação:</strong> Para melhor qualidade, envie como <strong>imagem digital</strong> (JPG/PNG) ou <strong>documento escaneado</strong> em formato de imagem.
                  </span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Tem certeza que deseja continuar com o envio do {pendingDocumentFile ? getFileExtension(pendingDocumentFile).toUpperCase() : 'documento'}?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDocumentUpload} disabled={convertingDocument}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDocumentUpload}
              disabled={convertingDocument}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {convertingDocument ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                'Sim, enviar mesmo assim'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
