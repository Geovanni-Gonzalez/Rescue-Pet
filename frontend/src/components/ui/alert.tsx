import * as React from "react"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { roleClasses } from "../../design/status"

export type AlertVariant = "success" | "danger" | "info" | "caution"

const ICON: Record<AlertVariant, LucideIcon> = {
  success: CheckCircle,
  danger: XCircle,
  caution: AlertTriangle,
  info: Info,
}

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  /** Optional bold heading above the message. */
  title?: string
  /** Show the leading variant icon. Default true. */
  icon?: boolean
}

/**
 * Inline feedback banner. Colors come from the shared status roles
 * (`design/status.ts`), so it is dark-ready and contrast-checked.
 * `role` defaults to "alert" for danger (assertive) and "status" otherwise;
 * override via the `role` prop when needed.
 */
export function Alert({
  variant = "danger",
  title,
  icon = true,
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const Icon = ICON[variant]
  const resolvedRole = role ?? (variant === "danger" ? "alert" : "status")

  return (
    <div
      role={resolvedRole}
      className={cn(
        "flex items-start gap-2.5 rounded-md border p-3 text-sm shadow-sm",
        roleClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children != null && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  )
}
