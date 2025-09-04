import type React from "react";

import { Dock } from "@repo/design-system/components/ui/dock";
import { Icon } from "@repo/design-system/components/ui/icon";

import { useViewPreferenceStore } from "@/app/store/view-preference-store";

export type IconProps = React.HTMLAttributes<SVGElement>;

export const DockNavigation = () => {
  const { viewPreference, setViewPreference } = useViewPreferenceStore();
  return (
    <div className="mx-auto fixed left-1/2 transform -translate-x-1/2 ">
      <Dock.Root direction="middle">
        <Dock.Icon
          isActive={viewPreference === "grid"}
          onClick={() => setViewPreference("grid")}
        >
          <Icon name="grid" label="Grid view" color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "table"}
          onClick={() => setViewPreference("table")}
        >
          <Icon name="table" label="Table view" color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "node"}
          onClick={() => setViewPreference("node")}
        >
          <Icon name="node" label="Node view" color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon
          isActive={viewPreference === "chart"}
          onClick={() => setViewPreference("chart")}
        >
          <Icon name="chart" label="Analytics view" color="on-dark" size="xs" />
        </Dock.Icon>
      </Dock.Root>
    </div>
  );
};
