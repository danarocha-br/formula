import type { Messages } from "../en";

export const ptBR: Messages = {
  common: {
    title: "Bem-vindo",
    description: "Este é meu aplicativo",
    currency: "BRL",
    "currency-symbol": "R$",
    "not-found": "Nenhum resultado encontrado.",
    search: "Procurar...",
    categories: {
      "fixed-cost": {
        rent: "Aluguel",
        utilities: "Condomínio",
        electricity: "Energia",
        internet: "Internet/Telefone",
        insurance: "Seguro",
        subscriptions: "Assinaturas",
        cloud: "Serviços da nuvem",
        transport: "Transporte",
        domain: "Domínio/Hospedagem",
        tools: "Ferramentas",
        accounting: "Contabilidade",
        banking: "Tarifas bancárias",
        marketing: "Marketing",
        courses: "Cursos/Treinamentos",
        other: "Outros",
      },
    },
    period: {
      "per-month": "mês",
      "per-year": "ano",
    },
  },
  navigation: {
    "top-level": {
      "hourly-rate": "Valor da hora",
      "project-rate": "Valor do projeto",
    },
    "bottom-level": {
      "fixed-cost": "Custo fixo",
      "variable-cost": "Custo variável",
      "equipment-cost": "Custo equipamentos",
    },
  },
  expenses: {
    actions: {
      "add-expense": "Adicionar custo",
    },
    form: {
      category: "Selecione categoria",
      name: "Nome do custo",
      value: "Valor do custo",
      period: "por mês",
    },
    billable: {
      title: "Horas produtivas",
      subtitle:
        "Uma regra geral é que cerca de apenas 75% dos seus dias trabalhados sejam faturáveis. Isso significa que se você trabalhar 8 horas por dia, 6 horas serão faturáveis.",
      form: {
        "work-days": "Dias trabalhados",
        "work-days-period": "dias por semana",
        "billable-hours": "Horas trabalhadas",
        "billable-hours-period": "por dia",
        holidays: "Feriados nacionais",
        "holidays-period": "por ano",
        vacations: "Dias úteis de férias",
        "vacations-period": "por ano",
        "sick-leave": "Dias de licença médica",
        "sick-leave-period": "por ano",
        "monthly-salary": "Salário mensal",
        "monthly-salary-period": "por mês",
        "time-off": "Dias não trabalhados",
        "time-off-period": "por ano",
        "actual-work-days": "Dias trabalhados",
        "actual-work-days-period": "dias por ano",
        "billable-hours-summary": "Horas faturáveis",
        "billable-hours-summary-period": "horas por ano",
      },
      total: {
        title: "Seus custos totais são:",
      },
    },
  },
  validation: {
    form: {
      select: "Por favor, selecione um item.",
      required: "Este campo é obrigatório.",
    },
    error: {
      unauthorized: "Voce não tem permissão para realizar essa operação.",
      "not-found": "Item não encontrado.",
      "create-failed": "Ops! Não conseguimos criar o item. Tente novamente!",
      "update-failed": "Ops! Não conseguimos atualizar o item(s). Tente novamente!",
      "list-update-failed": "Oops! Não conseguimos atualizar sua lista. Tente novamente!",
    },
  },
  auth: {
    signIn: "Entrar",
    signOut: "Sair",
  },
};
