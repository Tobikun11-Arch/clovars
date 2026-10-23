export const WEEK_START_KEY = 'clovars.weekStart'
export const REDUCE_MOTION_KEY = 'clovars.reduceMotion'
export const MINI_TIMER_WIDGET_KEY = 'clovars.miniTimerWidget'
export const PREFERENCE_CHANGE_EVENT = 'clovars:preferences-changed'

export function notifyPreferencesChanged(): void {
  window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT))
}

export function isReduceMotionEnabled(): boolean {
  return localStorage.getItem(REDUCE_MOTION_KEY) === 'true'
}

export function isMiniTimerWidgetEnabled(): boolean {
  return localStorage.getItem(MINI_TIMER_WIDGET_KEY) !== 'false'
}

export function applyReduceMotionPreference(enabled: boolean): void {
  document.documentElement.dataset.reduceMotion = String(enabled)
}

export function syncMiniTimerPreference(): void {
  window.api?.setMiniTimerAutoShow(isMiniTimerWidgetEnabled())
}
