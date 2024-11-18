import { Handle, Position } from "reactflow";
import { Icon } from "../icon";
interface CalculationNodeProps {
  data: {
    label: string;
    formula: string;
    result: number | string;
    description?: string;
    sourcePosition?: Position;
    targetPosition?: Position;
  };
}
export const CalculationNode = ({ data }: CalculationNodeProps) => {
  return (
    <div className="calculation-node">
      <div className="node-header">{data.label}</div>
      <div>
        <div className="px-4">
          <code className="bg-purple-100 rounded-sm block px-4 text-card-foreground py-2 text-sm">
            {data.formula}
            <div className="node-output !text-card-foreground">
              {data.result}
            </div>
          </code>
        </div>

        {data.description && (
          <div className="node-description flex">
            <i className='mr-2'>
              <Icon name="alert" label="note" size="sm" />
            </i>
            {data.description}
          </div>
        )}
      </div>
      <Handle
        type="target"
        position={data.targetPosition ? data.targetPosition : Position.Left}
      />
      <Handle
        type="source"
        position={data.sourcePosition ? data.sourcePosition : Position.Right}
      />
    </div>
  );
};
