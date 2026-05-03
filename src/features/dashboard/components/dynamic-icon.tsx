"use client"

import React from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'

interface DynamicIconProps {
  name: string
  className?: string
  size?: number
  weight?: IconWeight
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  sprout: PhosphorIcons.Plant,
  star: PhosphorIcons.Star,
  award: PhosphorIcons.Medal,
  medal: PhosphorIcons.MedalMilitary,
  trophy: PhosphorIcons.Trophy,
  'check-circle': PhosphorIcons.CheckCircle,
  bot: PhosphorIcons.Robot,
  'calendar-check': PhosphorIcons.CalendarCheck,
  tv: PhosphorIcons.Television,
  tag: PhosphorIcons.Tag,
  layers: PhosphorIcons.Stack,
  clapperboard: PhosphorIcons.VideoCamera,
  flame: PhosphorIcons.Fire,
  calendar: PhosphorIcons.Calendar,
  pencil: PhosphorIcons.PencilSimple,
  zap: PhosphorIcons.Lightning,
  sparkles: PhosphorIcons.Sparkle,
  settings: PhosphorIcons.GearSix,
  mountain: PhosphorIcons.Mountains,
  film: PhosphorIcons.FilmStrip,
  palette: PhosphorIcons.Palette,
  sword: PhosphorIcons.Sword,
  baby: PhosphorIcons.Baby,
  'mic-2': PhosphorIcons.MicrophoneStage,
  timer: PhosphorIcons.Timer,
  target: PhosphorIcons.Crosshair,
  moon: PhosphorIcons.MoonStars,
  compass: PhosphorIcons.Compass,
  footprints: PhosphorIcons.Footprints,
  lock: PhosphorIcons.Lock,
}

export function DynamicIcon({ name, className, size = 16, weight = 'regular' }: DynamicIconProps) {
  const IconComponent = ICON_MAP[name]
  if (!IconComponent) {
    return <PhosphorIcons.Circle className={className} size={size} weight={weight} />
  }
  return <IconComponent className={className} size={size} weight={weight} />
}
