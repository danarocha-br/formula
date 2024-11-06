import { Icon, iconPath } from '@repo/design-system/components/ui/icon';
import { List } from '@repo/design-system/components/ui/list';
import { cn } from '@repo/design-system/lib/utils';

type ListItemProps = {
  title: string;
  data: React.ReactNode;
  icon: keyof typeof iconPath;
  itemsOnHover: React.ReactNode;
  className?: string;
};

export const ListItem = ({
  icon,
  title,
  data,
  className,
  itemsOnHover,
}: ListItemProps) => {
  return (
    <List.Item className={cn("relative group/list-item", className)}>
      <div className="flex items-center gap-2">
        <Icon name={icon} size="sm" label="Time off" />
        <span className="text-sm">{title}</span>
      </div>

      <span className="text-sm ">{data}</span>
      <div className="bg-neutral-100 absolute right-2.5 opacity-0 translate-x-1 group-hover/list-item:opacity-100 group-hover/list-item:translate-x-0 transition-all flex items-center gap-1">
        {itemsOnHover}
      </div>
    </List.Item>
  );
};
