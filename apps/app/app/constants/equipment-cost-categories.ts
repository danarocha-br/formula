import { getTranslations } from '@/utils/translations';

const t = getTranslations();

export const EQUIPMENT_COST_CATEGORIES = [
  {
    label: t.common.categories["equipment"].computer,
    value: "computer",
    icon: "computer",
    color: "bg-[#E8EF16]",
  },
  {
    label: t.common.categories["equipment"].monitor,
    value: "monitor",
    icon: "monitor",
    color: "bg-[#F07D66]",
  },
  {
    label: t.common.categories["equipment"].keyboard,
    value: "keyboard",
    icon: "keyboard",
    color: "bg-green-300",
  },
  {
    label: t.common.categories["equipment"].mouse,
    value: "mouse",
    icon: "mouse",
    color: "bg-yellow-300",
  },
  {
    label: t.common.categories["equipment"].printer,
    value: "printer",
    icon: "printer",
    color: "bg-purple-300",
  },
  {
    label: t.common.categories["equipment"].hd,
    value: "external driver",
    icon: "external driver",
    color: "bg-[#FF8686]",
  },
  {
    label: t.common.categories["equipment"].camera,
    value: "camera",
    icon: "camera",
    color: "bg-cyan-300",
  },
  {
    label: t.common.categories["equipment"].headphones,
    value: "headphones",
    icon: "headphones",
    color: "bg-neutral-300",
  },
  {
    label: t.common.categories["equipment"].phone,
    value: "phone",
    icon: "phone",
    color: "bg-[#1F937060]",
  },
  {
    label: t.common.categories["equipment"].tablet,
    value: "tablet",
    icon: "tablet",
    color: "bg-green-400",
  },
  {
    label: t.common.categories["equipment"].speakers,
    value: "speakers",
    icon: "speakers",
    color: "bg-neutral-100",
  },
  {
    label: t.common.categories["equipment"].other,
    value: "other",
    icon: "other",
    color: "bg-froly-100",
  },
];
