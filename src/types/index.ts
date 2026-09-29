export type IconType = 'emoji' | 'image' | 'initial' | 'preset'

export interface AccountIcon {
  type: IconType
  value: string
  bgColor: string
}

export interface Account {
  id: string
  name: string
  issuer: string
  icon: AccountIcon
  type: 'totp'
  secret: string
  algorithm: 'sha1' | 'sha256' | 'sha512'
  digits: 6 | 7 | 8
  period: number
  counter: number
  notes: string
  createdAt: number
  order: number
}

export interface AppSettings {
  biometricEnabled: boolean
  autoCopy: boolean
  lockTimeout: number
  passwordHint: string
  language: 'auto' | 'zh-CN' | 'en-US'
  theme: 'light' | 'dark' | 'auto'
  menuBarOnly: boolean
}