import React from "react";
import { Dock } from "@repo/design-system/components/ui/dock";
import { Icon } from "@repo/design-system/components/ui/icon";

import { useViewPreferenceStore } from '@/app/store/view-preference-store';

export type IconProps = React.HTMLAttributes<SVGElement>;

export const DockNavigation = () => {
  const {setViewPreference} = useViewPreferenceStore()
  return (
    <div className="mx-auto fixed left-1/2 transform -translate-x-1/2 ">
      <Dock.Root direction="middle">
        <Dock.Icon onClick={() => setViewPreference("grid")}>
          <Icon name="grid" label="Grid view" color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon onClick={() => setViewPreference("table")}>
          <Icon name="table" label="Table view" color="on-dark" size="xs" />
        </Dock.Icon>

        <Dock.Icon onClick={() => setViewPreference("node")}>
          <Icon name="node" label="Node view" color="on-dark" size="xs" />
        </Dock.Icon>
      </Dock.Root>
    </div>
  );
};

