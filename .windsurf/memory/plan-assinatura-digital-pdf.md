# Plano: Assinatura Digital ICP-Brasil com Selo Visual em PDFs

**Data:** 2026-02-17  
**Status:** Em Planejamento  
**Prioridade:** Alta

---

## 0. Pesquisa: ICP-Brasil e Requisitos Legais

### Legislação Aplicável

| Norma | Descrição |
|-------|-----------|
| **MP 2.200-2/2001** | Criou a ICP-Brasil e definiu a estrutura de certificação digital no país |
| **Lei 14.063/2020** | Regulamenta assinaturas eletrônicas em interações com entes públicos |
| **Portaria 211/2019** | **Obriga** assinatura digital ICP-Brasil para documentos SST |
| **Lei 14.620/2023** | Confere força executiva a contratos eletrônicos assinados digitalmente |

### Três Níveis de Assinatura Eletrônica (Lei 14.063/2020)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NÍVEIS DE ASSINATURA                                  │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   SIMPLES           │   AVANÇADA          │   QUALIFICADA                   │
├─────────────────────┼─────────────────────┼─────────────────────────────────┤
│ Login + Senha       │ gov.br (Prata/Ouro) │ Certificado ICP-Brasil          │
│                     │                     │                                 │
│ ❌ Baixa segurança  │ ✅ Boa segurança    │ ✅ Máxima segurança             │
│ ❌ Não para docs    │ ✅ Validade legal   │ ✅ Presunção legal absoluta     │
│    críticos         │ ⚠️ Não inverte      │ ✅ Inverte ônus da prova        │
│                     │    ônus da prova    │                                 │
├─────────────────────┼─────────────────────┼─────────────────────────────────┤
│ Ex: Login site      │ Ex: Assinatura      │ Ex: Token A3, Certificado A1   │
│                     │ gov.br              │ em nuvem ICP-Brasil             │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```

### ⚠️ IMPORTANTE: Documentos SST

A **Portaria nº 211/2019** torna **OBRIGATÓRIA** a assinatura digital no padrão **ICP-Brasil** para documentos SST:

| Documento | Obrigatoriedade ICP-Brasil |
|-----------|----------------------------|
| **Certificados de Treinamento NR** | ✅ Obrigatório |
| PCMSO, PGR, PPRA | ✅ Obrigatório |
| ASO (Atestado Saúde Ocupacional) | ✅ Obrigatório |
| Laudos LTCAT, LTIP | ✅ Obrigatório |
| Fichas de EPI | ✅ Obrigatório |
| AET (Análise Ergonômica) | ✅ Obrigatório |

### Padrões Técnicos Exigidos

| Requisito | Especificação |
|-----------|---------------|
| **Formato** | PDF |
| **Qualidade** | PDF/A-1 (ABNT NBR ISO 19005-1) |
| **Padrão de Assinatura** | **PAdES** (PDF Advanced Electronic Signature) |
| **Certificado** | ICP-Brasil |

### gov.br vs ICP-Brasil: Qual Usar?

| Aspecto | gov.br (Avançada) | ICP-Brasil (Qualificada) |
|---------|-------------------|--------------------------|
| **Custo** | Gratuito | Pago (R$ 100-300/ano) |
| **Validade Jurídica** | ✅ Sim | ✅ Sim (mais forte) |
| **Presunção de Veracidade** | Parcial | Absoluta |
| **Ônus da Prova** | Quem apresenta | Quem contesta |
| **Aceito p/ SST (Portaria 211)** | ⚠️ Questionável | ✅ Totalmente |
| **Aceito no eSocial** | ✅ Sim | ✅ Sim |
| **Facilidade de Uso** | ✅ Muito fácil | ⚠️ Requer token/software |

### Recomendação para o Sistema

Para **certificados de treinamento SST**, recomenda-se:

1. **Opção Ideal:** Assinatura **ICP-Brasil Qualificada** (PAdES)
   - Conformidade total com Portaria 211
   - Máxima segurança jurídica
   - Aceito universalmente

2. **Opção Alternativa:** Assinatura **gov.br Avançada**
   - Gratuita e acessível
   - Reconhecida pela Lei 14.063/2020
   - Pode ser questionada em fiscalização rigorosa
   - **Usar apenas se cliente não tiver certificado ICP-Brasil**

### Decisão Arquitetural

O sistema deve suportar **ambos os tipos**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE ASSINATURA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuário escolhe:                                               │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐│
│  │ Assinatura gov.br   │    │ Assinatura ICP-Brasil           ││
│  │ (Avançada)          │    │ (Qualificada)                   ││
│  │                     │    │                                 ││
│  │ - Conta Prata/Ouro  │    │ - Upload certificado A1 (.pfx)  ││
│  │ - OAuth gov.br      │    │ - Ou token A3 (futuro)          ││
│  │ - API Assinatura    │    │ - Assinatura local/servidor     ││
│  └──────────┬──────────┘    └────────────────┬────────────────┘│
│             │                                │                  │
│             └───────────────┬────────────────┘                  │
│                             ▼                                   │
│                  ┌──────────────────────┐                       │
│                  │ PDF com Selo Visual  │                       │
│                  │ Padrão PAdES         │                       │
│                  └──────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Objetivo

Implementar assinatura digital com certificado ICP-Brasil (via gov.br) nos PDFs de certificados e relatórios, incluindo **selo visual** similar ao padrão Adobe/Foxit com:

- Nome do signatário
- Dados do certificado (CN, OU, O)
- Data/hora da assinatura
- Razão da assinatura
- Número do certificado

---

## 2. Situação Atual

| Componente | Status Atual |
|------------|--------------|
| Geração de PDF | `html2canvas` + `jsPDF` (renderiza HTML como imagem) |
| Assinatura exibida | Imagem manuscrita (URL) |
| Integração gov.br | ✅ Retorna PKCS7 via API |
| Embedding PKCS7 no PDF | ❌ Não implementado |
| Selo visual ICP-Brasil | ❌ Não implementado |

---

## 3. Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ VisualizarCert. │───▶│ Gerar PDF Base  │───▶│ Enviar p/ Assinar│ │
│  └─────────────────┘    │ (pdf-lib)       │    └────────┬────────┘  │
│                         └─────────────────┘             │            │
└─────────────────────────────────────────────────────────│────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (backend-esocial)                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ POST /sign-pdf  │───▶│ Adicionar       │───▶│ Assinar via     │  │
│  │                 │    │ Placeholder     │    │ gov.br API      │  │
│  └─────────────────┘    │ + Selo Visual   │    └────────┬────────┘  │
│                         └─────────────────┘             │            │
│                                                         ▼            │
│                         ┌─────────────────┐    ┌─────────────────┐  │
│                         │ Retornar PDF    │◀───│ Embedar PKCS7   │  │
│                         │ Assinado        │    │ no PDF          │  │
│                         └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Bibliotecas Necessárias

### Backend (Node.js)
```json
{
  "@signpdf/signpdf": "^3.x",
  "@signpdf/placeholder-plain": "^3.x",
  "@signpdf/signer-p12": "^3.x",
  "pdf-lib": "^1.17.1",
  "node-forge": "^1.3.1"
}
```

### Alternativas Avaliadas

| Biblioteca | Prós | Contras |
|------------|------|---------|
| **@signpdf/signpdf** | Modular, bem documentado, suporta PKCS7 externo | Requer placeholder manual |
| **pdf-lib** | Manipulação PDF completa, TypeScript | Não assina nativamente |
| **muhammara** | Assinatura nativa | Bindings C++, complexo |
| **Aspose.PDF** | Completo | Licença comercial cara |

**Decisão:** Usar `pdf-lib` + `@signpdf/signpdf` para máxima flexibilidade.

---

## 5. Fluxo de Assinatura Digital

### 5.1 Gerar PDF Base (Frontend ou Backend)

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Criar PDF estruturado (não imagem)
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4
// ... adicionar conteúdo
```

### 5.2 Adicionar Placeholder + Selo Visual (Backend)

```typescript
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';

// Adicionar placeholder para assinatura
const pdfWithPlaceholder = plainAddPlaceholder({
  pdfBuffer: pdfBuffer,
  reason: 'Assinatura Digital de Certificado',
  contactInfo: 'contato@empresa.com',
  name: 'NOME DO SIGNATÁRIO',
  location: 'Brasil',
  signatureLength: 8192, // Espaço para PKCS7
  subFilter: 'adbe.pkcs7.detached',
  widgetRect: [350, 50, 550, 150], // Posição do selo visual
});
```

### 5.3 Gerar Selo Visual

```typescript
// Desenhar selo visual com dados do certificado
async function desenharSeloVisual(
  pdfDoc: PDFDocument,
  certificateInfo: {
    nome: string;
    cpf: string;
    cn: string;
    ou: string;
    serialNumber: string;
    notBefore: string;
    notAfter: string;
  },
  position: { x: number; y: number; width: number; height: number }
) {
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Fundo do selo
  page.drawRectangle({
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.2, 0.4, 0.8),
    borderWidth: 2,
  });

  // Texto do selo
  const lines = [
    { text: certificateInfo.nome, font: fontBold, size: 12 },
    { text: `Digitally signed by ${certificateInfo.cn}`, font: font, size: 8 },
    { text: `DN: ${certificateInfo.cn}`, font: font, size: 7 },
    { text: `OU: ${certificateInfo.ou}`, font: font, size: 7 },
    { text: `Serial: ${certificateInfo.serialNumber}`, font: font, size: 7 },
    { text: `Date: ${new Date().toISOString()}`, font: font, size: 7 },
    { text: 'Reason: Certificado de Treinamento SST', font: font, size: 7 },
  ];

  let yOffset = position.y + position.height - 15;
  for (const line of lines) {
    page.drawText(line.text, {
      x: position.x + 10,
      y: yOffset,
      size: line.size,
      font: line.font,
      color: rgb(0, 0, 0),
    });
    yOffset -= line.size + 3;
  }
}
```

### 5.4 Assinar com PKCS7 do gov.br

```typescript
import { Signer } from '@signpdf/signpdf';

// Signer customizado que usa gov.br API
class GovBrSigner extends Signer {
  constructor(private accessToken: string, private govbrService: GovBrSignatureService) {
    super();
  }

  async sign(pdfBuffer: Buffer, placeholderRange: { start: number; end: number }): Promise<Buffer> {
    // Calcular hash do conteúdo a ser assinado
    const contentToSign = Buffer.concat([
      pdfBuffer.slice(0, placeholderRange.start),
      pdfBuffer.slice(placeholderRange.end),
    ]);
    
    const hash = this.govbrService.calculateHash(contentToSign);
    
    // Obter assinatura PKCS7 do gov.br
    const result = await this.govbrService.signHash(this.accessToken, hash);
    
    if (!result.success || !result.pkcs7) {
      throw new Error(result.error || 'Falha ao assinar');
    }
    
    return Buffer.from(result.pkcs7, 'base64');
  }
}
```

### 5.5 Embedar Assinatura no PDF

```typescript
import signpdf from '@signpdf/signpdf';

async function assinarPdfComGovBr(
  pdfBuffer: Buffer,
  accessToken: string,
  certificateInfo: GovBrCertificateResponse
): Promise<Buffer> {
  // 1. Adicionar selo visual
  const pdfComSelo = await adicionarSeloVisual(pdfBuffer, certificateInfo);
  
  // 2. Adicionar placeholder
  const pdfComPlaceholder = plainAddPlaceholder({
    pdfBuffer: pdfComSelo,
    reason: 'Certificado de Treinamento SST',
    name: certificateInfo.subjectDN,
    // ...
  });
  
  // 3. Criar signer gov.br
  const signer = new GovBrSigner(accessToken, govbrService);
  
  // 4. Assinar
  const pdfAssinado = await signpdf.sign(pdfComPlaceholder, signer);
  
  return pdfAssinado;
}
```

---

## 6. Novo Endpoint no Backend

### POST `/api/esocial/sign-pdf`

```typescript
router.post('/sign-pdf', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const empresaId = requireEmpresaId(req);
  
  const { pdfBase64, reason, location } = req.body;
  
  // 1. Validar token gov.br
  const accessToken = authHeader.substring(7);
  
  // 2. Obter certificado do usuário
  const certificate = await govbrService.getUserCertificate(accessToken);
  
  // 3. Converter PDF
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  
  // 4. Adicionar selo visual
  const pdfComSelo = await adicionarSeloVisual(pdfBuffer, {
    nome: extrairNomeDoSubjectDN(certificate.subjectDN),
    cn: certificate.subjectDN,
    serialNumber: certificate.serialNumber,
    notBefore: certificate.notBefore,
    notAfter: certificate.notAfter,
  });
  
  // 5. Assinar
  const pdfAssinado = await assinarPdfComGovBr(pdfComSelo, accessToken, certificate);
  
  // 6. Retornar
  res.json({
    success: true,
    signedPdf: pdfAssinado.toString('base64'),
    certificate: {
      subjectDN: certificate.subjectDN,
      serialNumber: certificate.serialNumber,
      notBefore: certificate.notBefore,
      notAfter: certificate.notAfter,
    },
  });
});
```

---

## 7. Alterações no Frontend

### 7.1 Migrar de html2canvas para pdf-lib

O PDF atual é gerado como imagem (html2canvas), o que **impede assinatura digital válida**.

**Opções:**
1. **Migrar para pdf-lib** - Gerar PDF estruturado no frontend
2. **Gerar no backend** - Enviar dados e gerar PDF no backend

**Recomendação:** Manter geração no frontend com pdf-lib para preview, enviar para backend apenas para assinatura.

### 7.2 Novo Fluxo de Validação

```typescript
const handleValidarComAssinaturaDigital = async () => {
  // 1. Gerar PDF base (estruturado, não imagem)
  const pdfBase = await gerarPdfEstruturado(dados);
  
  // 2. Enviar para backend assinar
  const response = await fetch(`${ESOCIAL_BACKEND_URL}/api/esocial/sign-pdf`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${govbrAccessToken}`,
      'X-Empresa-ID': empresaId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdfBase64: pdfBase.toString('base64'),
      reason: 'Certificado de Treinamento SST',
      location: 'Brasil',
    }),
  });
  
  const { signedPdf, certificate } = await response.json();
  
  // 3. Fazer upload do PDF assinado
  await uploadPdfAssinado(signedPdf);
  
  // 4. Registrar validação com dados do certificado
  await registrarValidacao({
    assinatura_digital: true,
    certificado_serial: certificate.serialNumber,
    certificado_emissor: certificate.issuerDN,
    assinado_em: new Date().toISOString(),
  });
};
```

---

## 8. Tarefas de Implementação

### Fase 1: Backend (Estimativa: 2-3 dias)
- [ ] Instalar dependências (`@signpdf/*`, `pdf-lib`)
- [ ] Criar serviço `pdfSignatureService.ts`
- [ ] Implementar `GovBrSigner` customizado
- [ ] Implementar geração de selo visual
- [ ] Criar endpoint `POST /sign-pdf`
- [ ] Testes unitários

### Fase 2: Frontend (Estimativa: 3-4 dias)
- [ ] Criar `pdfGenerator.ts` com `pdf-lib`
- [ ] Recriar templates de certificado em código (não HTML)
- [ ] Integrar com novo endpoint de assinatura
- [ ] Adicionar fluxo de autenticação gov.br antes de validar
- [ ] Atualizar UI para mostrar status de assinatura digital

### Fase 3: Validação (Estimativa: 1-2 dias)
- [ ] Testar assinatura em Adobe Acrobat Reader
- [ ] Testar em Foxit Reader
- [ ] Verificar conformidade com ICP-Brasil
- [ ] Testar com diferentes certificados gov.br (Prata/Ouro)

---

## 9. Dependências e Riscos

### Dependências
- Backend eSocial precisa estar deployado e acessível
- Usuário precisa ter conta gov.br Prata ou Ouro
- Token de acesso gov.br válido com scope `signature_session`

### Riscos
| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| API gov.br instável | Alto | Cache de certificado, retry com backoff |
| PDF muito grande para assinar | Médio | Limite de tamanho, compressão |
| Selo visual cortado | Baixo | Posicionamento dinâmico |

---

## 10. Próximos Passos

1. **Aprovar plano** com stakeholders
2. **Configurar ambiente** com bibliotecas necessárias
3. **Implementar POC** no backend primeiro
4. **Testar** com certificado real gov.br
5. **Integrar** no frontend após validação do backend

---

## Referências

- [node-signpdf](https://github.com/vbuch/node-signpdf)
- [pdf-lib](https://pdf-lib.js.org/)
- [API Assinatura gov.br](https://manual-integracao-assinatura-eletronica.servicos.gov.br/)
- [ICP-Brasil - Visão Geral](https://www.gov.br/iti/pt-br/assuntos/icp-brasil)
