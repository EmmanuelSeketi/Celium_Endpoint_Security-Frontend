import { AppShell } from '@/components/shell/app-shell'
import { ReportsPage } from '@/components/pages/reports'

export const metadata = { title: 'Reports — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <ReportsPage />
    </AppShell>
  )
}
