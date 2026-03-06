import https from 'https';
import axios from 'axios';
import { create } from 'xmlbuilder2';
import forge from 'node-forge';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EffectiveConfig, groupConfigService } from './groupConfigService';

// URLs do eSocial baseadas no ambiente
const getEsocialUrls = (ambiente: '1' | '2') => ({
  envio: ambiente === '1'
    ? 'https://webservices.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc'
    : 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
  consulta: ambiente === '1'
    ? 'https://webservices.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    : 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc',
});

interface EventoSST {
  tipo: 'S-2210' | 'S-2220' | 'S-2240';
  dados: any;
}

interface LoteEnvio {
  idLote: string;
  eventos: string[];
}

interface ResultadoEnvio {
  success: boolean;
  protocolo?: string;
  idLote?: string;
  error?: string;
}

interface ResultadoConsulta {
  success: boolean;
  status?: string;
  eventos?: Array<{
    id: string;
    status: string;
    descricao?: string;
  }>;
  error?: string;
}

export class ESocialService {
  private config: EffectiveConfig;
  private httpsAgent: https.Agent | null = null;
  private esocialUrls: { envio: string; consulta: string };

  constructor(config: EffectiveConfig) {
    this.config = config;
    this.esocialUrls = getEsocialUrls(config.esocialAmbiente);
  }

  /**
   * Factory method para criar instÃ¢ncia com configuraÃ§Ã£o do grupo
   */
  static async createForEmpresa(empresaId?: string): Promise<ESocialService> {
    const config = await groupConfigService.getEffectiveConfig(empresaId);
    return new ESocialService(config);
  }

  // Compatibilidade temporaria
  static async createForGroup(groupId?: string): Promise<ESocialService> {
    return this.createForEmpresa(groupId);
  }

  private removeKnownEmptyOptionalTags(xml: string): string {
    return xml
      .replace(/<matricula\s*\/>/g, '')
      .replace(/<matricula><\/matricula>/g, '')
      .replace(/<hrAcid\s*\/>/g, '')
      .replace(/<hrAcid><\/hrAcid>/g, '')
      .replace(/<hrsTrabAntesAcid\s*\/>/g, '')
      .replace(/<hrsTrabAntesAcid><\/hrsTrabAntesAcid>/g, '')
      .replace(/<dscLocal\s*\/>/g, '')
      .replace(/<dscLocal><\/dscLocal>/g, '')
      .replace(/<indResult\s*\/>/g, '')
      .replace(/<indResult><\/indResult>/g, '');
  }

  /**
   * Carrega o certificado digital A1 (.pfx/.p12) do Base64 ou arquivo
   */
  private loadCertificate(): { cert: string; key: string } {
    let pfxBuffer: Buffer;

    // Priorizar Base64 do banco, fallback para arquivo
    if (this.config.esocialCertBase64) {
      pfxBuffer = Buffer.from(this.config.esocialCertBase64, 'base64');
    } else if (env.ESOCIAL_CERT_PATH) {
      const fs = require('fs');
      if (!fs.existsSync(env.ESOCIAL_CERT_PATH)) {
        throw new Error('Certificado digital nÃ£o encontrado');
      }
      pfxBuffer = fs.readFileSync(env.ESOCIAL_CERT_PATH);
    } else {
      throw new Error('Certificado digital nÃ£o configurado (Base64 ou arquivo)');
    }
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, this.config.esocialCertPassword);

    // Extrair certificado
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag?.cert) {
      throw new Error('Certificado nÃ£o encontrado no arquivo PFX');
    }
    const cert = forge.pki.certificateToPem(certBag.cert);

    // Extrair chave privada
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag?.key) {
      throw new Error('Chave privada nÃ£o encontrada no arquivo PFX');
    }
    const key = forge.pki.privateKeyToPem(keyBag.key);

    return { cert, key };
  }

  /**
   * Cria o agente HTTPS com o certificado digital
   */
  private getHttpsAgent(): https.Agent {
    if (this.httpsAgent) return this.httpsAgent;

    const { cert, key } = this.loadCertificate();

    this.httpsAgent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: true,
    });

    return this.httpsAgent;
  }

  /**
   * Gera o ID Ãºnico do evento no formato eSocial
   * ID{tpInsc}{nrInsc}{anoMes}{sequencial}
   */
  private gerarIdEvento(): string {
    const now = new Date();
    const anoMesDiaHora = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const sequencial = Math.floor(Math.random() * 99999).toString().padStart(5, '0');

    return `ID${this.config.esocialTipoInscricao}${this.config.esocialNrInscricao.padStart(14, '0')}${anoMesDiaHora}${sequencial}`;
  }

  /**
   * Gera XML do evento S-2210 - ComunicaÃ§Ã£o de Acidente de Trabalho (CAT)
   */
  gerarEventoS2210(dados: {
    cpfTrabalhador: string;
    matricula?: string;
    codCateg: string;
    dtAcid: string;
    tpAcid: string;
    hrAcid?: string;
    hrsTrabAntesAcid?: string;
    tpCat: string;
    indCatObito: string;
    dtObito?: string;
    indComunPolicia: string;
    codSitGeradora: string;
    iniciatCAT: string;
    obsCAT?: string;
    // Dados do local do acidente
    tpLocal: string;
    dscLocal?: string;
    codAmb?: string;
    tpLograd?: string;
    dscLograd?: string;
    nrLograd?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    codMunic?: string;
    uf?: string;
    pais?: string;
    // Parte do corpo atingida
    codParteAting: string;
    lateralidade: string;
    // Agente causador
    codAgntCausador: string;
    // Atestado mÃ©dico
    dtAtendimento: string;
    hrAtendimento?: string;
    indInternacao: string;
    durTrat: string;
    indAfast: string;
    dscLesao: string;
    dscCompLesao?: string;
    diagProvavel?: string;
    codCID: string;
    observacao?: string;
    // MÃ©dico/Dentista
    nmEmit: string;
    ideOC: string;
    nrOC: string;
    ufOC?: string;
  }): string {
    const idEvento = this.gerarIdEvento();

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('eSocial', { xmlns: 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00' })
      .ele('evtCAT', { Id: idEvento })
      .ele('ideEvento')
      .ele('indRetif').txt('1').up()
      .ele('tpAmb').txt(this.config.esocialAmbiente).up()
      .ele('procEmi').txt('1').up()
      .ele('verProc').txt('1.0.0').up()
      .up()
      .ele('ideEmpregador')
      .ele('tpInsc').txt(this.config.esocialTipoInscricao).up()
      .ele('nrInsc').txt(this.config.esocialNrInscricao).up()
      .up()
      .ele('ideVinculo')
      .ele('cpfTrab').txt(dados.cpfTrabalhador).up()
      .ele('matricula').txt(dados.matricula || '').up()
      .ele('codCateg').txt(dados.codCateg).up()
      .up()
      .ele('cat')
      .ele('dtAcid').txt(dados.dtAcid).up()
      .ele('tpAcid').txt(dados.tpAcid).up()
      .ele('hrAcid').txt(dados.hrAcid || '').up()
      .ele('hrsTrabAntesAcid').txt(dados.hrsTrabAntesAcid || '').up()
      .ele('tpCat').txt(dados.tpCat).up()
      .ele('indCatObito').txt(dados.indCatObito).up()
      .ele('indComunPolicia').txt(dados.indComunPolicia).up()
      .ele('codSitGeradora').txt(dados.codSitGeradora).up()
      .ele('iniciatCAT').txt(dados.iniciatCAT).up()
      .ele('localAcidente')
      .ele('tpLocal').txt(dados.tpLocal).up()
      .ele('dscLocal').txt(dados.dscLocal || '').up()
      .up()
      .ele('parteAtingida')
      .ele('codParteAting').txt(dados.codParteAting).up()
      .ele('lateralidade').txt(dados.lateralidade).up()
      .up()
      .ele('agenteCausador')
      .ele('codAgntCausador').txt(dados.codAgntCausador).up()
      .up()
      .ele('atestado')
      .ele('dtAtendimento').txt(dados.dtAtendimento).up()
      .ele('indInternacao').txt(dados.indInternacao).up()
      .ele('durTrat').txt(dados.durTrat).up()
      .ele('indAfast').txt(dados.indAfast).up()
      .ele('dscLesao').txt(dados.dscLesao).up()
      .ele('codCID').txt(dados.codCID).up()
      .ele('emitente')
      .ele('nmEmit').txt(dados.nmEmit).up()
      .ele('ideOC').txt(dados.ideOC).up()
      .ele('nrOC').txt(dados.nrOC).up()
      .up()
      .up()
      .up()
      .up()
      .up();

    return this.removeKnownEmptyOptionalTags(xml.end({ prettyPrint: true }));
  }

  /**
   * Gera XML do evento S-2220 - Monitoramento da SaÃºde do Trabalhador (ASO)
   */
  gerarEventoS2220(dados: {
    cpfTrabalhador: string;
    matricula?: string;
    codCateg: string;
    dtAso: string;
    tpAso: string;
    resAso: string;
    // Exames
    exames: Array<{
      dtExm: string;
      procRealizado: string;
      obsProc?: string;
      ordExame: string;
      indResult?: string;
    }>;
    // MÃ©dico responsÃ¡vel
    nmMed: string;
    nrCRM: string;
    ufCRM: string;
  }): string {
    const idEvento = this.gerarIdEvento();

    const xmlBuilder = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('eSocial', { xmlns: 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00' })
      .ele('evtMonit', { Id: idEvento })
      .ele('ideEvento')
      .ele('indRetif').txt('1').up()
      .ele('tpAmb').txt(this.config.esocialAmbiente).up()
      .ele('procEmi').txt('1').up()
      .ele('verProc').txt('1.0.0').up()
      .up()
      .ele('ideEmpregador')
      .ele('tpInsc').txt(this.config.esocialTipoInscricao).up()
      .ele('nrInsc').txt(this.config.esocialNrInscricao).up()
      .up()
      .ele('ideVinculo')
      .ele('cpfTrab').txt(dados.cpfTrabalhador).up()
      .ele('matricula').txt(dados.matricula || '').up()
      .ele('codCateg').txt(dados.codCateg).up()
      .up()
      .ele('aso')
      .ele('dtAso').txt(dados.dtAso).up()
      .ele('tpAso').txt(dados.tpAso).up()
      .ele('resAso').txt(dados.resAso).up();

    // Adicionar exames
    const asoNode = xmlBuilder.find((n: any) => n.node?.nodeName === 'aso');
    if (asoNode) {
      for (const exame of dados.exames) {
        asoNode.ele('exame')
          .ele('dtExm').txt(exame.dtExm).up()
          .ele('procRealizado').txt(exame.procRealizado).up()
          .ele('ordExame').txt(exame.ordExame).up()
          .ele('indResult').txt(exame.indResult || '').up()
          .up();
      }

      // MÃ©dico responsÃ¡vel
      asoNode.ele('medico')
        .ele('nmMed').txt(dados.nmMed).up()
        .ele('nrCRM').txt(dados.nrCRM).up()
        .ele('ufCRM').txt(dados.ufCRM).up()
        .up();
    }

    return this.removeKnownEmptyOptionalTags(xmlBuilder.end({ prettyPrint: true }));
  }

  /**
   * Gera XML do evento S-2240 - CondiÃ§Ãµes Ambientais do Trabalho
   */
  gerarEventoS2240(dados: {
    cpfTrabalhador: string;
    matricula?: string;
    codCateg: string;
    dtIniCondicao: string;
    // InformaÃ§Ãµes de exposiÃ§Ã£o
    codAmb: string;
    localAmb: string;
    dscSetor: string;
    tpInsc?: string;
    nrInsc?: string;
    // Atividades
    dscAtivDes: string;
    // Agentes nocivos
    agentesNocivos: Array<{
      codAgNoc: string;
      dscAgNoc?: string;
      tpAval?: string;
      intConc?: string;
      limTol?: string;
      unMed?: string;
      tecMedicao?: string;
      // EPIs
      epiEficaz?: string;
      epcEficaz?: string;
      utilizEPC?: string;
      utilizEPI?: string;
    }>;
    // ResponsÃ¡vel pelos registros
    cpfResp: string;
    nmResp: string;
    nrOC: string;
    ideOC: string;
  }): string {
    const idEvento = this.gerarIdEvento();

    const xmlBuilder = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('eSocial', { xmlns: 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00' })
      .ele('evtExpRisco', { Id: idEvento })
      .ele('ideEvento')
      .ele('indRetif').txt('1').up()
      .ele('tpAmb').txt(this.config.esocialAmbiente).up()
      .ele('procEmi').txt('1').up()
      .ele('verProc').txt('1.0.0').up()
      .up()
      .ele('ideEmpregador')
      .ele('tpInsc').txt(this.config.esocialTipoInscricao).up()
      .ele('nrInsc').txt(this.config.esocialNrInscricao).up()
      .up()
      .ele('ideVinculo')
      .ele('cpfTrab').txt(dados.cpfTrabalhador).up()
      .ele('matricula').txt(dados.matricula || '').up()
      .ele('codCateg').txt(dados.codCateg).up()
      .up()
      .ele('infoExpRisco')
      .ele('dtIniCondicao').txt(dados.dtIniCondicao).up()
      .ele('infoAmb')
      .ele('codAmb').txt(dados.codAmb).up()
      .ele('localAmb').txt(dados.localAmb).up()
      .ele('dscSetor').txt(dados.dscSetor).up()
      .up()
      .ele('infoAtiv')
      .ele('dscAtivDes').txt(dados.dscAtivDes).up()
      .up();

    // Adicionar agentes nocivos
    const infoExpRiscoNode = xmlBuilder.find((n: any) => n.node?.nodeName === 'infoExpRisco');
    if (infoExpRiscoNode) {
      for (const agente of dados.agentesNocivos) {
        const agenteNode = infoExpRiscoNode.ele('agNoc')
          .ele('codAgNoc').txt(agente.codAgNoc).up();

        if (agente.dscAgNoc) agenteNode.ele('dscAgNoc').txt(agente.dscAgNoc).up();
        if (agente.tpAval) agenteNode.ele('tpAval').txt(agente.tpAval).up();
        if (agente.intConc) agenteNode.ele('intConc').txt(agente.intConc).up();

        // EPI/EPC
        agenteNode.ele('epcEpi')
          .ele('utilizEPC').txt(agente.utilizEPC || '0').up()
          .ele('utilizEPI').txt(agente.utilizEPI || '0').up()
          .ele('epcEficaz').txt(agente.epcEficaz || 'N').up()
          .ele('epiEficaz').txt(agente.epiEficaz || 'N').up()
          .up();

        agenteNode.up();
      }

      // ResponsÃ¡vel
      infoExpRiscoNode.ele('respReg')
        .ele('cpfResp').txt(dados.cpfResp).up()
        .ele('nmResp').txt(dados.nmResp).up()
        .ele('nrOC').txt(dados.nrOC).up()
        .ele('ideOC').txt(dados.ideOC).up()
        .up();
    }

    return this.removeKnownEmptyOptionalTags(xmlBuilder.end({ prettyPrint: true }));
  }

  /**
   * Assina o XML do evento com o certificado digital
   */
  private assinarXML(xml: string): string {
    const { cert, key } = this.loadCertificate();

    // Criar assinatura XML (XMLDSig)
    const md = forge.md.sha256.create();
    md.update(xml, 'utf8');
    const digest = forge.util.encode64(md.digest().bytes());

    const privateKey = forge.pki.privateKeyFromPem(key);
    const signature = privateKey.sign(md);
    const signatureBase64 = forge.util.encode64(signature);

    // Extrair certificado X509
    const certificate = forge.pki.certificateFromPem(cert);
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).bytes();
    const certBase64 = forge.util.encode64(certDer);

    // Inserir assinatura no XML
    const idEventoMatch = xml.match(/<evt[^\s>]+\s+Id="([^"]+)"/);
    const referenceUri = idEventoMatch ? `#${idEventoMatch[1]}` : '';

    const signatureXml = `
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <Reference URI="${referenceUri}">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <DigestValue>${digest}</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>${signatureBase64}</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>${certBase64}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>`;

    // Inserir antes do fechamento do elemento raiz
    return xml.replace('</eSocial>', `${signatureXml}</eSocial>`);
  }

  /**
   * Monta o envelope SOAP para envio do lote
   */
  private montarEnvelopeSoap(loteXml: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header/>
  <soap:Body>
    <EnviarLoteEventos xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0">
      <loteEventos>
        ${loteXml}
      </loteEventos>
    </EnviarLoteEventos>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Envia lote de eventos para o eSocial
   */
  async enviarLote(eventos: EventoSST[]): Promise<ResultadoEnvio> {
    try {
      const idLote = uuidv4();
      const eventosXml: string[] = [];

      // Gerar e assinar cada evento
      for (const evento of eventos) {
        let xml: string;

        switch (evento.tipo) {
          case 'S-2210':
            xml = this.gerarEventoS2210(evento.dados);
            break;
          case 'S-2220':
            xml = this.gerarEventoS2220(evento.dados);
            break;
          case 'S-2240':
            xml = this.gerarEventoS2240(evento.dados);
            break;
          default:
            throw new Error(`Tipo de evento nÃ£o suportado: ${evento.tipo}`);
        }

        const xmlAssinado = this.assinarXML(xml);
        eventosXml.push(xmlAssinado);
      }

      // Montar lote
      const loteXml = `
        <eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
          <envioLoteEventos grupo="2">
            <ideEmpregador>
              <tpInsc>${this.config.esocialTipoInscricao}</tpInsc>
              <nrInsc>${this.config.esocialNrInscricao}</nrInsc>
            </ideEmpregador>
            <ideTransmissor>
              <tpInsc>${this.config.esocialTipoInscricao}</tpInsc>
              <nrInsc>${this.config.esocialNrInscricao}</nrInsc>
            </ideTransmissor>
            <eventos>
              ${eventosXml.map((xml, i) => `<evento Id="ID${i + 1}">${xml}</evento>`).join('\n')}
            </eventos>
          </envioLoteEventos>
        </eSocial>`;

      const envelope = this.montarEnvelopeSoap(loteXml);

      // Enviar para o Web Service
      const response = await axios.post(
        this.esocialUrls.envio,
        envelope,
        {
          httpsAgent: this.getHttpsAgent(),
          headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
          },
        }
      );

      // Parsear resposta
      logger.info(`Lote ${idLote} enviado com sucesso`);

      return {
        success: true,
        idLote,
        protocolo: this.extrairProtocolo(response.data),
      };
    } catch (error: any) {
      logger.error('Erro ao enviar lote eSocial:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Consulta o resultado do processamento de um lote
   */
  async consultarLote(protocolo: string): Promise<ResultadoConsulta> {
    try {
      const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header/>
  <soap:Body>
    <ConsultarLoteEventos xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0">
      <consulta>
        <eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/consulta/retornoProcessamento/v1_0_0">
          <consultaLoteEventos>
            <protocoloEnvio>${protocolo}</protocoloEnvio>
          </consultaLoteEventos>
        </eSocial>
      </consulta>
    </ConsultarLoteEventos>
  </soap:Body>
</soap:Envelope>`;

      const response = await axios.post(
        this.esocialUrls.consulta,
        envelope,
        {
          httpsAgent: this.getHttpsAgent(),
          headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
          },
        }
      );

      logger.info(`Consulta do protocolo ${protocolo} realizada`);

      return {
        success: true,
        status: this.extrairStatus(response.data),
        eventos: this.extrairEventosProcessados(response.data),
      };
    } catch (error: any) {
      logger.error('Erro ao consultar lote eSocial:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private extrairProtocolo(soapResponse: string): string {
    const match = soapResponse.match(/<protocoloEnvio>([^<]+)<\/protocoloEnvio>/);
    return match ? match[1] : '';
  }

  private extrairStatus(soapResponse: string): string {
    const match = soapResponse.match(/<cdResposta>([^<]+)<\/cdResposta>/);
    return match ? match[1] : 'DESCONHECIDO';
  }

  private extrairEventosProcessados(soapResponse: string): Array<{ id: string; status: string; descricao?: string }> {
    const eventos: Array<{ id: string; status: string; descricao?: string }> = [];
    const regex = /<evento[^>]*Id="([^"]+)"[^>]*>.*?<cdResposta>([^<]+)<\/cdResposta>.*?<descResposta>([^<]*)<\/descResposta>/gs;

    let match;
    while ((match = regex.exec(soapResponse)) !== null) {
      eventos.push({
        id: match[1],
        status: match[2],
        descricao: match[3],
      });
    }

    return eventos;
  }
}

// Factory function para uso fÃ¡cil
export const createESocialService = ESocialService.createForEmpresa;



