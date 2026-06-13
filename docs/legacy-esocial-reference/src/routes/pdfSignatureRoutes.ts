import { Router, Request, Response } from 'express';
import { pdfSignatureService, DadosAssinatura } from '../services/pdfSignatureService';
import { logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase client para buscar certificado da empresa
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const getSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY sao obrigatorios');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * POST /pdf/sign
 * Assina um PDF com certificado A1 ICP-Brasil da empresa
 * 
 * Body:
 * - pdfBase64: string (PDF em base64)
 * - empresaId: string (ID da empresa SST)
 * - documentoTipo: string (ex: "Certificado de Treinamento NR-06")
 * - documentoId?: string (ID opcional do documento)
 * - razao?: string (razao da assinatura)
 * - local?: string (local da assinatura)
 */
router.post('/sign', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, empresaId, documentoTipo, documentoId, razao, local } = req.body;
    
    // Validacoes
    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        error: 'pdfBase64 e obrigatorio',
      });
    }
    
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        error: 'empresaId e obrigatorio',
      });
    }
    
    if (!documentoTipo) {
      return res.status(400).json({
        success: false,
        error: 'documentoTipo e obrigatorio',
      });
    }
    
    // Buscar certificado da empresa no Supabase
    const supabase = getSupabase();
    
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, cidade, estado, certificado_a1_base64, certificado_a1_senha')
      .eq('id', empresaId)
      .single();
    
    if (empresaError || !empresa) {
      logger.error('Empresa nao encontrada:', empresaError);
      return res.status(404).json({
        success: false,
        error: 'Empresa nao encontrada',
      });
    }
    
    if (!empresa.certificado_a1_base64 || !empresa.certificado_a1_senha) {
      return res.status(400).json({
        success: false,
        error: 'Certificado A1 nao configurado para esta empresa. Configure em Configuracoes > Certificado Digital.',
      });
    }
    
    // Preparar dados
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pfxBuffer = Buffer.from(empresa.certificado_a1_base64, 'base64');
    
    const dadosAssinatura: DadosAssinatura = {
      nomeEmpresa: empresa.nome,
      cnpj: empresa.cnpj || '',
      razao: razao || `Certificado de Treinamento SST - ${documentoTipo}`,
      local: local || `${empresa.cidade || ''} - ${empresa.estado || 'Brasil'}`,
      documentoTipo,
      documentoId,
    };
    
    // Assinar PDF
    const resultado = await pdfSignatureService.assinarPdf(
      pdfBuffer,
      { pfxBuffer, senha: empresa.certificado_a1_senha },
      dadosAssinatura
    );
    
    if (!resultado.success) {
      return res.status(400).json({
        success: false,
        error: resultado.error,
      });
    }
    
    logger.info('PDF assinado com sucesso', {
      empresaId,
      documentoTipo,
      cn: resultado.certificadoInfo?.cn,
    });
    
    res.json({
      success: true,
      pdfBase64: resultado.pdfAssinado?.toString('base64'),
      certificadoInfo: resultado.certificadoInfo,
    });
    
  } catch (error: any) {
    logger.error('Erro ao assinar PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao assinar PDF',
    });
  }
});

/**
 * POST /pdf/validate-certificate
 * Valida um certificado A1 (.pfx) sem assinar nada
 * Util para verificar se o certificado esta correto antes de salvar
 * 
 * Body:
 * - pfxBase64: string (arquivo .pfx em base64)
 * - senha: string (senha do certificado)
 */
router.post('/validate-certificate', async (req: Request, res: Response) => {
  try {
    const { pfxBase64, senha } = req.body;
    
    if (!pfxBase64) {
      return res.status(400).json({
        success: false,
        error: 'pfxBase64 e obrigatorio',
      });
    }
    
    if (!senha) {
      return res.status(400).json({
        success: false,
        error: 'senha e obrigatoria',
      });
    }
    
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    
    // Tentar extrair certificado
    const certInfo = pdfSignatureService.extrairCertificado(pfxBuffer, senha);
    
    // Validar validade
    const validacao = pdfSignatureService.validarCertificado(certInfo);
    
    res.json({
      success: true,
      valido: validacao.valido,
      mensagem: validacao.mensagem,
      certificado: {
        cn: certInfo.cn,
        ou: certInfo.ou,
        o: certInfo.o,
        serialNumber: certInfo.serialNumber,
        validoDe: certInfo.validoDe.toISOString(),
        validoAte: certInfo.validoAte.toISOString(),
        emissor: certInfo.emissor,
      },
    });
    
  } catch (error: any) {
    logger.error('Erro ao validar certificado:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Certificado invalido ou senha incorreta',
    });
  }
});

/**
 * GET /pdf/certificate-info/:empresaId
 * Retorna informacoes do certificado configurado para uma empresa
 */
router.get('/certificate-info/:empresaId', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.params;
    
    const supabase = getSupabase();
    
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('certificado_a1_base64, certificado_a1_senha, certificado_a1_cn, certificado_a1_validade')
      .eq('id', empresaId)
      .single();
    
    if (error || !empresa) {
      return res.status(404).json({
        success: false,
        error: 'Empresa nao encontrada',
      });
    }
    
    if (!empresa.certificado_a1_base64) {
      return res.json({
        success: true,
        configurado: false,
        mensagem: 'Certificado A1 nao configurado',
      });
    }
    
    // Se temos dados pre-extraidos, usar
    if (empresa.certificado_a1_cn && empresa.certificado_a1_validade) {
      const validade = new Date(empresa.certificado_a1_validade);
      const agora = new Date();
      
      return res.json({
        success: true,
        configurado: true,
        valido: validade > agora,
        certificado: {
          cn: empresa.certificado_a1_cn,
          validoAte: empresa.certificado_a1_validade,
          expirado: validade <= agora,
        },
      });
    }
    
    // Senao, extrair do certificado
    try {
      const pfxBuffer = Buffer.from(empresa.certificado_a1_base64, 'base64');
      const certInfo = pdfSignatureService.extrairCertificado(pfxBuffer, empresa.certificado_a1_senha);
      const validacao = pdfSignatureService.validarCertificado(certInfo);
      
      res.json({
        success: true,
        configurado: true,
        valido: validacao.valido,
        certificado: {
          cn: certInfo.cn,
          ou: certInfo.ou,
          o: certInfo.o,
          validoDe: certInfo.validoDe.toISOString(),
          validoAte: certInfo.validoAte.toISOString(),
          emissor: certInfo.emissor,
          expirado: !validacao.valido,
        },
      });
    } catch (certError: any) {
      res.json({
        success: true,
        configurado: true,
        valido: false,
        error: 'Erro ao ler certificado: ' + certError.message,
      });
    }
    
  } catch (error: any) {
    logger.error('Erro ao buscar info do certificado:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno',
    });
  }
});

export default router;
