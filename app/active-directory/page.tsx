import { AppShell } from '@/components/shell/app-shell'
import { ActiveDirectoryPage } from '@/components/pages/active-directory'

export const metadata = { title: 'Active Directory — Fleet Compliance' }

export default function Page() {
  return (
    <AppShell>
      <ActiveDirectoryPage />
    </AppShell>
  )
}
