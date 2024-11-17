import { forwardRef } from "react";
import { NumericFormat } from "react-number-format";
import { Handle, Position } from "reactflow";
import { inputNumeric } from "../slider-card";
import { Slider } from "../slider";
import { Skeleton } from "../skeleton";
import { Icon, iconPath } from "../icon";
interface InputNodeProps extends React.HTMLAttributes<HTMLInputElement> {
  data: {
    name?: string;
    label: string;
    value: number;
    max?: number;
    min?: number;
    description?: string;
    currency?: string;
    onChange: (value: number) => void;
    disabled?: boolean;
    loading?: boolean;
    suffix?: string;
    icon?: keyof typeof iconPath;
  };
}
export const InputNode = forwardRef<HTMLInputElement, InputNodeProps>(
  ({ data }: InputNodeProps, ref) => {
    const baseMax = Number(data.max) || 1000;
    const sliderValue = Math.min((data.value / baseMax) * 100, 100);

    return (
      <div className="">
        <div className="node-header flex gap-2 items-center">
          {!!data.icon && <Icon name={data.icon} label=" " size="sm" />}
          {data.label}
        </div>
        <div className=" px-4">
          <div className="flex flex-col gap-1 w-full relative">
            <div className="relative w-full flex justify-between bg-ring/60 hover:bg-ring/80 rounded-sm transition-colors">
              <NumericFormat
                getInputRef={ref}
                value={data.value}
                onValueChange={(values) => {
                  const newValue = Math.min(
                    Math.max(0, Number(values.value)),
                    Number(data.max) || baseMax
                  );
                  data.onChange?.(newValue);
                }}
                placeholder="0"
                className={inputNumeric()}
                name={data.name}
                id={data.name}
                // disabled={data.disabled || loading}
                min={data.min}
                max={data.max}
                thousandSeparator={data.currency === "$" ? "," : "."}
                decimalSeparator={data.currency === "$" ? "." : ","}
                prefix={data.currency ? data.currency : undefined}
              />
              {!!data.suffix && (
                <span className="whitespace-nowrap lowercase text-right absolute right-3 top-2 text-sm select-none">
                  {!data.loading ? (
                    data.suffix
                  ) : (
                    <Skeleton className="w-12 h-5 bg-neutral-300" />
                  )}
                </span>
              )}
            </div>
            <Slider
              className="absolute bottom-0"
              value={[sliderValue]}
              onValueChange={(newValue: number[]) => {
                //@ts-ignore
                const calculatedValue = Math.round(
                  (newValue[0] / 100) * baseMax
                );
                data.onChange?.(calculatedValue);
              }}
              min={0}
              max={100}
              disabled={data.loading || data.disabled}
            />
          </div>
        </div>
        {data.description && (
          <div className="node-description flex gap-2">
            <i>
              <Icon name="alert" label="note" size="sm" />
            </i>
            {data.description}
          </div>
        )}
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }
);
