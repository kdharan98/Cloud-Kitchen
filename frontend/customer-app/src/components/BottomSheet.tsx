import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        aria-labelledby="sheet-title"
        aria-modal="true"
        className="bottom-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="sheet-heading">
          <h2 id="sheet-title">{title}</h2>
          <button aria-label="Close" className="icon-button" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export default BottomSheet
