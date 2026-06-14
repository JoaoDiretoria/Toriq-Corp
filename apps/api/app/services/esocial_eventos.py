"""Geração de XML dos eventos eSocial SST (S-2210, S-2220, S-2240).

Porte fiel do ``esocialService.ts`` legado (xmlbuilder2) para ``lxml``. Cada
função recebe a ``config`` da empresa (ambiente + inscrição) e um dict ``dados``
(os mesmos campos que o legado pedia, preenchidos pela tela/SST) e devolve o XML
do evento. A assinatura XMLDSig é aplicada à parte (``app.core.xml_signer``).

Tags opcionais vazias não são emitidas (o legado emitia e removia depois).

Eventos:
- **S-2210** evtCAT      — Comunicação de Acidente de Trabalho.
- **S-2220** evtMonit    — Monitoramento da Saúde (ASO).
- **S-2240** evtExpRisco — Condições Ambientais do Trabalho (agentes nocivos).
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass

from lxml import etree

_NS = {
    "S-2210": "http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00",
    "S-2220": "http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00",
    "S-2240": "http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00",
}
_LOTE_NS = "http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1"


@dataclass
class EsocialConfig:
    """Config mínima da empresa para montar os eventos."""
    ambiente: str          # '1' produção, '2' produção-restrita
    tipo_inscricao: str    # '1' CNPJ, '2' CPF...
    nr_inscricao: str


def _el(parent, tag: str, text: str | None = None):
    """Cria um subelemento OPCIONAL; se o texto for None/vazio, NÃO emite a tag."""
    if text is None or text == "":
        return None
    e = etree.SubElement(parent, tag)
    e.text = str(text)
    return e


def _el_obrig(parent, tag: str, text: str | None):
    """Subelemento obrigatório — emite mesmo vazio (mantém a estrutura)."""
    e = etree.SubElement(parent, tag)
    e.text = "" if text is None else str(text)
    return e


def gerar_id_evento(tipo_inscricao: str, nr_inscricao: str, *, agora: datetime.datetime | None = None) -> str:
    """ID do evento eSocial: ``ID`` + tpInsc + nrInsc(14) + AAAAMMDDHHMMSS + seq(5).

    Formato de 36 chars exigido pelo eSocial (porte do ``gerarIdEvento`` legado).
    """
    agora = agora or datetime.datetime.now()
    carimbo = agora.strftime("%Y%m%d%H%M%S")
    return f"ID{tipo_inscricao}{nr_inscricao.zfill(14)}{carimbo}00001"


def _ide_evento(evt, ambiente: str) -> None:
    ide = etree.SubElement(evt, "ideEvento")
    _el_obrig(ide, "indRetif", "1")
    _el_obrig(ide, "tpAmb", ambiente)
    _el_obrig(ide, "procEmi", "1")
    _el_obrig(ide, "verProc", "1.0.0")


def _ide_empregador(evt, cfg: EsocialConfig) -> None:
    ide = etree.SubElement(evt, "ideEmpregador")
    _el_obrig(ide, "tpInsc", cfg.tipo_inscricao)
    _el_obrig(ide, "nrInsc", cfg.nr_inscricao)


def _ide_vinculo(evt, dados: dict) -> None:
    iv = etree.SubElement(evt, "ideVinculo")
    _el_obrig(iv, "cpfTrab", dados.get("cpfTrabalhador"))
    _el(iv, "matricula", dados.get("matricula"))
    _el_obrig(iv, "codCateg", dados.get("codCateg"))


def _raiz(tipo: str, id_evento: str):
    root = etree.Element("eSocial", nsmap={None: _NS[tipo]})
    tag_evt = {"S-2210": "evtCAT", "S-2220": "evtMonit", "S-2240": "evtExpRisco"}[tipo]
    evt = etree.SubElement(root, tag_evt, Id=id_evento)
    return root, evt


def gerar_s2210(cfg: EsocialConfig, dados: dict) -> str:
    """S-2210 (CAT). Espera os campos do legado em ``dados``."""
    id_evento = gerar_id_evento(cfg.tipo_inscricao, cfg.nr_inscricao)
    root, evt = _raiz("S-2210", id_evento)
    _ide_evento(evt, cfg.ambiente)
    _ide_empregador(evt, cfg)
    _ide_vinculo(evt, dados)

    cat = etree.SubElement(evt, "cat")
    _el_obrig(cat, "dtAcid", dados.get("dtAcid"))
    _el_obrig(cat, "tpAcid", dados.get("tpAcid"))
    _el(cat, "hrAcid", dados.get("hrAcid"))
    _el(cat, "hrsTrabAntesAcid", dados.get("hrsTrabAntesAcid"))
    _el_obrig(cat, "tpCat", dados.get("tpCat"))
    _el_obrig(cat, "indCatObito", dados.get("indCatObito"))
    _el_obrig(cat, "indComunPolicia", dados.get("indComunPolicia"))
    _el_obrig(cat, "codSitGeradora", dados.get("codSitGeradora"))
    _el_obrig(cat, "iniciatCAT", dados.get("iniciatCAT"))

    local = etree.SubElement(cat, "localAcidente")
    _el_obrig(local, "tpLocal", dados.get("tpLocal"))
    _el(local, "dscLocal", dados.get("dscLocal"))

    parte = etree.SubElement(cat, "parteAtingida")
    _el_obrig(parte, "codParteAting", dados.get("codParteAting"))
    _el_obrig(parte, "lateralidade", dados.get("lateralidade"))

    agente = etree.SubElement(cat, "agenteCausador")
    _el_obrig(agente, "codAgntCausador", dados.get("codAgntCausador"))

    atestado = etree.SubElement(cat, "atestado")
    _el_obrig(atestado, "dtAtendimento", dados.get("dtAtendimento"))
    _el_obrig(atestado, "indInternacao", dados.get("indInternacao"))
    _el_obrig(atestado, "durTrat", dados.get("durTrat"))
    _el_obrig(atestado, "indAfast", dados.get("indAfast"))
    _el_obrig(atestado, "dscLesao", dados.get("dscLesao"))
    _el_obrig(atestado, "codCID", dados.get("codCID"))
    emit = etree.SubElement(atestado, "emitente")
    _el_obrig(emit, "nmEmit", dados.get("nmEmit"))
    _el_obrig(emit, "ideOC", dados.get("ideOC"))
    _el_obrig(emit, "nrOC", dados.get("nrOC"))
    return etree.tostring(root, encoding="unicode")


def gerar_s2220(cfg: EsocialConfig, dados: dict) -> str:
    """S-2220 (ASO/monitoramento). ``dados['exames']`` é lista de exames."""
    id_evento = gerar_id_evento(cfg.tipo_inscricao, cfg.nr_inscricao)
    root, evt = _raiz("S-2220", id_evento)
    _ide_evento(evt, cfg.ambiente)
    _ide_empregador(evt, cfg)
    _ide_vinculo(evt, dados)

    aso = etree.SubElement(evt, "aso")
    _el_obrig(aso, "dtAso", dados.get("dtAso"))
    _el_obrig(aso, "tpAso", dados.get("tpAso"))
    _el_obrig(aso, "resAso", dados.get("resAso"))
    for exame in dados.get("exames", []):
        ex = etree.SubElement(aso, "exame")
        _el_obrig(ex, "dtExm", exame.get("dtExm"))
        _el_obrig(ex, "procRealizado", exame.get("procRealizado"))
        _el_obrig(ex, "ordExame", exame.get("ordExame"))
        _el(ex, "indResult", exame.get("indResult"))
    med = etree.SubElement(aso, "medico")
    _el_obrig(med, "nmMed", dados.get("nmMed"))
    _el_obrig(med, "nrCRM", dados.get("nrCRM"))
    _el_obrig(med, "ufCRM", dados.get("ufCRM"))
    return etree.tostring(root, encoding="unicode")


def gerar_s2240(cfg: EsocialConfig, dados: dict) -> str:
    """S-2240 (condições ambientais). ``dados['agentesNocivos']`` é lista."""
    id_evento = gerar_id_evento(cfg.tipo_inscricao, cfg.nr_inscricao)
    root, evt = _raiz("S-2240", id_evento)
    _ide_evento(evt, cfg.ambiente)
    _ide_empregador(evt, cfg)
    _ide_vinculo(evt, dados)

    info = etree.SubElement(evt, "infoExpRisco")
    _el_obrig(info, "dtIniCondicao", dados.get("dtIniCondicao"))
    amb = etree.SubElement(info, "infoAmb")
    _el_obrig(amb, "codAmb", dados.get("codAmb"))
    _el_obrig(amb, "localAmb", dados.get("localAmb"))
    _el_obrig(amb, "dscSetor", dados.get("dscSetor"))
    ativ = etree.SubElement(info, "infoAtiv")
    _el_obrig(ativ, "dscAtivDes", dados.get("dscAtivDes"))

    for ag in dados.get("agentesNocivos", []):
        agno = etree.SubElement(info, "agNoc")
        _el_obrig(agno, "codAgNoc", ag.get("codAgNoc"))
        _el(agno, "dscAgNoc", ag.get("dscAgNoc"))
        _el(agno, "tpAval", ag.get("tpAval"))
        _el(agno, "intConc", ag.get("intConc"))
        epc = etree.SubElement(agno, "epcEpi")
        _el_obrig(epc, "utilizEPC", ag.get("utilizEPC") or "0")
        _el_obrig(epc, "utilizEPI", ag.get("utilizEPI") or "0")
        _el_obrig(epc, "epcEficaz", ag.get("epcEficaz") or "N")
        _el_obrig(epc, "epiEficaz", ag.get("epiEficaz") or "N")

    resp = etree.SubElement(info, "respReg")
    _el_obrig(resp, "cpfResp", dados.get("cpfResp"))
    _el_obrig(resp, "nmResp", dados.get("nmResp"))
    _el_obrig(resp, "ideOC", dados.get("ideOC"))
    _el_obrig(resp, "nrOC", dados.get("nrOC"))
    return etree.tostring(root, encoding="unicode")


GERADORES = {"S-2210": gerar_s2210, "S-2220": gerar_s2220, "S-2240": gerar_s2240}


def gerar_evento(tipo: str, cfg: EsocialConfig, dados: dict) -> str:
    """Despacha para o gerador do tipo. Levanta ValueError em tipo desconhecido."""
    gerador = GERADORES.get(tipo)
    if gerador is None:
        raise ValueError(f"Tipo de evento não suportado: {tipo}")
    return gerador(cfg, dados)


def montar_lote(cfg: EsocialConfig, eventos_assinados: list[str]) -> str:
    """Monta o XML do lote de eventos (envioLoteEventos grupo=2)."""
    root = etree.Element("eSocial", nsmap={None: _LOTE_NS})
    envio = etree.SubElement(root, "envioLoteEventos", grupo="2")
    ide_emp = etree.SubElement(envio, "ideEmpregador")
    _el_obrig(ide_emp, "tpInsc", cfg.tipo_inscricao)
    _el_obrig(ide_emp, "nrInsc", cfg.nr_inscricao)
    ide_trans = etree.SubElement(envio, "ideTransmissor")
    _el_obrig(ide_trans, "tpInsc", cfg.tipo_inscricao)
    _el_obrig(ide_trans, "nrInsc", cfg.nr_inscricao)
    eventos = etree.SubElement(envio, "eventos")
    lote_xml = etree.tostring(root, encoding="unicode")

    # Insere os eventos assinados (já são XML completos) dentro de <eventos>.
    eventos_xml = "".join(
        f'<evento Id="ID{i + 1}">{xml}</evento>'
        for i, xml in enumerate(eventos_assinados)
    )
    return lote_xml.replace("<eventos/>", f"<eventos>{eventos_xml}</eventos>")
