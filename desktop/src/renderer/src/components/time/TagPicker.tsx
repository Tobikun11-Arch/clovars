import type { Tag } from '../../types/work'
import { Checkbox } from '../ui'

interface TagPickerProps {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function TagPicker({
  tags,
  selectedIds,
  onChange,
  disabled = false
}: TagPickerProps): React.JSX.Element {
  if (tags.length === 0) {
    return <p className="field__hint">No tags yet. Create some under Work → Tags.</p>
  }

  function toggle(tagId: string): void {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  return (
    <div className="tag-picker">
      {tags.map((tag) => (
        <label key={tag.id} className="tag-option">
          <Checkbox
            checked={selectedIds.includes(tag.id)}
            disabled={disabled}
            onChange={() => toggle(tag.id)}
            label={
              <>
                {' '}
                <span className="chip__dot" style={{ backgroundColor: tag.color }} />{' '}
                {tag.name}{' '}
              </>
            }
          />
        </label>
      ))}
    </div>
  )
}
