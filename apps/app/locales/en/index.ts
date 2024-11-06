export const en = {
  common: {
    title: "Welcome",
    description: "This is my app",
    currency: "USD",
    "currency-symbol": "$",
    "not-found": "No results found.",
    search: "Search...",
    categories: {
      "fixed-cost": {
        rent: "Rent",
        utilities: "Utilities",
        electricity: "Electricity",
        internet: "Internet",
        insurance: "Insurance",
        subscriptions: "Subscriptions",
        cloud: "Cloud services",
        transport: "Transport",
        domain: "Domain/hosting",
        tools: "Tools",
        accounting: "Accounting",
        banking: "Banking fees",
        marketing: "Marketing",
        courses: "Courses/training",
        other: "Other",
      }
    }
  },
  navigation: {
    "top-level": {
      "hourly-rate": "Hourly rate",
      "project-rate": "Project rate",
    },
    "bottom-level": {
      "fixed-cost": "Fixed cost",
      "variable-cost": "Variable cost",
      "equipment-cost": "Equipment cost",
    },
  },
  expenses: {
    actions: {
      "add-expense": "Add expense",
    },
    form: {
      category: "Select category",
      name: "Expense name",
      value: "Expense cost",
      period: "per month"
    }
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
  },
};

export type Messages = typeof en;
