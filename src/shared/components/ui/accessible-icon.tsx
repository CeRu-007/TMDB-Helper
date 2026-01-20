"use client";

import * as React from "react";
import { VisuallyHidden } from "./visually-hidden";

interface AccessibleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
}

const AccessibleIcon = React.forwardRef<
  HTMLSpanElement,
  AccessibleIconProps
>(({ label, ...props }, forwardedRef) => (
  <span ref={forwardedRef} {...props}>
    <VisuallyHidden>{label}</VisuallyHidden>
    {props.children}
  </span>
));

AccessibleIcon.displayName = "AccessibleIcon";

export { AccessibleIcon }; 