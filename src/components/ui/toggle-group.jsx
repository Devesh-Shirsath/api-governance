import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cn } from '@/lib/utils'

function ToggleGroup({ className, children, ...props }) {
  return (
    <ToggleGroupPrimitive.Root data-slot="toggle-group"
      className={cn('group/toggle-group flex w-fit items-center rounded-md shadow-xs', className)} {...props}>
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({ className, children, ...props }) {
  return (
    <ToggleGroupPrimitive.Item data-slot="toggle-group-item"
      className={cn('inline-flex h-8 min-w-8 flex-1 shrink-0 items-center justify-center gap-2 border border-input bg-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,box-shadow] outline-none hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:bg-accent data-[state=on]:text-foreground rounded-none first:rounded-l-md last:rounded-r-md border-l-0 first:border-l', className)}
      {...props}>
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
