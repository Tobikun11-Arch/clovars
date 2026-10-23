interface CircularProgressProps {
  progress: number // 0 to 1
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
  reducedMotion?: boolean
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  children,
  reducedMotion = false
}: CircularProgressProps): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - progress * circumference

  return (
    <div
      className="circular-progress"
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
    >
      <svg width={size} height={size} className="circular-progress__svg">
        <circle
          className="circular-progress__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="circular-progress__bar"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: reducedMotion ? 'none' : 'stroke-dashoffset 0.3s ease'
          }}
        />
      </svg>
      <div className="circular-progress__content">{children}</div>
    </div>
  )
}
