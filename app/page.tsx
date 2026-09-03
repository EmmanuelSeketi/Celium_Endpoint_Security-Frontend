import { AppShell } from '@/components/shell/app-shell'
import { AuthGate } from '@/components/auth/auth-gate'
import { OverviewPage } from '@/components/pages/overview'

export default function HomePage() {
  return (
    <AuthGate>
      <AppShell>
        <OverviewPage />
      </AppShell>
    </AuthGate>
  )
}
