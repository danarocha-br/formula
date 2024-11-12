export const en = {
  common: {
    title: "Welcome",
    description: "This is my app",
    currency: "USD",
    "currency-symbol": "$",
    "not-found": "No results found.",
    search: "Search...",
    delete: "Delete",
    edit: "Edit",
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
      },
    },
    period: {
      "per-month": "mo",
      "per-year": "year",
    },
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
      "edit-expense": "Save changes",
    },
    form: {
      category: "Select category",
      name: "Expense name",
      value: "Expense cost",
      period: "per month",
    },
    billable: {
      title: "Billable costs",
      subtitle:
        "A general rule of thumb is to assume that around 75% of your working day will be spent on billable tasks. This means if you have an 8-hour workday, you can realistically estimate 6 billable hours.",
      form: {
        "work-days": "Work days",
        "work-days-period": "days per week",
        "billable-hours": "Billable hours",
        "billable-hours-period": "hours per day",
        holidays: "National holidays",
        "holidays-period": "days per year",
        vacations: "Vacations",
        "vacations-period": "days per year",
        "sick-leave": "Sick leave",
        "sick-leave-period": "days per year",
        "monthly-salary": "Monthly salary",
        "monthly-salary-period": "per month",
        "time-off": "Time off",
        "time-off-period": "days per year",
        "actual-work-days": "Actual work days",
        "actual-work-days-period": "days per year",
        "billable-hours-summary": "Billable hours",
        "billable-hours-summary-period": "hours per year",
        taxes: "Taxes",
        fees: "Other fees",
        margin: "Margin",
      },
      taxes: {
        title: "Taxes & fees",
        subtitle:
          "Just a friendly reminder that as a freelancer, you won't keep all of your earnings. You'll need to set aside some for taxes and possibly cover fees for invoicing or payment processing. It's a good idea to plan for these expenses to keep everything running smoothly!",
      },
      margin: {
        title: "Your margin",
        subtitle:
          "When figuring out your ideal rate, it's interesting to add a little extra on top of your break-even point. Consider factors like your skill level, where you're located, and what your competitors are charging. This way, you can ensure you're getting the value you deserve!",
      },
      summary: {
        title: "Summary",
      },
      breakeven: {
        "break-even": "Break even point",
        "per-year": "per year",
        "monthly-rate": "Monthly rate",
        "per-month": "per month",
        "hourly-rate": "Hourly rate",
        "per-hour": "per hour",
        "day-rate": "Day rate",
        "per-day": "per day",
        "week-rate": "Week rate",
        "per-week": "per week",
      },
      total: {
        title: "Your hourly cost is:",
      },
    },
  },
  validation: {
    form: {
      select: "Please select an item.",
      required: "This field is required.",
    },
    error: {
      unauthorized: "You are not authorized to perform this action.",
      "not-found": "Resource not found.",
      "create-failed": "Oops! We couldn't create the item. Let's try again!",
      "update-failed": "Oops! We couldn't update the item(s). Let's try again!",
      "delete-failed": "Oops! We couldn't delete the item(s). Let's try again!",
      "list-update-failed":
        "Oops! We couldn't update your list. Let's try again!",
    },
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
  },
};

export type Messages = typeof en;
