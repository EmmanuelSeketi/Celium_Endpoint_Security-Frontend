import { AppShell } from '@/components/shell/app-shell'
import { SettingsPage } from '@/components/pages/settings'

export const metadata = { title: 'Settings — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  )
}
