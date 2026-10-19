import { AlignLeft, Calendar, CircleDot, Hash, ListCollapse, Mail, SquareCheck, Type, type LucideIcon } from 'lucide-react'
import type { FieldType } from './schema'

export const FIELD_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  email: Mail,
  number: Hash,
  date: Calendar,
  select: ListCollapse,
  radio: CircleDot,
  checkbox: SquareCheck,
}
