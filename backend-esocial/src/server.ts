import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';
import signatureRoutes from './routes/signatureRoutes';
import esocialRoutes from './routes/esocialRoutes';
import pdfSignatureRoutes from './routes/pdfSignatureRoutes';

const app = express();

// Em producao este servico roda atras de proxy reverso (EasyPanel/Cloudflare).
// Isso permite que o rate-limit use corretamente X-Forwarded-For.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}


// Middlewares de segurança
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (ex: curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Permitir todas as origens se configurado com *
    if (allowedOrigins.includes('*')) {
      callback(null, true);
      return;
    }
    // Verificar se a origem está na lista
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado para origem: ${origin}`);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Empresa-ID', 'X-Group-ID'],
}));

// Preflight OPTIONS para todas as rotas
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP
  message: { error: 'Muitas requisições, tente novamente mais tarde' },
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Rotas da API
app.use('/api/signature', signatureRoutes);
app.use('/api/esocial', esocialRoutes);
app.use('/api/pdf', pdfSignatureRoutes);

// Rota de documentação
app.get('/api', (req, res) => {
  res.json({
    name: 'Backend eSocial & Assinatura Digital',
    version: '1.0.0',
    endpoints: {
      signature: {
        'GET /api/signature/auth-url': 'Gera URL de autorização gov.br',
        'POST /api/signature/callback': 'Callback OAuth2 - troca código por token',
        'GET /api/signature/certificate': 'Obtém certificado do usuário (requer Bearer token)',
        'POST /api/signature/sign': 'Assina documento (requer Bearer token)',
        'POST /api/signature/sign-batch': 'Assina múltiplos documentos (requer Bearer token)',
      },
      esocial: {
        'GET /api/esocial/config': 'Consulta configuração de integração da empresa (requer X-API-Key)',
        'PUT /api/esocial/config': 'Salva configuração de integração da empresa (requer X-API-Key)',
        'POST /api/esocial/evento/s2210': 'Envia evento S-2210 (CAT)',
        'POST /api/esocial/evento/s2220': 'Envia evento S-2220 (ASO)',
        'POST /api/esocial/evento/s2240': 'Envia evento S-2240 (Condições Ambientais)',
        'POST /api/esocial/lote': 'Envia lote com múltiplos eventos',
        'GET /api/esocial/consulta/:protocolo': 'Consulta resultado do processamento',
      },
      pdf: {
        'POST /api/pdf/sign': 'Assina PDF com certificado ICP-Brasil da empresa',
        'POST /api/pdf/validate-certificate': 'Valida certificado A1 (.pfx)',
        'GET /api/pdf/certificate-info/:empresaId': 'Info do certificado configurado',
      },
    },
  });
});

// Tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
  });
});

// Iniciar servidor
const PORT = parseInt(env.PORT, 10);
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📍 Ambiente: ${env.NODE_ENV}`);
  logger.info(`📍 eSocial: ${env.ESOCIAL_AMBIENTE === '1' ? 'Produção' : 'Produção Restrita'}`);
  logger.info(`📍 Gov.br: ${env.GOVBR_ENVIRONMENT}`);
});

export default app;
