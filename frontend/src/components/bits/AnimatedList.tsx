import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export default function AnimatedList<T>({
  items, keyExtractor, renderItem, className = ''
}: AnimatedListProps<T>) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.div
            key={keyExtractor(item)}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: .15 } }}
            transition={{ duration: 0.28, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderItem(item, i)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
