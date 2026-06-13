import { Router, Request, Response } from 'express';
import { createESocialService } from '../services/esocialService';
import { env, requireEmpresaIdHeader } from '../config/env';
import { groupConfigService } from '../services/groupConfigService';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = Router();

const getEmpresaId = (req: Request): string | undefined => {
  return (req.headers['x-empresa-id'] as string | undefined)
    || (req.headers['x-group-id'] as string | undefined); // compatibilidade temporaria
};

const requireEmpresaId = (req: Request): string | null => {
  const empresaId = getEmpresaId(req);

  if (requireEmpresaIdHeader && !empresaId) return null;
  return empresaId || null;
};

const requireApiKeyForConfig = (req: Request, res: Response): boolean => {
  if (!env.API_SECRET_KEY) {
    if (env.NODE_ENV === 'production') {
      res.status(500).json({
        success: false,
        error: 'API_SECRET_KEY nao configurada no backend para rotas de configuracao',
      });
      return false;
    }

    return true;
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== env.API_SECRET_KEY) {
    res.status(401).json({
      success: false,
      error: 'API key invalida para rota de configuracao',
    });
    return false;
  }

  return true;
};

const eventoS2210Schema = z.object({
  cpfTrabalhador: z.string().length(11),
  matricula: z.string().optional(),
  codCateg: z.string(),
  dtAcid: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tpAcid: z.string(),
  hrAcid: z.string().optional(),
  hrsTrabAntesAcid: z.string().optional(),
  tpCat: z.string(),
  indCatObito: z.enum(['S', 'N']),
  dtObito: z.string().optional(),
  indComunPolicia: z.enum(['S', 'N']),
  codSitGeradora: z.string(),
  iniciatCAT: z.string(),
  obsCAT: z.string().optional(),
  tpLocal: z.string(),
  dscLocal: z.string().optional(),
  codParteAting: z.string(),
  lateralidade: z.string(),
  codAgntCausador: z.string(),
  dtAtendimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hrAtendimento: z.string().optional(),
  indInternacao: z.enum(['S', 'N']),
  durTrat: z.string(),
  indAfast: z.enum(['S', 'N']),
  dscLesao: z.string(),
  dscCompLesao: z.string().optional(),
  diagProvavel: z.string().optional(),
  codCID: z.string(),
  observacao: z.string().optional(),
  nmEmit: z.string(),
  ideOC: z.string(),
  nrOC: z.string(),
  ufOC: z.string().optional(),
});

const eventoS2220Schema = z.object({
  cpfTrabalhador: z.string().length(11),
  matricula: z.string().optional(),
  codCateg: z.string(),
  dtAso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tpAso: z.string(),
  resAso: z.string(),
  exames: z.array(z.object({
    dtExm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    procRealizado: z.string(),
    obsProc: z.string().optional(),
    ordExame: z.string(),
    indResult: z.string().optional(),
  })),
  nmMed: z.string(),
  nrCRM: z.string(),
  ufCRM: z.string().length(2),
});

const eventoS2240Schema = z.object({
  cpfTrabalhador: z.string().length(11),
  matricula: z.string().optional(),
  codCateg: z.string(),
  dtIniCondicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  codAmb: z.string(),
  localAmb: z.string(),
  dscSetor: z.string(),
  tpInsc: z.string().optional(),
  nrInsc: z.string().optional(),
  dscAtivDes: z.string(),
  agentesNocivos: z.array(z.object({
    codAgNoc: z.string(),
    dscAgNoc: z.string().optional(),
    tpAval: z.string().optional(),
    intConc: z.string().optional(),
    limTol: z.string().optional(),
    unMed: z.string().optional(),
    tecMedicao: z.string().optional(),
    epiEficaz: z.enum(['S', 'N']).optional(),
    epcEficaz: z.enum(['S', 'N']).optional(),
    utilizEPC: z.string().optional(),
    utilizEPI: z.string().optional(),
  })),
  cpfResp: z.string().length(11),
  nmResp: z.string(),
  nrOC: z.string(),
  ideOC: z.string(),
});

const integrationConfigSchema = z.object({
  govbrClientId: z.string().trim().optional().nullable(),
  govbrClientSecret: z.string().trim().optional().nullable(),
  govbrRedirectUri: z.string().trim().optional().nullable(),
  govbrEnvironment: z.enum(['staging', 'production']).optional().nullable(),
  esocialCertBase64: z.string().trim().optional().nullable(),
  esocialCertPassword: z.string().trim().optional().nullable(),
  esocialTipoInscricao: z.enum(['1', '2', '3', '4', '5', '6']).optional().nullable(),
  esocialNrInscricao: z.string().trim().optional().nullable(),
  esocialAmbiente: z.enum(['1', '2']).optional().nullable(),
  certificadoAlias: z.string().trim().max(255).optional().nullable(),
  certificadoValidoAte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  clearGovbrClientSecret: z.boolean().optional(),
  clearEsocialCert: z.boolean().optional(),
  clearEsocialCertPassword: z.boolean().optional(),
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    if (!requireApiKeyForConfig(req, res)) return;

    const empresaId = requireEmpresaId(req);
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para rota de configuracao',
      });
    }

    const config = await groupConfigService.getEmpresaIntegrationPublicView(empresaId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuracao de integracao nao encontrada para esta empresa',
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar configuracao de integracao:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar configuracao',
    });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    if (!requireApiKeyForConfig(req, res)) return;

    const empresaId = requireEmpresaId(req);
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para rota de configuracao',
      });
    }

    const validated = integrationConfigSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload de configuracao invalido',
        details: validated.error.flatten().fieldErrors,
      });
    }

    const payload = validated.data;

    await groupConfigService.upsertEmpresaIntegration(empresaId, {
      govbrClientId: payload.govbrClientId,
      govbrClientSecret: payload.clearGovbrClientSecret ? null : payload.govbrClientSecret,
      govbrRedirectUri: payload.govbrRedirectUri,
      govbrEnvironment: payload.govbrEnvironment,
      esocialCertBase64: payload.clearEsocialCert ? null : payload.esocialCertBase64,
      esocialCertPassword: payload.clearEsocialCertPassword ? null : payload.esocialCertPassword,
      esocialTipoInscricao: payload.esocialTipoInscricao,
      esocialNrInscricao: payload.esocialNrInscricao,
      esocialAmbiente: payload.esocialAmbiente,
      certificadoAlias: payload.certificadoAlias,
      certificadoValidoAte: payload.certificadoValidoAte,
    });

    const updated = await groupConfigService.getEmpresaIntegrationPublicView(empresaId);

    res.json({
      success: true,
      message: 'Configuracao de integracao atualizada com sucesso',
      config: updated,
    });
  } catch (error: any) {
    logger.error('Erro ao salvar configuracao de integracao:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao salvar configuracao',
    });
  }
});

router.post('/evento/s2210', async (req: Request, res: Response) => {
  try {
    const validacao = eventoS2210Schema.safeParse(req.body);

    if (!validacao.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados invalidos',
        details: validacao.error.flatten().fieldErrors,
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const esocialService = await createESocialService(empresaId || undefined);

    const resultado = await esocialService.enviarLote([{
      tipo: 'S-2210',
      dados: validacao.data,
    }]);

    if (resultado.success) {
      res.json({
        success: true,
        protocolo: resultado.protocolo,
        idLote: resultado.idLote,
        message: 'Evento S-2210 enviado com sucesso',
      });
    } else {
      res.status(500).json({
        success: false,
        error: resultado.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao enviar S-2210:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar evento',
    });
  }
});

router.post('/evento/s2220', async (req: Request, res: Response) => {
  try {
    const validacao = eventoS2220Schema.safeParse(req.body);

    if (!validacao.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados invalidos',
        details: validacao.error.flatten().fieldErrors,
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const esocialService = await createESocialService(empresaId || undefined);

    const resultado = await esocialService.enviarLote([{
      tipo: 'S-2220',
      dados: validacao.data,
    }]);

    if (resultado.success) {
      res.json({
        success: true,
        protocolo: resultado.protocolo,
        idLote: resultado.idLote,
        message: 'Evento S-2220 enviado com sucesso',
      });
    } else {
      res.status(500).json({
        success: false,
        error: resultado.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao enviar S-2220:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar evento',
    });
  }
});

router.post('/evento/s2240', async (req: Request, res: Response) => {
  try {
    const validacao = eventoS2240Schema.safeParse(req.body);

    if (!validacao.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados invalidos',
        details: validacao.error.flatten().fieldErrors,
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const esocialService = await createESocialService(empresaId || undefined);

    const resultado = await esocialService.enviarLote([{
      tipo: 'S-2240',
      dados: validacao.data,
    }]);

    if (resultado.success) {
      res.json({
        success: true,
        protocolo: resultado.protocolo,
        idLote: resultado.idLote,
        message: 'Evento S-2240 enviado com sucesso',
      });
    } else {
      res.status(500).json({
        success: false,
        error: resultado.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao enviar S-2240:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar evento',
    });
  }
});

router.post('/lote', async (req: Request, res: Response) => {
  try {
    const { eventos } = req.body;

    if (!Array.isArray(eventos) || eventos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Forneca um array de eventos',
      });
    }

    if (eventos.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximo de 50 eventos por lote',
      });
    }

    const eventosValidados = [];
    for (const evento of eventos) {
      if (!['S-2210', 'S-2220', 'S-2240'].includes(evento.tipo)) {
        return res.status(400).json({
          success: false,
          error: `Tipo de evento invalido: ${evento.tipo}`,
        });
      }

      let schema;
      switch (evento.tipo) {
        case 'S-2210':
          schema = eventoS2210Schema;
          break;
        case 'S-2220':
          schema = eventoS2220Schema;
          break;
        case 'S-2240':
          schema = eventoS2240Schema;
          break;
      }

      const validacao = schema!.safeParse(evento.dados);
      if (!validacao.success) {
        return res.status(400).json({
          success: false,
          error: `Evento ${evento.tipo} invalido`,
          details: validacao.error.flatten().fieldErrors,
        });
      }

      eventosValidados.push({
        tipo: evento.tipo,
        dados: validacao.data,
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const esocialService = await createESocialService(empresaId || undefined);

    const resultado = await esocialService.enviarLote(eventosValidados as any);

    if (resultado.success) {
      res.json({
        success: true,
        protocolo: resultado.protocolo,
        idLote: resultado.idLote,
        totalEventos: eventosValidados.length,
        message: 'Lote enviado com sucesso',
      });
    } else {
      res.status(500).json({
        success: false,
        error: resultado.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao enviar lote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar lote',
    });
  }
});

router.get('/consulta/:protocolo', async (req: Request, res: Response) => {
  try {
    const { protocolo } = req.params;

    if (!protocolo) {
      return res.status(400).json({
        success: false,
        error: 'Protocolo e obrigatorio',
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const esocialService = await createESocialService(empresaId || undefined);

    const resultado = await esocialService.consultarLote(protocolo);

    if (resultado.success) {
      res.json({
        success: true,
        protocolo,
        status: resultado.status,
        eventos: resultado.eventos,
      });
    } else {
      res.status(500).json({
        success: false,
        error: resultado.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao consultar lote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao consultar lote',
    });
  }
});

export default router;


