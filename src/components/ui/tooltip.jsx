import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = ({ delayDuration = 0, ...props }) => <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
const Tooltip = (props) => <TooltipProvider><TooltipPrimitive.Root data-slot="tooltip" {...props} /></TooltipProvider>
const TooltipTrigger = (props) => <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />

function TooltipContent({ className, sideOffset = 4, children, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset}
        className={cn('bg-primary text-primary-foreground z-50 w-fit max-w-64 rounded-md px-3 py-1.5 text-xs text-balance', className)} {...props}>
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
