import { getTranslations } from '@/utils/translations';

const t = getTranslations();

export const FIXED_COST_CATEGORIES = [
  {
    label: t.common.categories["fixed-cost"]["rent"],
    value: "rent",
    icon: "rental",
    color: "bg-froly-200",
  },
  {
    label: t.common.categories["fixed-cost"]["utilities"],
    value: "utilities",
    icon: "utilities",
    color: "bg-[#F07D66]",
  },
  {
    label: t.common.categories["fixed-cost"]["electricity"],
    value: "energy",
    icon: "energy",
    color: "bg-green-300",
  },
  {
    label: t.common.categories["fixed-cost"]["internet"],
    value: "internet/phone",
    icon: "internet",
    color: "bg-yellow-300",
  },
  {
    label: t.common.categories["fixed-cost"]["insurance"],
    value: "insurance",
    icon: "insurance",
    color: "bg-purple-300",
  },
  {
    label: t.common.categories["fixed-cost"]["subscriptions"],
    value: "subscriptions",
    icon: "subscriptions",
    color: "bg-froly-300",

  },
  {
    label: t.common.categories["fixed-cost"]["cloud"],
    value: "cloud services",
    icon: "cloud",
    color: "bg-cyan-300",
  },
  {
    label: t.common.categories["fixed-cost"]["domain"],
    value: "server",
    icon: "server",
    color: "bg-neutral-300",
  },
  {
    label: t.common.categories["fixed-cost"]["tools"],
    value: "tools",
    icon: "tools",
    color: "bg-froly-100",
  },
  {
    label: t.common.categories["fixed-cost"]["accounting"],
    value: "accounting",
    icon: "accounting",
    color: "bg-[#1F937060]",
  },
  {
    label: t.common.categories["fixed-cost"]["banking"],
    value: "banking fees",
    icon: "fees",
    color: "bg-[#FF8686]",
  },
  {
    label: t.common.categories["fixed-cost"]["marketing"],
    value: "marketing",
    icon: "marketing",
    color: "bg-[#E8EF16]",
  },
  {
    label: t.common.categories["fixed-cost"]["courses"],
    value: "courses/training",
    icon: "learning",
    color: "bg-green-400",
  },
  {
    label: t.common.categories["fixed-cost"]["other"],
    value: "other",
    icon: "other",
    color: "bg-neutral-100",
  },
];
