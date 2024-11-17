import { memo } from "react";
import { Handle, Position } from "reactflow";

type GroupNodeProps = {
  data: {
    label: string;
  };
};

export const GroupNode = memo(({ data }: GroupNodeProps) => {
  return (
    <>
      <div className="px-4 py-2 !bg-transparent !min-w-[400px]">
        <div className="flex">
          <div className="ml-2">
            <div className="text-lg font-bold">{data.label}</div>
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
      />
      <Handle
        type="source"
        position={Position.Bottom}
      />
    </>
  );
});

GroupNode.displayName = "GroupNode";
