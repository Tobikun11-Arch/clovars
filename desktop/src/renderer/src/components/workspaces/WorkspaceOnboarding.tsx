import { Button, EmptyState, Inline } from '../ui'
import { Icon, icons } from '../icons'

export function WorkspaceOnboarding({
  onCreate,
  onJoin
}: {
  onCreate: () => void
  onJoin: () => void
}): React.JSX.Element {
  return (
    <div className="onboarding">
      <EmptyState
        icon={<Icon d={icons.building} size={28} />}
        title="Create your first workspace"
        description="Clovars organises projects, clients and time entries by workspace. Create one to get started, or join a team with an invite code."
        action={
          <Inline gap={2} wrap>
            <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={onCreate}>
              New workspace
            </Button>
            <Button variant="secondary" onClick={onJoin}>
              Join with invite code
            </Button>
          </Inline>
        }
      />
    </div>
  )
}
