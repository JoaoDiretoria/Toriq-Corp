import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccessLog } from "@/hooks/useAccessLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Terceiro {
  id: string;
  empresa_id: string;
  nome_empresa_terceira: string;
  responsavel: string;
  documentos_entregues: string;
  status_conformidade: string;
  data_validade_documentos: string;
  created_at: string;
  updated_at: string;
}

interface TerceiroForm {
  nome_empresa_terceira: string;
  responsavel: string;
  documentos_entregues: string;
  status_conformidade: string;
  data_validade_documentos: string;
}

const statusOptions = [
  { value: "conforme", label: "Conforme", icon: CheckCircle, color: "text-green-600 bg-green-500/10" },
  { value: "pendente", label: "Pendente", icon: Clock, color: "text-yellow-600 bg-yellow-500/10" },
  { value: "vencido", label: "Vencido", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
];

const GestaoTerceiros = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { logView, logCreate, logUpdate, logDelete } = useAccessLog();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerceiro, setSelectedTerceiro] = useState<Terceiro | null>(null);
  const [formData, setFormData] = useState<TerceiroForm>({
    nome_empresa_terceira: "",
    responsavel: "",
    documentos_entregues: "",
    status_conformidade: "pendente",
    data_validade_documentos: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile?.empresa_id || profile?.role === "admin_vertical") {
      fetchTerceiros();
      logView('Terceiros', 'Gestão de Terceiros', 'Acessou a página de gestão de terceiros');
    }
  }, [profile]);

  const fetchTerceiros = async () => {
    try {
      const { data, error } = await supabase
        .from("terceiros")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTerceiros(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar terceiros",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularStatusReal = (dataValidade: string, statusManual: string): string => {
    const hoje = startOfDay(new Date());
    const validade = parseISO(dataValidade);
    
    if (isBefore(validade, hoje)) {
      return "vencido";
    }
    return statusManual;
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[1];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.empresa_id && profile?.role !== "admin_vertical") {
      toast({
        title: "Erro",
        description: "Usuário não está vinculado a uma empresa",
        variant: "destructive",
      });
      return;
    }

    try {
      const terceiroData = {
        ...formData,
        empresa_id: profile.empresa_id,
      };

      if (selectedTerceiro) {
        const { error } = await supabase
          .from("terceiros")
          .update(terceiroData)
          .eq("id", selectedTerceiro.id);

        if (error) throw error;
        toast({ title: "Terceiro atualizado com sucesso!" });
        logUpdate('Terceiros', 'Gestão de Terceiros', `Atualizou terceiro: ${formData.nome_empresa_terceira}`, { id: selectedTerceiro.id, nome: formData.nome_empresa_terceira });
      } else {
        const { error } = await supabase.from("terceiros").insert(terceiroData);

        if (error) throw error;
        toast({ title: "Terceiro cadastrado com sucesso!" });
        logCreate('Terceiros', 'Gestão de Terceiros', `Cadastrou terceiro: ${formData.nome_empresa_terceira}`, { nome: formData.nome_empresa_terceira });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTerceiros();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar terceiro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (terceiro: Terceiro) => {
    setSelectedTerceiro(terceiro);
    setFormData({
      nome_empresa_terceira: terceiro.nome_empresa_terceira,
      responsavel: terceiro.responsavel,
      documentos_entregues: terceiro.documentos_entregues || "",
      status_conformidade: terceiro.status_conformidade,
      data_validade_documentos: terceiro.data_validade_documentos,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTerceiro) return;

    try {
      const { error } = await supabase
        .from("terceiros")
        .delete()
        .eq("id", selectedTerceiro.id);

      if (error) throw error;

      toast({ title: "Terceiro excluído com sucesso!" });
      logDelete('Terceiros', 'Gestão de Terceiros', `Excluiu terceiro: ${selectedTerceiro.nome_empresa_terceira}`, { id: selectedTerceiro.id, nome: selectedTerceiro.nome_empresa_terceira });
      setIsDeleteDialogOpen(false);
      setSelectedTerceiro(null);
      fetchTerceiros();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir terceiro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedTerceiro(null);
    setFormData({
      nome_empresa_terceira: "",
      responsavel: "",
      documentos_entregues: "",
      status_conformidade: "pendente",
      data_validade_documentos: "",
    });
  };

  const terceirosComStatusReal = terceiros.map((t) => ({
    ...t,
    statusReal: calcularStatusReal(t.data_validade_documentos, t.status_conformidade),
  }));

  const filteredTerceiros = terceirosComStatusReal.filter((terceiro) => {
    const matchesSearch =
      terceiro.nome_empresa_terceira.toLowerCase().includes(searchTerm.toLowerCase()) ||
      terceiro.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || terceiro.statusReal === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: terceirosComStatusReal.length,
    conformes: terceirosComStatusReal.filter((t) => t.statusReal === "conforme").length,
    pendentes: terceirosComStatusReal.filter((t) => t.statusReal === "pendente").length,
    vencidos: terceirosComStatusReal.filter((t) => t.statusReal === "vencido").length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Gestão de Terceiros
              </h1>
              <p className="text-muted-foreground text-sm">
                Gerencie prestadores de serviço e terceiros
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Terceiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTerceiro ? "Editar Terceiro" : "Novo Terceiro"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa_terceira">Nome da Empresa</Label>
                  <Input
                    id="nome_empresa_terceira"
                    value={formData.nome_empresa_terceira}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_empresa_terceira: e.target.value })
                    }
                    placeholder="Ex: Limpeza ABC Ltda"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavel: e.target.value })
                    }
                    placeholder="Nome do responsável"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_validade_documentos">Validade dos Documentos</Label>
                  <Input
                    id="data_validade_documentos"
                    type="date"
                    value={formData.data_validade_documentos}
                    onChange={(e) =>
                      setFormData({ ...formData, data_validade_documentos: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_conformidade">Status de Conformidade</Label>
                  <Select
                    value={formData.status_conformidade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status_conformidade: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Nota: Se a data de validade estiver vencida, o status será automaticamente "Vencido"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentos_entregues">Documentos Entregues</Label>
                  <Textarea
                    id="documentos_entregues"
                    value={formData.documentos_entregues}
                    onChange={(e) =>
                      setFormData({ ...formData, documentos_entregues: e.target.value })
                    }
                    placeholder="Liste os documentos entregues (um por linha)"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {selectedTerceiro ? "Salvar Alterações" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Conformes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.conformes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.vencidos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTerceiros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum terceiro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTerceiros.map((terceiro) => {
                    const statusConfig = getStatusConfig(terceiro.statusReal);
                    const StatusIcon = statusConfig.icon;
                    const documentos = terceiro.documentos_entregues
                      ? terceiro.documentos_entregues.split("\n").filter(Boolean)
                      : [];

                    return (
                      <TableRow key={terceiro.id}>
                        <TableCell className="font-medium">
                          {terceiro.nome_empresa_terceira}
                        </TableCell>
                        <TableCell>{terceiro.responsavel}</TableCell>
                        <TableCell>
                          {documentos.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{documentos.length} doc(s)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.color} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(terceiro.data_validade_documentos), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(terceiro)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedTerceiro(terceiro);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredTerceiros.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum terceiro encontrado
              </CardContent>
            </Card>
          ) : (
            filteredTerceiros.map((terceiro) => {
              const statusConfig = getStatusConfig(terceiro.statusReal);
              const StatusIcon = statusConfig.icon;
              const documentos = terceiro.documentos_entregues
                ? terceiro.documentos_entregues.split("\n").filter(Boolean)
                : [];

              return (
                <Card key={terceiro.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{terceiro.nome_empresa_terceira}</h3>
                        <p className="text-sm text-muted-foreground">
                          {terceiro.responsavel}
                        </p>
                      </div>
                      <Badge className={`${statusConfig.color} gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validade:</span>
                        <span>
                          {format(parseISO(terceiro.data_validade_documentos), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Documentos:</span>
                        <span>{documentos.length} entregue(s)</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(terceiro)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTerceiro(terceiro);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o terceiro "
                {selectedTerceiro?.nome_empresa_terceira}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default GestaoTerceiros;
