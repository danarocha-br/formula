import { Handle, Position } from "reactflow";
import { Icon } from '../icon';
interface OutputNodeProps {
  data: {
    label: string;
    value: number | string;
    description?: string;
    currency?: string;
    formula?: string;
    position: Position;
  };
}
export const OutputNode = ({ data }: OutputNodeProps) => {
  return (
    <div className="">
      <div className="node-header">{data.label}</div>
      <div className="node-content">
        <div className="node-output mb-4">
            <code className="bg-background block px-4 text-foreground/80 py-2 text-sm">
              {data.formula}
              <div className="node-output !text-foreground pt-2 !text-3xl">{data.value}</div>
            </code>
        </div>
        <div className="node-description flex gap-2">
          <i>
            <Icon name="alert" label="note" size="sm" />
          </i>
          {data.description}
        </div>
      </div>
      <Handle type="target" position={data.position ? data.position : Position.Left} />
    </div>
  );
};
