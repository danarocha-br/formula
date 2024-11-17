import { Handle, Position } from "reactflow";
import { Icon } from '../icon';
interface OutputNodeProps {
  data: {
    label: string;
    value: number;
    description?: string;
    currency?: string;
  };
}
export const OutputNode = ({ data }: OutputNodeProps) => {
  return (
    <div className="">
      <div className="node-header">{data.label}</div>
      <div className="node-content">
        <div className="node-output">
          <code className="text-xl bg-neutral-700 block px-4 text-foreground py-2">
            {!!data.currency && data.currency} {data.value.toFixed(2)}
          </code>
        </div>
        <div className="node-description flex gap-2">
          <i>
            <Icon name="alert" label="note" size="sm" />
          </i>
          {data.description}
        </div>
      </div>
      <Handle type="target" position={Position.Left} />
    </div>
  );
};
