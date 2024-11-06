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
      category: "Selecione uma categoria",
      name: "Nome do custo",
      value: "Valor do custo",
      period: "por mês",
    },
  },
  auth: {
    signIn: "Entrar",
    signOut: "Sair",
  },
};
