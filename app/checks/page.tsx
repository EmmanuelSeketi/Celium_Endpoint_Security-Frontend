import { AppShell } from '@/components/shell/app-shell'
import { ChecksPage } from '@/components/pages/checks'

export const metadata = { title: 'Compliance Checks — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <ChecksPage />
    </AppShell>
  )
}
