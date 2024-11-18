import type { Messages } from "../en";

export const ptBR: Messages = {
  common: {
    title: "Bem-vindo",
    description: "Este é meu aplicativo",
    currency: "BRL",
    "currency-symbol": "R$",
    "not-found": "Nenhum resultado encontrado.",
    search: "Procurar...",
    delete: "Excluir",
    edit: "Editar",
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
      monthly: "Por mês",
      yearly: "Por ano",
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
      "edit-expense": "Salvar",
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
        "billable-hours-period": "horas por dia",
        holidays: "Feriados nacionais",
        "holidays-period": "dias por ano",
        vacations: "Dias úteis de férias",
        "vacations-period": "por ano",
        "sick-leave": "Dias de licença médica",
        "sick-leave-period": "dias por ano",
        "monthly-salary": "Salário mensal",
        "monthly-salary-period": "por mês",
        "time-off": "Dias não trabalhados",
        "time-off-period": "dias por ano",
        "actual-work-days": "Dias trabalhados",
        "actual-work-days-period": "dias por ano",
        "billable-hours-summary": "Horas faturáveis",
        "billable-hours-summary-period": "horas por ano",
        taxes: "Impostos",
        fees: "Outras tarifas",
        margin: "Margem de lucro",
      },
      taxes: {
        title: "Impostos e outras taxas",
        subtitle:
          "Vale lembrar que, será necessário reservar uma parte para impostos e talvez cobrir taxas de faturamento ou processamento de pagamentos.",
      },
      margin: {
        title: "Margem de lucro",
        subtitle:
          "Ao calcular sua tarifa ideal, é interessante adicionar um pouco mais além do seu ponto de equilíbrio. Considere fatores como seu nível de habilidade, localização e o que seus concorrentes estão cobrando.",
      },
      summary: {
        title: "Resumo",
      },
      breakeven: {
        "break-even": "Ponto de equilíbrio",
        "per-year": "por ano",
        "monthly-rate": "Valor do mês",
        "per-month": "por mês",
        "hourly-rate": "Valor da hora",
        "per-hour": "por hora",
        "day-rate": "Valor do dia",
        "per-day": "por dia",
        "week-rate": "Valor da semana",
        "per-week": "por semana",
      },
      flow: {
        "monthly-salary": "Considere o quanto você quer ganhar por mês.",
        "billable-hours":
          "Considere que apenas 75% das suas horas trabalhadas no dia sejam faturáveis,",
        "work-days": "Quantos dias por semana você trabalhará?",
        holidays:
          "Considere quantos feriados nacionais terá por ano?",
        vacations: "Quantos dias de férias terá por ano?",
        "sick-leave":
          "Quantos dias de licença médica poderá ter por ano?",
        taxes: "Consider quais impostos serão incididos no seu trabalho.",
        fees: "Consider quais outras taxas poderão ser cobradas.",
        margin:
          "Considere quantos porcento de margem de lucro terá.",
        "time-off": {
          title: "Dias que não trabalhará ao ano",
          description:
            "Este é o total de dias que vocé não trabalhará por ano.",
          formula: "Feriados + Férias + Licença médica",
        },
        "actual-work-days": {
          title: "Dias trabalhados ao ano",
          description:
            "Este é o total de dias que vocé trabalhará ao ano.",
          formula: "(Dias trabalhados * 52 semanas) - Dias não trabalhados ao ano",
        },
        "total-yearly-cost": {
          title: "Seu custo anual é:",
          description: "Este é o seu custo total anual.",
          formula:
            "(Custo fixo mensal * 12) + (Salário mensal * 12) + Impostos e/ou taxas anuais",
        },
        "total-monthly-cost": {
          title: "Seu custo fixo mensal total é:",
          description: "Este é o seu custo fixo mensal.",
          formula: "Soma de todos os seus custos fixos  =",
        },
        "total-billable-hours": {
          title: "Seu total de horas faturáveis é:",
          description:
            "Este é o total de horas faturáveis ao ano.",
          formula: "Dias trabalhados ano ano * Horas trabalhadas por dia",
        },
        "hourly-rate": {
          title: "Seu valor da hora é:",
          description: "Baseado no seu ponto de equilíbrio e a margem de lucro.",
          formula: "(Custo total anual / Horas faturáveis) * margem de lucro %",
        },
      },
      total: {
        title: "O valor da sua hora é:",
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
      "update-failed":
        "Ops! Não conseguimos atualizar o item(s). Tente novamente!",
      "delete-failed":
        "Ops! Não conseguimos excluir o item(s). Tente novamente!",
      "list-update-failed":
        "Oops! Não conseguimos atualizar sua lista. Tente novamente!",
    },
  },
  auth: {
    signIn: "Entrar",
    signOut: "Sair",
  },
};
