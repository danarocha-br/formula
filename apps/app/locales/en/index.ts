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
      equipment: {
        computer: "Computer",
        phone: "Phone",
        tablet: "Tablet",
        monitor: "Monitor",
        keyboard: "Keyboard",
        mouse: "Mouse",
        printer: "Printer",
        camera: "Camera",
        headphones: "Headphones",
        speakers: "Speakers",
        hd: "External driver",
        other: "Other",
      }
    },
    period: {
      "per-month": "mo",
      "per-year": "year",
      monthly: "Monthly",
      yearly: "Yearly",
      months: "months",
    },
  },
  navigation: {
    "top-level": {
      "hourly-rate": "Hourly rate",
      "project-rate": "Project rate",
    },
    "bottom-level": {
      "fixed-cost": "Fixed cost",
      "variable-cost": "Equipment cost",
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
          "Just a friendly reminder that you won't keep all of your earnings. You'll need to set aside some for taxes and possibly cover fees for invoicing or payment processing. It's a good idea to plan for these expenses to keep everything running smoothly!",
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
      flow: {
        "monthly-salary": "How much do you want to make per month?",
        "billable-hours":
          "Consider that around 75% of your working day is billable.",
        "work-days": "How many work days per week will you work?",
        holidays:
          "How many national holidays per year will you take approximately?",
        vacations: "How many days per year will you take vacations?",
        "sick-leave":
          "Consider some sick leave days per year in case of illness.",
        taxes: "Consider what taxes you need to pay.",
        fees: "Consider fees for invoicing or payment processing or others.",
        margin:
          "Consider how much you want to add on top of your break even point.",
        "time-off": {
          title: "Time off",
          description:
            "This is the amount of time off per year that you will take.",
          formula: "Holidays + Vacations + Sick Leave",
        },
        "actual-work-days": {
          title: "Actual work days",
          description:
            "This is the amount of work days per year that you will work.",
          formula: "(Work days * 52 weeks) - Time off",
        },
        "total-yearly-cost": {
          title: "Your total yearly cost is:",
          description: "This is the result of your total yearly cost.",
          formula:
            "(Monthly cost * 12) + (Monthly salary * 12) + Yearly taxes and fees",
        },
        "total-monthly-cost": {
          title: "Your fixed monthly cost is:",
          description: "This is the result of your total fixed monthly cost.",
          formula: "All costs summed up =",
        },
        "total-billable-hours": {
          title: "Your annual billable hours is:",
          description:
            "This is the amount of billable hours per year that you will work.",
          formula: "Actual work days * Billable hours per day",
        },
        "hourly-rate": {
          title: "Your hourly rate is:",
          description: "Based on your inputs, this is your ideal hourly rate.",
          formula: "(Total yearly cost / Total billable hours) * margin %",
        },
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
