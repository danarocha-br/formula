import { cva } from "class-variance-authority";

export const container = cva(
  [
    "group",
    "flex",
    "flex-col",
    "justify-center",
    "items-start",
    "w-full",
    "transition-all",
    "duration-300",
    "overflow-visible",
    "rounded-sm",

    "peer-focus/input:border-border",
  ],
  {
    variants: {
      isDisabled: {
        true: ["cursor-not-allowed", "opacity-70", "select-none"],

        false: [
        ],
      },

      hasError: {
        true: ["border border-destructive"],
      },

      isFocused: {
        true: [],
      },

      isLoading: {
        true: [],
      },

      isReadOnly: {
        true: ["border-none", "bg-transparent", "border-none"],
      },
    },
    defaultVariants: {
      isDisabled: false,
      isFocused: false,
      isLoading: false,
      isReadOnly: false,
    },
  }
);

export const label = cva(
  [
    "text-muted",
    "text-xs",
    "font-medium",
    "py-1",
    "px-3",
    "flex",
    "justify-between",
    "w-[-webkit-fill-available]",
    "relative",

    "[&.select-icon--error]:absolute",
    "[&.select-icon--error]:right-1",
  ],
  {
    variants: {
      isFocused: {
        true: [],
      },

      isDisabled: {
        true: ["opacity-70"],
      },

      isReadOnly: {
        true: ["border-none", "px-0"],
      },
    },

    defaultVariants: {
      isFocused: false,
      isDisabled: false,
      isReadOnly: false,
    },
  }
);

export const icon = cva([
  "fill-card-foreground",
]);

export const placeholder = cva(["text-muted"], {
  variants: {
    isDisabled: {
      true: ["opacity-70"],
    },
  },

  defaultVariants: {
    isDisabled: false,
  },
});

export const inputWrapper = cva(
  [
    "bg-input",
    "rounded-sm",
    "flex",
    "justify-between",
    "items-center",
    "gap-1",
    "pl-3",
    "pr-2",
    "w-full",
    "transition-all",
    "duration-300",
    "group/input",
    "peer/input",
    "min-h-[36px]",
    "outline-none",

    "focus-visible:outline-none",
    "focus:bg-ring/60",
  ],
  {
    variants: {
      isFocused: {
        true: [
          "bg-ring/60",
        ],
      },

      isDisabled: {
        true: [
          "cursor-not-allowed",
          "opacity-70",
          "select-none",
          "bg-border",
        ],

        false: [
          "group-hover:bg-ring/60",
        ],
      },

      isReadOnly: {
        true: [
          "!select-none",
          "bg-transparent",
          "!border-none",
          "!p-0",
          "!min-h-[0px]",

          "group-hover:!text-card-foreground",
          "group-hover:bg-transparent",
        ],
      },
    },
    defaultVariants: {
      isFocused: false,
      isDisabled: false,
      isReadOnly: false,
    },
  }
);

export const dialog = cva([
  "absolute",
  "top-2",
  "z-10",
  "w-full",
  "rounded-[4px]",
  "border",
  "border-border",
  "bg-popover",
  "outline-none",
]);

export const empty = cva([
  "text-muted",
  "flex",
  "flex-col",
  "justify-center",
  "items-center",
  "gap-3",
  "p-2",
  "w-full",
]);

export const item = cva(["group/item", "gap-2"], {
  variants: {
    isActive: {
      true: [],
    },

    isMulti: {
      true: [],
    },
  },

  compoundVariants: [
    {
      isActive: true,
      isMulti: false,
      class: [
        // "bg-interactive-color-background-subdued/20",
        // "hover:bg-interactive-color-background-subdued/30",
      ],
    },
  ],

  defaultVariants: {
    isActive: false,
    isMulti: false,
  },
});

export const deleteButton = cva(
  [
    "opacity-80",
    "outline-none",
    "transition-opacity",

    "hover:bg-transparent",
    "hover:opacity-100",

    "focus:outline-none",
    "focus:outline-offset-0",
    "focus:outline-transparent",

    "group-hover:text-foreground",
  ],
  {
    variants: {
      isFocused: {
        true: [],
        false: [],
      },
    },

    defaultVariants: {
      isFocused: false,
    },
  }
);

export const chips = cva(
  [
    "truncate",
    "text-left",
    "text-sm",
    "flex",
    "gap-1",
    "w-full",
    "items-center",
  ],
  {
    variants: {
      hasSlot: {
        true: [
          "[&_svg]:w-3",
          "[&_svg]:h-3",

          "[&_.avatar_span]:w-3",
          "[&_.avatar_span]:h-3",
          "[&_.avatar-initials]:text-xxs",
        ],
      },
    },
    defaultVariants: {
      hasSlot: false,
    },
  }
);
