type Base = {
  name: string
  label: string
  required?: boolean
  span?: 1 | 2
  disabled?: boolean
  help?: string
}

export type TextField = Base & {
  type: 'text' | 'email' | 'url'
  placeholder?: string
}

export type DateField = Base & {
  type: 'date'
  min?: string
  max?: string
}

export type NumberField = Base & {
  type: 'number'
  placeholder?: string
  min?: number
  max?: number
  decimals?: number
  mono?: boolean
}

export type PhoneField = Base & {
  type: 'phone'
}

export type TextareaField = Base & {
  type: 'textarea'
  placeholder?: string
  rows?: number
}

export type SelectOption = { label: string; value: any }

export type SelectField = Base & {
  type: 'select'
  placeholder?: string
  options: SelectOption[]
}

export type MultiselectField = Base & {
  type: 'multiselect'
  placeholder?: string
  options: SelectOption[]
}

export type ColorField = Base & {
  type: 'color'
}

export type ImageField = Base & {
  type: 'image'
  accept?: string
}

export type ReadonlyField = Base & {
  type: 'readonly'
}

export type FieldDef =
  | TextField
  | DateField
  | NumberField
  | PhoneField
  | TextareaField
  | SelectField
  | MultiselectField
  | ColorField
  | ImageField
  | ReadonlyField
