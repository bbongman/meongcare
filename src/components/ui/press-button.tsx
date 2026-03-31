import { motion } from "framer-motion";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof motion.button>;

export function PressButton({ children, disabled, ...props }: Props) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.88 } : undefined}
      transition={{ duration: 0.08 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
