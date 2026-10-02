import planData from './beginner_30day_plan.json'

const dayByKey = Object.fromEntries(planData.days.map((day) => [day.dayKey, day]))
const schedule = planData.plan.weeklySchedule
const muscleLabel = (value) => value.split(/[,/]/).map((part) => part.trim()).filter(Boolean).join(' · ').toUpperCase()
const videoAt = (seconds) => `${planData.plan.videoUrl}&t=${seconds}s`

export const warmup = {
  ...planData.warmup,
  videoUrl: planData.warmup.video.videoUrl,
  exercises: planData.warmup.exercises.map((exercise) => ({
    ...exercise,
    videoUrl: `${planData.warmup.video.videoUrl}&t=${exercise.startSeconds}s`,
  })),
}

export const workoutByWeekday = schedule.map((scheduled, index) => {
  const day = scheduled.dayKey ? dayByKey[scheduled.dayKey] : null
  return {
    day: scheduled.dayOfWeek.slice(0, 3).toUpperCase(),
    dayOfWeek: index,
    focus: day?.focus || 'Rest & reset',
    group: day?.focus.toUpperCase() || 'RECOVERY · RECHARGE',
    state: scheduled.isRestDay ? 'rest' : index === (new Date().getDay() + 6) % 7 ? 'today' : 'upcoming',
    isRestDay: Boolean(scheduled.isRestDay),
    exercises: (day?.exercises || []).map((exercise) => ({
      id: `${scheduled.dayKey}-${exercise.order}`,
      name: exercise.name,
      muscle: muscleLabel(exercise.muscleGroup),
      sets: exercise.sets,
      reps: exercise.repsMin === exercise.repsMax ? String(exercise.repsMin) : `${exercise.repsMin}–${exercise.repsMax}`,
      rest: 90,
      equipment: exercise.equipment,
      videoUrl: videoAt(exercise.startSeconds),
      instructions: exercise.cues.join(' '),
      videoStart: exercise.startSeconds,
      repsNote: exercise.repsNote,
    })),
  }
})

export const weekPlan = workoutByWeekday.map(({ day, focus, group, state }) => ({ day, focus, group, icon: '•', state }))
export const todayWorkout = workoutByWeekday[(new Date().getDay() + 6) % 7]
export const libraryExercises = [...new Map(workoutByWeekday.flatMap((day) => day.exercises).map((exercise) => [exercise.name, exercise])).values()]
