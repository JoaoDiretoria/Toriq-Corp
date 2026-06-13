import { Router, Request, Response } from 'express';
import { createGovBrSignatureService } from '../services/govbrSignatureService';
import { requireEmpresaIdHeader } from '../config/env';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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

const authSessions = new Map<string, { codeVerifier: string; nonce: string; empresaId?: string; createdAt: Date }>();

router.get('/auth-url', async (req: Request, res: Response) => {
  try {
    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const govbrSignatureService = await createGovBrSignatureService(empresaId || undefined);

    const state = uuidv4();
    const nonce = uuidv4();
    const { codeVerifier, codeChallenge } = govbrSignatureService.generatePKCE();

    authSessions.set(state, {
      codeVerifier,
      nonce,
      empresaId: empresaId || undefined,
      createdAt: new Date(),
    });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    for (const [key, session] of authSessions.entries()) {
      if (session.createdAt < tenMinutesAgo) {
        authSessions.delete(key);
      }
    }

    const authUrl = govbrSignatureService.getAuthorizationUrl(state, nonce, codeChallenge);

    res.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error: any) {
    logger.error('Erro ao gerar URL de autorizacao:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar URL de autorizacao',
    });
  }
});

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Codigo e state sao obrigatorios',
      });
    }

    const session = authSessions.get(state);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Sessao expirada ou invalida',
      });
    }

    const govbrSignatureService = await createGovBrSignatureService(session.empresaId);

    const tokenResponse = await govbrSignatureService.exchangeCodeForToken(
      code,
      session.codeVerifier
    );

    authSessions.delete(state);

    res.json({
      success: true,
      accessToken: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in,
    });
  } catch (error: any) {
    logger.error('Erro no callback OAuth:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar callback',
    });
  }
});

router.get('/certificate', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso nao fornecido',
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const govbrSignatureService = await createGovBrSignatureService(empresaId || undefined);

    const accessToken = authHeader.substring(7);
    const certificate = await govbrSignatureService.getUserCertificate(accessToken);

    res.json({
      success: true,
      certificate,
    });
  } catch (error: any) {
    logger.error('Erro ao obter certificado:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter certificado',
    });
  }
});

router.post('/sign', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso nao fornecido',
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const govbrSignatureService = await createGovBrSignatureService(empresaId || undefined);

    const { documentHash, documentBase64 } = req.body;

    let hashToSign: string;

    if (documentHash) {
      hashToSign = documentHash;
    } else if (documentBase64) {
      const documentBuffer = Buffer.from(documentBase64, 'base64');
      hashToSign = govbrSignatureService.calculateHash(documentBuffer);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Forneca documentHash ou documentBase64',
      });
    }

    const accessToken = authHeader.substring(7);
    const result = await govbrSignatureService.signHash(accessToken, hashToSign);

    if (result.success) {
      res.json({
        success: true,
        signature: result.pkcs7,
        hashSigned: hashToSign,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    logger.error('Erro ao assinar documento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao assinar documento',
    });
  }
});

router.post('/sign-batch', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso nao fornecido',
      });
    }

    const empresaId = requireEmpresaId(req);
    if (requireEmpresaIdHeader && !empresaId) {
      return res.status(400).json({
        success: false,
        error: 'Header X-Empresa-ID e obrigatorio para esta operacao',
      });
    }

    const govbrSignatureService = await createGovBrSignatureService(empresaId || undefined);

    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Forneca um array de documentos',
      });
    }

    const hashes = documents.map((doc: { hash?: string; base64?: string }) => {
      if (doc.hash) return doc.hash;
      if (doc.base64) {
        return govbrSignatureService.calculateHash(Buffer.from(doc.base64, 'base64'));
      }
      throw new Error('Cada documento deve ter hash ou base64');
    });

    const accessToken = authHeader.substring(7);
    const results = await govbrSignatureService.signBatch(accessToken, hashes);

    res.json({
      success: true,
      signatures: results,
    });
  } catch (error: any) {
    logger.error('Erro ao assinar lote:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao assinar lote',
    });
  }
});

export default router;

