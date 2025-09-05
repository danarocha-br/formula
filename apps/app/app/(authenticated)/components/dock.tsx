import type React from "react";

import { Dock } from "@repo/design-system/components/ui/dock";
import { Icon } from "@repo/design-system/components/ui/icon";

import { useViewPreferenceStore } from "@/app/store/view-preference-store";
import { useTranslations } from '@/hooks/use-translation';

export type IconProps = React.HTMLAttributes<SVGElement>;

export const DockNavigation = () => {
  const { viewPreference, setViewPreference } = useViewPreferenceStore();
  const { t } = useTranslations();
  return (
    <div className="mx-auto fixed left-1/2 transform -translate-x-1/2 ">
      <Dock.Root direction="middle">
        <Dock.Icon
          isActive={viewPreference === "grid"}
          onClick={() => setViewPreference("grid")}
        >
          <Icon name="grid" label={t("common.accessibility.gridView")} color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "table"}
          onClick={() => setViewPreference("table")}
        >
          <Icon name="table" label={t("common.accessibility.tableView")} color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "node"}
          onClick={() => setViewPreference("node")}
        >
          <Icon name="node" label={t("common.accessibility.nodeView")} color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "chart"}
          onClick={() => setViewPreference("chart")}
        >
          <Icon name="chart" label={t("common.accessibility.chartView")} color="on-dark" size="xs" />
        </Dock.Icon>
      </Dock.Root>
    </div>
  );
};
